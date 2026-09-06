#!/bin/sh
set -eu

/usr/local/bin/mercasto-refresh-runtime-env
exec docker-php-entrypoint "$@"
