#!/bin/sh
set -eu

/usr/local/bin/mercasto-refresh-runtime-env

LOG_DIR="${MERCASTO_LOG_DIR:-/var/www/storage/logs}"
mkdir -p "$LOG_DIR"
chgrp -R www-data "$LOG_DIR"
chmod 2770 "$LOG_DIR"
find "$LOG_DIR" -maxdepth 1 -type f -name '*.log' -exec chmod 0660 {} +

exec docker-php-entrypoint "$@"
