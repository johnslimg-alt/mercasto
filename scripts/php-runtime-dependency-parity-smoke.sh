#!/usr/bin/env bash
set -euo pipefail

DOCKER_BIN="${DOCKER_BIN:-docker}"
RUNTIME_CONTAINERS=(
  mercasto_backend_container
  mercasto_worker_container
  mercasto_scheduler_container
  mercasto_reverb_container
)

expected_laravel=""
expected_fingerprint=""

for container in "${RUNTIME_CONTAINERS[@]}"; do
  state="$($DOCKER_BIN inspect --format '{{.State.Status}}' "$container" 2>/dev/null || true)"
  if [[ "$state" != "running" ]]; then
    echo "PHP_RUNTIME_PARITY=FAIL container=${container} state=${state:-missing}" >&2
    exit 1
  fi

  runtime="$($DOCKER_BIN exec "$container" php -r '
    $path = "/var/www/vendor/composer/installed.json";
    if (!is_file($path)) { fwrite(STDERR, "missing installed.json\n"); exit(2); }
    $decoded = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    $packages = $decoded["packages"] ?? $decoded;
    $items = [];
    $laravel = "";
    foreach ($packages as $package) {
      $name = (string)($package["name"] ?? "");
      $version = (string)($package["version"] ?? "");
      if ($name === "") { continue; }
      $items[] = $name . "@" . $version;
      if ($name === "laravel/framework") { $laravel = $version; }
    }
    if ($laravel === "") { fwrite(STDERR, "missing laravel/framework\n"); exit(3); }
    sort($items, SORT_STRING);
    echo $laravel . "\t" . hash("sha256", implode("\n", $items));
  ' 2>/dev/null)" || {
    echo "PHP_RUNTIME_PARITY=FAIL container=${container} reason=vendor-read" >&2
    exit 1
  }

  IFS=$'\t' read -r laravel fingerprint <<<"$runtime"
  if [[ -z "$expected_laravel" ]]; then
    expected_laravel="$laravel"
    expected_fingerprint="$fingerprint"
  elif [[ "$laravel" != "$expected_laravel" || "$fingerprint" != "$expected_fingerprint" ]]; then
    echo "PHP_RUNTIME_PARITY=FAIL container=${container} laravel=${laravel} expected_laravel=${expected_laravel}" >&2
    exit 1
  fi

  echo "PHP_RUNTIME_PARITY_MEMBER container=${container} laravel=${laravel} vendor_sha256=${fingerprint}"
done

echo "PHP_RUNTIME_PARITY=PASS laravel=${expected_laravel} vendor_sha256=${expected_fingerprint} runtimes=${#RUNTIME_CONTAINERS[@]}"
