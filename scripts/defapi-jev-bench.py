#!/usr/bin/env python3
import concurrent.futures
import json
import math
import os
import statistics
import time
import urllib.error
import urllib.request
from collections import Counter

URL = "https://api.defapi.org/api/v1/decisions"
MODEL = "typesafe/jev-1.13"
KEY = os.environ.get("DEFAPI_KEY", "").strip()
TIMEOUT = 30

if not KEY:
    print("DEFAPI_BENCH_ERROR missing DEFAPI_KEY")
    raise SystemExit(2)

COMMON_QUESTIONS = {
    "intent": {
        "type": "choice",
        "instructions": "Classify the customer's current intent in this message.",
        "criteria": {
            "buying": "Actively trying to buy, asking price or availability for a concrete product/vehicle, or clearly states desire to purchase",
            "browsing": "Exploring products, colors, materials, catalog, or general information without a concrete buying action yet",
            "support": "Post-purchase issue, complaint, return, cancellation, invoice, delivery problem, or help with an existing order",
            "other": "Greeting, unrelated message, spam, or none of the other categories"
        }
    },
    "needs_price": {
        "type": "noul",
        "instructions": "Is the customer explicitly asking for the price or cost right now?",
        "criteria": {
            "true": "The message explicitly asks how much it costs, the price, costo, precio, presio, cuánto sale, or equivalent",
            "false": "The message does not explicitly ask for price or cost"
        }
    },
    "readiness": {
        "type": "score",
        "instructions": "Rate purchase readiness for the current message.",
        "criteria": [
            "Low: no purchase signal or a post-purchase/support message",
            "Medium: product exploration without a concrete request to buy",
            "High: concrete buying intent, specific fitment/variant, price request, or availability request"
        ]
    }
}

QUALITY_CASES = [
    ("es_buy_price", "Hola, quiero fundas negras para Nissan Versa 2020. Cuanto cuestan?", "buying", True),
    ("es_browse_colors", "Qué colores tienen para las fundas?", "browsing", False),
    ("es_support_damage", "Me llegaron las fundas rotas, quiero cambio.", "support", False),
    ("greeting_only", "Hola", "other", False),
    ("ru_buy_price", "Нужны чехлы на Toyota Corolla 2021, сколько стоят?", "buying", True),
    ("ru_browse_material", "Какие материалы у вас есть?", "browsing", False),
    ("en_support_return", "My seat covers arrived damaged. How can I return them?", "support", False),
    ("en_buy_availability", "Do you have black covers for a 2022 Kia Rio?", "buying", False),
    ("es_typo_price", "presio fundas versa 2020 negro?", "buying", True),
    ("es_buy_now", "Quiero comprar hoy. Tengo un Mazda 3 2019 y los quiero beige.", "buying", False),
    ("es_browse_explicit", "Solo estoy viendo opciones, todavía no voy a comprar.", "browsing", False),
    ("es_support_invoice", "Necesito factura de mi pedido que ya recibí.", "support", False),
    ("es_unrelated_spam", "vendo criptomonedas, escríbeme", "other", False),
    ("es_browse_catalog", "catalogo de fundas por favor", "browsing", False),
    ("es_buy_stock", "Hay disponibles para Jetta 2018? Sí, me interesan.", "buying", False),
    ("es_price_short", "Cuánto salen?", "buying", True),
    ("es_support_cancel", "Quiero cancelar mi pedido.", "support", False),
]

def percentile(values, p):
    if not values:
        return None
    xs = sorted(values)
    if len(xs) == 1:
        return xs[0]
    k = (len(xs) - 1) * (p / 100.0)
    f, c = math.floor(k), math.ceil(k)
    if f == c:
        return xs[int(k)]
    return xs[f] * (c - k) + xs[c] * (k - f)

