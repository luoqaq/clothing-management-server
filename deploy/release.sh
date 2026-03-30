#!/usr/bin/env bash

set -euo pipefail

ADMIN_DIR="/var/clothing/admin"
SERVER_DIR="/var/clothing/server"
SERVICE_NAME="clothing-management-server"

echo "==> Updating frontend"
cd "$ADMIN_DIR"
git pull --ff-only
npm install
npm run build

echo "==> Updating backend"
cd "$SERVER_DIR"
git pull --ff-only
bun install
bun run db:migrate
systemctl restart "$SERVICE_NAME"

echo "==> Deployment finished"
systemctl status "$SERVICE_NAME" --no-pager
