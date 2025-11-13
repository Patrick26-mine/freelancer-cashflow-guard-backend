#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  cat <<EOF
Usage: $0 {start|stop|status} {main|mock}

Commands:
  start main   Start main server (PORT from env or default 5001)
  start mock   Start mock server (PORT=5002, USE_MOCK_DB=true)
  stop main    Stop process listening on port 5001
  stop mock    Stop process listening on port 5002
  status       Show listening PIDs for 5001 and 5002

This script is for local development on macOS/Linux.
EOF
}

get_pid_by_port() {
  local port="$1"
  # lsof approach (works on macOS/Linux)
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN -t 2>/dev/null || true
  else
    # fallback: ss
    ss -ltnp 2>/dev/null | awk -v p=":${port}" '$4 ~ p {print $6}' | sed 's/.*,\([0-9]*\)\/.*$/\1/' | head -n1 || true
  fi
}

start_main() {
  echo "Starting main server (nodeserver.js)..."
  nohup node "$ROOT_DIR/nodeserver.js" >/dev/null 2>&1 &
  echo "Started main server with PID $!"
}

start_mock() {
  echo "Starting mock server on port 5002 (USE_MOCK_DB=true)..."
  # Use env vars for the single command
  (cd "$ROOT_DIR" && nohup env USE_MOCK_DB=true PORT=5002 node nodeserver.js >/dev/null 2>&1 &) 
  echo "Started mock server"
}

stop_by_port() {
  local port="$1"
  local pid
  pid=$(get_pid_by_port "$port" | head -n1 || true)
  if [ -z "$pid" ]; then
    echo "No process listening on port $port"
    return 0
  fi
  echo "Stopping PID $pid on port $port..."
  kill "$pid" || true
}

status() {
  echo "Port 5001 PID: $(get_pid_by_port 5001 || true)"
  echo "Port 5002 PID: $(get_pid_by_port 5002 || true)"
}

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

cmd="$1"
target="${2:-}"

case "$cmd" in
  start)
    if [ -z "$target" ]; then usage; exit 1; fi
    if [ "$target" = "main" ]; then start_main; elif [ "$target" = "mock" ]; then start_mock; else usage; fi
    ;;
  stop)
    if [ -z "$target" ]; then usage; exit 1; fi
    if [ "$target" = "main" ]; then stop_by_port 5001; elif [ "$target" = "mock" ]; then stop_by_port 5002; else usage; fi
    ;;
  status)
    status
    ;;
  *)
    usage
    exit 1
    ;;
esac
