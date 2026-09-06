#!/bin/sh
set -eu

SOURCE_ENV="${MERCASTO_PERSISTENT_ENV_FILE:-/var/www/.env}"
RUNTIME_DIR="${MERCASTO_RUNTIME_ENV_DIR:-/run/mercasto}"
RUNTIME_ENV="$RUNTIME_DIR/.env"

if [ ! -r "$SOURCE_ENV" ]; then
  echo "Persistent Laravel env is not readable by container root: $SOURCE_ENV" >&2
  exit 1
fi

mkdir -p "$RUNTIME_DIR"
chown root:www-data "$RUNTIME_DIR"
chmod 0750 "$RUNTIME_DIR"

tmp_env="$RUNTIME_DIR/.env.tmp.$$"
trap 'rm -f "$tmp_env"' EXIT HUP INT TERM
umask 077
cat "$SOURCE_ENV" > "$tmp_env"
chown root:www-data "$tmp_env"
chmod 0640 "$tmp_env"
mv -f "$tmp_env" "$RUNTIME_ENV"
trap - EXIT HUP INT TERM
