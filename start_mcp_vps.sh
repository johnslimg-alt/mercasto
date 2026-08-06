#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
Public Shell MCP on the Mercasto VPS is retired and must remain disabled.

Do not expose bash-mcp, a write-capable SSE bridge, Pinggy, Tunnelmole, or
another unauthenticated shell tunnel from production. Use the bounded,
non-root SSH MCP pattern documented in docs/mcp-agents.md instead.
EOF

exit 1
