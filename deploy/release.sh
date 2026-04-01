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

require_clean_repo() {
  local repo_dir="$1"
  local repo_name="$2"

  cd "$repo_dir"
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "${repo_name} repo is dirty, aborting deploy." >&2
    git status --short >&2
    return 1
  fi
}

has_migration_changes() {
  local old_ref="$1"
  local new_ref="$2"
  local changed_files=""

  if [ "$old_ref" = "$new_ref" ]; then
    return 1
  fi

  changed_files="$(git diff --name-only "${old_ref}..${new_ref}")"
  grep -Eq '^drizzle/.+\.sql$|^drizzle/meta/' <<<"${changed_files}"
}

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
require_clean_repo "$ADMIN_DIR" "Frontend"
ADMIN_BEFORE="$(git rev-parse HEAD)"
git pull --ff-only
ADMIN_AFTER="$(git rev-parse HEAD)"
"${NPM_BIN}" --version
"${NPM_BIN}" ci
"${NPM_BIN}" run build
echo "Frontend updated: ${ADMIN_BEFORE} -> ${ADMIN_AFTER}"

echo "==> Updating backend"
require_clean_repo "$SERVER_DIR" "Backend"
SERVER_BEFORE="$(git rev-parse HEAD)"
git pull --ff-only
SERVER_AFTER="$(git rev-parse HEAD)"
"${BUN_BIN}" install --frozen-lockfile
if has_migration_changes "${SERVER_BEFORE}" "${SERVER_AFTER}"; then
  echo "==> Migration files changed, running db:migrate"
  "${BUN_BIN}" run db:migrate
else
  echo "==> No migration file changes, skipping db:migrate"
fi
restart_backend
echo "Backend updated: ${SERVER_BEFORE} -> ${SERVER_AFTER}"

echo "==> Deployment finished"
systemctl status "$SERVICE_NAME" --no-pager
