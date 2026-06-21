#!/usr/bin/env bash
# start_mcp_vps.sh - Start MCP SSE bridge and Pinggy tunnel in background on VPS

set -e

echo "Stopping any existing MCP bridge or Pinggy tunnel on VPS..."
pkill -f "scripts/mcp-sse-bridge.cjs" || true
pkill -f "a.pinggy.io" || true
sleep 1

echo "Starting MCP SSE bridge on port 8001..."
# Run the bridge from the /var/www/mercasto directory so the CWD is correct
cd /var/www/mercasto
nohup node scripts/mcp-sse-bridge.cjs > /tmp/vps-mcp-bridge.log 2>&1 &
sleep 2

# Verify it started
if lsof -i :8001 >/dev/null || netstat -tuln | grep :8001 >/dev/null; then
  echo "✅ MCP SSE Bridge is running on port 8001."
else
  echo "❌ Failed to start MCP SSE Bridge on port 8001. Logs:"
  cat /tmp/vps-mcp-bridge.log
  exit 1
fi

echo "Starting Pinggy tunnel in background..."
nohup ssh -p 443 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 80:localhost:8001 a.pinggy.io > /tmp/vps-pinggy.log 2>&1 &

# Wait for Pinggy to print the URL
sleep 6

echo "--- Pinggy Log output ---"
cat /tmp/vps-pinggy.log
echo "-------------------------"
