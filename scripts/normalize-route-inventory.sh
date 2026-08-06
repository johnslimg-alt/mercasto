#!/usr/bin/env bash
set -euo pipefail

# Laravel assigns random generated::<token> names to unnamed routes when the
# production route cache is built. They are not part of the route contract and
# would make every generated inventory look different.
sed -E 's/generated::[[:alnum:]_]+/generated::<auto>/g'