def api_call(state, questions, timeout=TIMEOUT):
    payload = {"model": MODEL, "state": state, "questions": questions}
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        URL, data=body, method="POST",
        headers={
            "Authorization": "Bearer " + KEY,
            "Content-Type": "application/json",
            "User-Agent": "mercasto-defapi-jev-bench/1.0",
        },
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", "replace")
            latency = (time.perf_counter() - started) * 1000.0
            try:
                data = json.loads(raw)
            except Exception:
                data = {"_raw": raw[:1000]}
            return {"status": int(resp.status), "latency_ms": latency, "data": data,
                    "retry_after": resp.headers.get("Retry-After")}
    except urllib.error.HTTPError as exc:
        latency = (time.perf_counter() - started) * 1000.0
        raw = exc.read().decode("utf-8", "replace")
        try:
            data = json.loads(raw)
        except Exception:
            data = {"_raw": raw[:1000]}
        return {"status": int(exc.code), "latency_ms": latency, "data": data,
                "retry_after": exc.headers.get("Retry-After") if exc.headers else None}
    except Exception as exc:
        return {"status": 0, "latency_ms": (time.perf_counter() - started) * 1000.0,
                "data": {"error": type(exc).__name__ + ": " + str(exc)}, "retry_after": None}

def billed_cost(result):
    data = result.get("data") or {}
    for value in (
        data.get("consumed"),
        (data.get("usage") or {}).get("cost") if isinstance(data, dict) else None,
    ):
        try:
            if value is not None:
                return float(value)
        except Exception:
            pass
    return 0.0

def safe_error(result):
    data = result.get("data") or {}
    if isinstance(data, dict):
        out = {k: data.get(k) for k in ("code", "message", "detail", "error") if data.get(k) is not None}
        if out:
            return out
        if "_raw" in data:
            return {"raw": str(data["_raw"])[:300]}
    return {"response": str(data)[:300]}

print("DEFAPI_JEV_BENCH_BEGIN")
print("endpoint=" + URL)
print("model=" + MODEL)
print("quality_cases=" + str(len(QUALITY_CASES)))

smoke = api_call(
    "Customer wants black seat covers for a Nissan Versa 2020 and asks the price.",
    {"intent": COMMON_QUESTIONS["intent"], "needs_price": COMMON_QUESTIONS["needs_price"]},
)
print("smoke=" + json.dumps({
    "status": smoke["status"],
    "latency_ms": round(smoke["latency_ms"], 1),
    "cost": billed_cost(smoke),
    "retry_after": smoke.get("retry_after"),
}, sort_keys=True))
if smoke["status"] != 200:
    print("smoke_error=" + json.dumps(safe_error(smoke), ensure_ascii=False, sort_keys=True))
    print("DEFAPI_JEV_BENCH_ABORTED_BEFORE_LOAD")
    raise SystemExit(3)

smoke_data = smoke["data"]
print("smoke_provider=" + str(smoke_data.get("provider")))
print("smoke_model=" + str(smoke_data.get("model")))
print("smoke_usage=" + json.dumps(smoke_data.get("usage") or {}, sort_keys=True))

quality_cost = billed_cost(smoke)
quality_latencies = []
intent_ok = 0
price_ok = 0
schema_ok = 0
confidences = []

for name, message, expected_intent, expected_price in QUALITY_CASES:
    r = api_call(message, COMMON_QUESTIONS)
    quality_cost += billed_cost(r)
    quality_latencies.append(r["latency_ms"])
    row = {"case": name, "http": r["status"], "ms": round(r["latency_ms"], 1),
           "expected_intent": expected_intent, "expected_price": expected_price}
    if r["status"] == 200:
        answers = (r["data"] or {}).get("answers") or {}
        intent = answers.get("intent") or {}
        price = answers.get("needs_price") or {}
        readiness = answers.get("readiness") or {}
        pred_intent = intent.get("choice")
        price_prob = price.get("noul")
        conf = intent.get("confidence")
        row.update({
            "intent": pred_intent, "intent_confidence": conf, "price_prob": price_prob,
            "readiness_score": readiness.get("score"), "cost": billed_cost(r),
        })
        iok = pred_intent == expected_intent
        pok = isinstance(price_prob, (int, float)) and ((price_prob >= 0.5) == expected_price)
        row["intent_ok"] = iok
        row["price_ok"] = pok
        intent_ok += int(iok)
        price_ok += int(pok)
        schema_fields_ok = (
            intent.get("type") == "choice" and isinstance(intent.get("probabilities"), dict)
            and price.get("type") == "noul" and isinstance(price_prob, (int, float))
            and readiness.get("type") == "score" and isinstance(readiness.get("probabilities"), dict)
            and isinstance(readiness.get("score"), (int, float))
        )
        row["schema_ok"] = schema_fields_ok
        schema_ok += int(schema_fields_ok)
        if isinstance(conf, (int, float)):
            confidences.append(float(conf))
    else:
        row["error"] = safe_error(r)
    print("quality=" + json.dumps(row, ensure_ascii=False, sort_keys=True))

