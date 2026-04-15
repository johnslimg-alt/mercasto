#!/bin/bash

# =================================================================
# Mercasto Uptime Monitor via Telegram
# =================================================================

URL="https://mercasto.com"
BOT_TOKEN="AQUI_TU_TELEGRAM_BOT_TOKEN"
CHAT_ID="AQUI_TU_CHAT_ID"

# Hacemos una petición cURL silenciosa y obtenemos solo el código HTTP
STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" -L -m 10 $URL)

# Archivo para rastrear el estado y no enviar spam cada minuto si ya está caído
STATE_FILE="/tmp/mercasto_status.txt"

if [ "$STATUS" -ne 200 ]; then
    if [ ! -f "$STATE_FILE" ]; then
        MESSAGE="🚨 <b>¡ALERTA DE CAÍDA!</b> 🚨%0A%0AEl sitio <b>$URL</b> no responde.%0ACódigo HTTP: $STATUS%0AHora: $(date '+%Y-%m-%d %H:%M:%S')"
        curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" -d chat_id=$CHAT_ID -d text="$MESSAGE" -d parse_mode="HTML" > /dev/null
        touch "$STATE_FILE"
    fi
else
    if [ -f "$STATE_FILE" ]; then
        MESSAGE="✅ <b>¡SITIO RECUPERADO!</b> ✅%0A%0AEl sitio <b>$URL</b> vuelve a funcionar correctamente.%0ACódigo HTTP: $STATUS%0AHora: $(date '+%Y-%m-%d %H:%M:%S')"
        curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" -d chat_id=$CHAT_ID -d text="$MESSAGE" -d parse_mode="HTML" > /dev/null
        rm "$STATE_FILE"
    fi
fi