#!/usr/bin/env bash

set -euo pipefail

ADMIN_DIR="/var/clothing/admin"
SERVER_DIR="/var/clothing/server"
SERVICE_NAME="clothing-management-server"
BUN_BIN="/usr/local/bin/bun"
SERVER_HEALTH_URL="http://127.0.0.1:3000/health"

if [ -d "/usr/local/node20-bin" ]; then
  export PATH="/usr/local/node20-bin:${PATH}"
fi

if command -v npm >/dev/null 2>&1; then
  NPM_BIN="$(command -v npm)"
elif command -v npm-20 >/dev/null 2>&1; then
  NPM_BIN="$(command -v npm-20)"
else
  NPM_BIN="npm"
fi

restart_backend() {
  local old_pid=""
  old_pid="$(pgrep -f '^/home/clothing/.bun/bin/bun src/index.ts$' | head -n 1 || true)"

  if [ -n "${old_pid}" ]; then
    echo "==> Restarting backend process ${old_pid}"
    kill "${old_pid}"
  fi

  for _ in $(seq 1 20); do
    if curl -fsS "${SERVER_HEALTH_URL}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Backend health check failed after restart" >&2
  return 1
}

echo "==> Updating frontend"
cd "$ADMIN_DIR"
git pull --ff-only
"${NPM_BIN}" install
"${NPM_BIN}" run build

echo "==> Updating backend"
cd "$SERVER_DIR"
git pull --ff-only
"${BUN_BIN}" install
"${BUN_BIN}" run db:migrate
restart_backend

echo "==> Deployment finished"
systemctl status "$SERVICE_NAME" --no-pager
