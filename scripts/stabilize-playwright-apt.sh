#!/usr/bin/env bash
set -euo pipefail

if ! command -v apt-get >/dev/null 2>&1; then
  exit 0
fi

for source_file in /etc/apt/apt-mirrors.txt /etc/apt/sources.list /etc/apt/sources.list.d/ubuntu.sources; do
  if [ -f "${source_file}" ]; then
    sudo sed -i 's#http://azure.archive.ubuntu.com/ubuntu#https://archive.ubuntu.com/ubuntu#g' "${source_file}"
  fi
done

shopt -s nullglob
for source_file in /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources; do
  if grep -q 'dl.google.com/linux/chrome' "${source_file}"; then
    sudo mv "${source_file}" "${source_file}.disabled"
  fi
done

printf '%s\n' \
  'Acquire::Retries "3";' \
  'Acquire::http::Timeout "20";' \
  'Acquire::https::Timeout "20";' \
  | sudo tee /etc/apt/apt.conf.d/99mercasto-ci-network >/dev/null
