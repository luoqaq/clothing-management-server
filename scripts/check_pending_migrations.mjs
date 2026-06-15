#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envFile = process.env.ENV_FILE || path.join(rootDir, '.env');
const drizzleDir = path.join(rootDir, 'drizzle');

function usage() {
  console.log(`Usage:
  scripts/check_pending_migrations.sh

Behavior:
  - Loads DB_* from .env
  - Computes sha256 for drizzle/*.sql
  - Compares local SQL hashes against __drizzle_migrations
  - Prints pending migration files`);
}

function parseEnv(content) {
  const parsed = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const normalized = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    let value = normalized.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function main() {
  if (process.argv.includes('--help')) {
    usage();
    return;
  }

  if (!fs.existsSync(envFile)) {
    throw new Error(`Missing env file: ${envFile}`);
  }

  const fileEnv = parseEnv(fs.readFileSync(envFile, 'utf8'));
  const env = { ...fileEnv, ...process.env };
  const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  for (const key of requiredVars) {
    if (!env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  try {
    const [rows] = await connection.query('SELECT hash FROM __drizzle_migrations');
    const recordedHashes = new Set(rows.map((row) => String(row.hash)));
    const migrationFiles = fs
      .readdirSync(drizzleDir)
      .filter((fileName) => fileName.endsWith('.sql'))
      .sort();

    let pending = false;
    for (const fileName of migrationFiles) {
      const migrationPath = path.join(drizzleDir, fileName);
      const migrationHash = sha256File(migrationPath);

      if (!recordedHashes.has(migrationHash)) {
        console.log(`PENDING drizzle/${fileName}`);
        pending = true;
      }
    }

    if (!pending) {
      console.log('No pending SQL migrations.');
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
