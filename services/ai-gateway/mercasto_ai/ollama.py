from __future__ import annotations

import json
import re
from typing import Any

import httpx

from .contracts import ModelVerdict

_POLICY_PROMPT = """Analiza la imagen que se quiere publicar en una superficie pública de Mercasto.
Contexto: {context}.

Devuelve exclusivamente JSON válido:
{{"decision":"approved|manual_review|rejected","reason":"motivo breve en español","confidence":0.0,"flags":["..."]}}

Reglas:
- Rechaza desnudez o contenido sexual explícito, explotación, violencia gráfica, armas, drogas ilegales, odio, amenazas, fraude evidente o instrucciones delictivas.
- Rechaza identificaciones, pasaportes, tarjetas bancarias, comprobantes u otros documentos con datos personales sensibles usados como imagen pública.
- Rechaza imágenes claramente diseñadas para suplantar a otra persona o empresa, phishing o engaño.
- Logotipos comerciales normales, retratos apropiados, productos y fotografías de negocio permitidas pueden aprobarse.
- Si existe duda material, usa manual_review. No inventes hechos.
- approved solo con alta confianza.
"""

_LISTING_PROMPT = """Analiza este anuncio clasificado de Mercasto usando solo el vocabulario de señales de política suministrado por Laravel.

Título:
<title>{title}</title>

Descripción:
<description>{description}</description>

Señales canónicas disponibles para esta inferencia y permitidas para `flags`:
{policy_signals}

Devuelve exclusivamente JSON válido:
{{"decision":"approved|manual_review|rejected","reason":"motivo breve en español","confidence":0.0,"flags":["..."]}}

Reglas de contrato:
- `flags` solo puede contener valores exactos de la lista de señales canónicas suministrada arriba; no inventes categorías nuevas.
- Evalúa conjuntamente el texto y únicamente las imágenes adjuntas a esta inferencia.
- Si una señal material requiere juicio humano o existe duda, usa manual_review.
- approved solo con alta confianza; rejected solo con evidencia clara.
- No infieras hechos no visibles o no escritos en el anuncio.
"""

_LISTING_NUM_CTX = 8192


class OllamaUnavailable(RuntimeError):
    pass


class OllamaModerationClient:
    def __init__(
        self,
        base_url: str = "http://ollama:11434",
        model: str = "qwen3-vl:4b-instruct",
        timeout_seconds: float = 90.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout_seconds = timeout_seconds

    @property
    def model(self) -> str:
        return self._model

    async def moderate(self, context: str, image_base64: str) -> ModelVerdict:
        payload = {
            "model": self._model,
            "stream": False,
            "keep_alive": "24h",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Eres el moderador privado de imágenes públicas de Mercasto. "
                        "Responde exclusivamente JSON válido, sin markdown."
                    ),
                },
                {
                    "role": "user",
                    "content": _POLICY_PROMPT.format(context=context),
                    "images": [image_base64],
                },
            ],
            "options": {
                "temperature": 0.1,
                "num_predict": 220,
                "num_ctx": 3072,
            },
        }
        return await self._post_and_parse(payload)

    async def moderate_listing(
        self,
        title: str,
        description: str,
        images_base64: list[str],
        policy_signals: list[str],
    ) -> ModelVerdict:
        prompt = _LISTING_PROMPT.format(
            title=title.strip(),
            description=description.strip(),
            policy_signals=", ".join(policy_signals),
        )
        user_message: dict[str, Any] = {"role": "user", "content": prompt}
        if images_base64:
            user_message["images"] = images_base64

        payload = {
            "model": self._model,
            "stream": False,
            "keep_alive": "24h",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Eres el moderador privado assist-only de anuncios de Mercasto. "
                        "Laravel y la revisión humana siguen siendo autoritativos. "
                        "Responde exclusivamente JSON válido, sin markdown."
                    ),
                },
                user_message,
            ],
            "options": {
                "temperature": 0.1,
                "num_predict": 320,
                "num_ctx": _LISTING_NUM_CTX,
            },
        }
        return await self._post_and_parse(payload)

    async def _post_and_parse(self, payload: dict[str, Any]) -> ModelVerdict:
        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(f"{self._base_url}/api/chat", json=payload)
                response.raise_for_status()
                body: dict[str, Any] = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise OllamaUnavailable("Local Ollama request failed") from exc

        return self._parse_verdict(body)

    def _parse_verdict(self, body: dict[str, Any]) -> ModelVerdict:
        raw = str(body.get("message", {}).get("content", "")).strip()
        raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as outer_exc:
            match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
            if match is None:
                raise OllamaUnavailable(
                    "Local Ollama returned invalid moderation JSON"
                ) from outer_exc
            try:
                parsed = json.loads(match.group(0))
            except json.JSONDecodeError as nested_exc:
                raise OllamaUnavailable(
                    "Local Ollama returned invalid moderation JSON"
                ) from nested_exc

        try:
            return ModelVerdict.model_validate(parsed)
        except ValueError as exc:
            raise OllamaUnavailable("Local Ollama returned an invalid moderation verdict") from exc