q_n = len(QUALITY_CASES)
quality_summary = {
    "cases": q_n,
    "intent_accuracy": round(intent_ok / q_n, 4),
    "price_accuracy": round(price_ok / q_n, 4),
    "schema_rate": round(schema_ok / q_n, 4),
    "avg_intent_confidence": round(statistics.mean(confidences), 4) if confidences else None,
    "latency_p50_ms": round(percentile(quality_latencies, 50), 1),
    "latency_p95_ms": round(percentile(quality_latencies, 95), 1),
    "cost_usd": round(quality_cost, 9),
}
print("QUALITY_SUMMARY=" + json.dumps(quality_summary, sort_keys=True))

LOAD_QUESTION = {
    "route": {
        "type": "choice",
        "instructions": "Classify the customer's current intent.",
        "criteria": {
            "buying": "Concrete request to buy or price/availability question",
            "browsing": "General exploration",
            "support": "Existing order or post-purchase support",
            "other": "None of the above"
        }
    }
}
LOAD_STATE = "Customer: Hola, quiero fundas negras para Nissan Versa 2020. Cuanto cuestan?"
stages = [(1, 10), (5, 20), (10, 30), (25, 50), (50, 100)]
load_total_cost = 0.0
load_total_requests = load_total_success = load_total_429 = 0
load_summaries = []

for concurrency, count in stages:
    stage_started = time.perf_counter()
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
        futures = [pool.submit(api_call, LOAD_STATE, LOAD_QUESTION) for _ in range(count)]
        for fut in concurrent.futures.as_completed(futures):
            results.append(fut.result())
    wall = time.perf_counter() - stage_started
    statuses = Counter(r["status"] for r in results)
    latencies = [r["latency_ms"] for r in results]
    success = statuses.get(200, 0)
    too_many = statuses.get(429, 0)
    cost = sum(billed_cost(r) for r in results)
    load_total_cost += cost
    load_total_requests += len(results)
    load_total_success += success
    load_total_429 += too_many
    stage = {
        "concurrency": concurrency, "requests": len(results), "success": success,
        "http_429": too_many, "other_errors": len(results) - success - too_many,
        "statuses": dict(sorted(statuses.items())), "wall_s": round(wall, 3),
        "throughput_rps": round((len(results) / wall) if wall > 0 else 0.0, 2),
        "latency_p50_ms": round(percentile(latencies, 50), 1),
        "latency_p95_ms": round(percentile(latencies, 95), 1),
        "latency_p99_ms": round(percentile(latencies, 99), 1),
        "cost_usd": round(cost, 9),
        "retry_after_values": sorted({str(r.get("retry_after")) for r in results if r.get("retry_after")}),
    }
    load_summaries.append(stage)
    print("LOAD_STAGE=" + json.dumps(stage, sort_keys=True))
    error_rate = (len(results) - success) / len(results) if results else 1.0
    if too_many > 0 or error_rate > 0.05:
        print("LOAD_STOP_REASON=" + ("http_429" if too_many > 0 else "error_rate_gt_5pct"))
        break

final = {
    "quality": quality_summary,
    "load": {
        "stages_completed": len(load_summaries),
        "max_concurrency_tested": load_summaries[-1]["concurrency"] if load_summaries else 0,
        "requests": load_total_requests, "success": load_total_success,
        "http_429": load_total_429, "cost_usd": round(load_total_cost, 9),
    },
    "total_cost_usd": round(quality_cost + load_total_cost, 9),
}
print("DEFAPI_JEV_BENCH_RESULT=" + json.dumps(final, sort_keys=True))
print("DEFAPI_JEV_BENCH_END")
