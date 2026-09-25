#!/bin/sh
set -eu

/usr/local/bin/mercasto-refresh-runtime-env

# All Laravel runtime containers bind-mount the same host storage tree. Workers and
# schedulers run Artisan as root, while PHP-FPM serves requests as www-data. Keep the
# log directory setgid and group-writable so a root-created daily rotation remains
# writable by PHP-FPM after UTC midnight.
LOG_DIR="${MERCASTO_RUNTIME_LOG_DIR:-/var/www/storage/logs}"
mkdir -p "$LOG_DIR"
chown root:www-data "$LOG_DIR"
chmod 2770 "$LOG_DIR"
find "$LOG_DIR" -maxdepth 1 -type f -name '*.log' -exec chgrp www-data {} \; -exec chmod 0660 {} \;

exec docker-php-entrypoint "$@"
