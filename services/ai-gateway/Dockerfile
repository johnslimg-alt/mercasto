FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN useradd --create-home --uid 10001 mercasto

COPY pyproject.toml ./
COPY mercasto_ai ./mercasto_ai

RUN pip install --no-cache-dir .

USER mercasto

EXPOSE 8080

# Allow transient host CPU pressure without autohealing an otherwise healthy service.
HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=10)" || exit 1

CMD ["uvicorn", "mercasto_ai.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
