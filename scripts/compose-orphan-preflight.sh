#!/usr/bin/env bash
set -euo pipefail

compose=(docker compose "$@")
config_json="$(${compose[@]} config --format json)"
project_name="$(printf '%s' "$config_json" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("name", ""))')"
if [[ -z "$project_name" ]]; then
  echo "FAIL: unable to determine Compose project name" >&2
  exit 1
fi

mapfile -t expected_services < <(printf '%s' "$config_json" | python3 -c 'import json,sys; print("\n".join(json.load(sys.stdin).get("services", {}).keys()))')
if [[ "${#expected_services[@]}" -eq 0 ]]; then
  echo "FAIL: Compose config has no services" >&2
  exit 1
fi

declare -A expected=()
for service in "${expected_services[@]}"; do
  expected["$service"]=1
done

unexpected=0
while IFS= read -r container; do
  [[ -n "$container" ]] || continue
  service="$(docker inspect --format '{{ index .Config.Labels "com.docker.compose.service" }}' "$container" 2>/dev/null || true)"
  if [[ -z "$service" || -z "${expected[$service]:-}" ]]; then
    echo "FAIL: unexpected container in Compose project '$project_name': $container (service='${service:-<missing>}')" >&2
    unexpected=1
  fi
done < <(docker ps -a --filter "label=com.docker.compose.project=$project_name" --format '{{.Names}}')

if [[ "$unexpected" -ne 0 ]]; then
  echo "Refusing to run docker compose up --remove-orphans. Resolve project-label collision explicitly." >&2
  exit 1
fi

echo "compose orphan preflight OK: project=$project_name services=${#expected_services[@]}"
