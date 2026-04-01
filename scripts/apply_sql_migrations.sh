#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"

usage() {
  cat <<'EOF'
Usage:
  scripts/apply_sql_migrations.sh drizzle/0005_customer_statistics.sql [more files...]

Behavior:
  - Loads DB_* from .env
  - Applies each SQL file explicitly with mysql
  - Inserts the SQL file sha256 into __drizzle_migrations after success
  - Skips files already recorded in __drizzle_migrations
EOF
}

if [ "${1:-}" = "--help" ] || [ $# -eq 0 ]; then
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

for input_path in "$@"; do
  if [[ "${input_path}" = /* ]]; then
    migration_file="${input_path}"
  else
    migration_file="${ROOT_DIR}/${input_path}"
  fi

  if [ ! -f "${migration_file}" ]; then
    echo "Migration file not found: ${migration_file}" >&2
    exit 1
  fi

  migration_name="${migration_file#${ROOT_DIR}/}"
  migration_hash="$("${HASH_CMD[@]}" "${migration_file}" | awk '{print $1}')"
  existing_count="$(
    mysql_exec -Nse "SELECT COUNT(*) FROM __drizzle_migrations WHERE hash = '${migration_hash}'"
  )"

  if [ "${existing_count}" != "0" ]; then
    echo "Skipping already recorded migration: ${migration_name}"
    continue
  fi

  echo "Applying migration: ${migration_name}"
  mysql_exec < "${migration_file}"

  created_at="$(date +%s000)"
  mysql_exec <<SQL
INSERT INTO __drizzle_migrations (hash, created_at)
VALUES ('${migration_hash}', ${created_at});
SQL

  echo "Recorded migration: ${migration_name}"
done
