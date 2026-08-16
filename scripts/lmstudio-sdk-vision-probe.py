#!/usr/bin/env python3
import argparse
import json
import re
import sys
import time

import lmstudio as lms

SYSTEM_PROMPT = (
    "Eres el moderador privado de imágenes públicas de Mercasto. "
    "Responde exclusivamente JSON válido, sin markdown."
)

USER_PROMPT = """Analiza la imagen que se quiere publicar en una superficie pública de Mercasto.
Contexto: benchmark sintético sin datos de usuario.

Devuelve exclusivamente JSON válido:
{\"decision\":\"approved|manual_review|rejected\",\"reason\":\"motivo breve en español\",\"confidence\":0.0,\"flags\":[\"...\"]}

Reglas:
- Rechaza desnudez o contenido sexual explícito, explotación, violencia gráfica, armas, drogas ilegales, odio, amenazas, fraude evidente o instrucciones delictivas.
- Rechaza identificaciones, pasaportes, tarjetas bancarias, comprobantes u otros documentos con datos personales sensibles usados como imagen pública.
- Rechaza imágenes claramente diseñadas para suplantar a otra persona o empresa, phishing o engaño.
- Logotipos comerciales normales, retratos apropiados, productos y fotografías de negocio permitidas pueden aprobarse.
- Si existe duda material, usa manual_review. No inventes hechos.
- approved solo con alta confianza."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", required=True, help="LM Studio API host:port")
    parser.add_argument("--model", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--threads", type=int, default=2)
    parser.add_argument("--max-tokens", type=int, default=220)
    parser.add_argument("--timeout", type=float, default=60.0)
    return parser.parse_args()


def parse_moderation_json(content: str) -> dict:
    clean = content.strip()
    clean = re.sub(r"^```(?:json)?\s*", "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\s*```$", "", clean)
    try:
        result = json.loads(clean)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", clean, flags=re.DOTALL)
        if not match:
            raise
        result = json.loads(match.group(0))

    if result.get("decision") not in {"approved", "manual_review", "rejected"}:
        raise ValueError("invalid moderation decision")
    if not isinstance(result.get("confidence"), (int, float)):
        raise ValueError("moderation confidence must be numeric")
    return result


def optional_stat(stats, name):
    value = getattr(stats, name, None)
    if value is None:
        return None
    if isinstance(value, float):
        return round(value, 4)
    return value


def main() -> int:
    args = parse_args()
    lms.configure_default_client(args.host)
    lms.set_sync_api_timeout(args.timeout)

    if not lms.Client.is_valid_api_host(args.host):
        raise RuntimeError(f"LM Studio API host is unavailable: {args.host}")

    model = lms.llm(args.model)
    image = lms.prepare_image(args.image)
    chat = lms.Chat(SYSTEM_PROMPT)
    chat.add_user_message(USER_PROMPT, images=[image])

    config = {
        "temperature": 0.1,
        "maxTokens": args.max_tokens,
        "cpuThreads": args.threads,
    }

    print(
        "sdk_probe_config="
        + json.dumps(
            {
                "host": args.host,
                "model": args.model,
                "cpu_threads": args.threads,
                "max_tokens": args.max_tokens,
                "timeout_seconds": args.timeout,
            },
            sort_keys=True,
        ),
        flush=True,
    )

    for label in ("vision_first", "vision_warm"):
        started = time.perf_counter()
        result = model.respond(chat, config=config)
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        moderation = parse_moderation_json(result.content)
        stats = result.stats
        summary = {
            "label": label,
            "elapsed_ms": elapsed_ms,
            "decision": moderation["decision"],
            "confidence": moderation["confidence"],
            "cpu_threads": args.threads,
            "predicted_tokens": optional_stat(stats, "predicted_tokens_count"),
            "time_to_first_token_sec": optional_stat(stats, "time_to_first_token_sec"),
            "tokens_per_second": optional_stat(stats, "tokens_per_second"),
            "stop_reason": str(getattr(stats, "stop_reason", "")),
        }
        print("sdk_probe_result=" + json.dumps(summary, sort_keys=True), flush=True)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"sdk_probe_error={type(exc).__name__}: {exc}", file=sys.stderr, flush=True)
        raise
