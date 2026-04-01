#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"
DRIZZLE_DIR="${ROOT_DIR}/drizzle"

usage() {
  cat <<'EOF'
Usage:
  scripts/check_pending_migrations.sh

Behavior:
  - Loads DB_* from .env
  - Computes sha256 for drizzle/*.sql
  - Compares local SQL hashes against __drizzle_migrations
  - Prints pending migration files
EOF
}

if [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

required_vars=(DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME)
for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Missing required env var: ${var_name}" >&2
    exit 1
  fi
done

if command -v sha256sum >/dev/null 2>&1; then
  HASH_CMD=(sha256sum)
elif command -v shasum >/dev/null 2>&1; then
  HASH_CMD=(shasum -a 256)
else
  echo "Missing sha256 tool: need sha256sum or shasum" >&2
  exit 1
fi

mysql_exec() {
  mysql \
    -h"${DB_HOST}" \
    -P"${DB_PORT}" \
    -u"${DB_USER}" \
    -p"${DB_PASSWORD}" \
    "${DB_NAME}" \
    "$@"
}

mapfile -t recorded_hashes < <(mysql_exec -Nse "SELECT hash FROM __drizzle_migrations")
pending=0

while IFS= read -r -d '' migration_file; do
  migration_hash="$("${HASH_CMD[@]}" "${migration_file}" | awk '{print $1}')"
  migration_name="${migration_file#${ROOT_DIR}/}"

  found=0
  for recorded_hash in "${recorded_hashes[@]}"; do
    if [ "${recorded_hash}" = "${migration_hash}" ]; then
      found=1
      break
    fi
  done

  if [ "${found}" -eq 0 ]; then
    echo "PENDING ${migration_name}"
    pending=1
  fi
done < <(find "${DRIZZLE_DIR}" -maxdepth 1 -type f -name '*.sql' -print0 | sort -z)

if [ "${pending}" -eq 0 ]; then
  echo "No pending SQL migrations."
fi
