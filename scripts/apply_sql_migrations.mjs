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
const dangerousInitialMigration = 'drizzle/0000_spicy_guardian.sql';

function usage() {
  console.log(`Usage:
  scripts/apply_sql_migrations.sh [--dry-run] drizzle/0005_customer_statistics.sql [more files...]

Behavior:
  - Loads DB_* from .env
  - Applies each SQL file explicitly with mysql2
  - Inserts the SQL file sha256 into __drizzle_migrations after success
  - Skips files already recorded in __drizzle_migrations
  - With --dry-run, only reports what would be applied`);
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

function normalizeMigrationSql(content) {
  return content
    .split(/\r?\n/)
    .filter((line) => !/^\s*-->\s*statement-breakpoint\s*$/.test(line))
    .join('\n')
    .trim();
}

function resolveMigrationPath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.join(rootDir, inputPath);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.length === 0) {
    usage();
    return;
  }

  const dryRun = args.includes('--dry-run');
  const migrationInputs = args.filter((arg) => arg !== '--dry-run');
  if (migrationInputs.length === 0) {
    usage();
    process.exitCode = 1;
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
    multipleStatements: true,
  });

  try {
    for (const inputPath of migrationInputs) {
      const migrationFile = resolveMigrationPath(inputPath);
      if (!fs.existsSync(migrationFile)) {
        throw new Error(`Migration file not found: ${migrationFile}`);
      }

      const migrationName = path.relative(rootDir, migrationFile);
      const migrationHash = sha256File(migrationFile);
      const [existingRows] = await connection.query(
        'SELECT COUNT(*) AS count FROM __drizzle_migrations WHERE hash = ?',
        [migrationHash]
      );
      const alreadyRecorded = Number(existingRows[0]?.count ?? 0) > 0;

      if (alreadyRecorded) {
        console.log(`Skipping already recorded migration: ${migrationName}`);
        continue;
      }

      if (migrationName === dangerousInitialMigration) {
        throw new Error(
          `${dangerousInitialMigration} is a historical backfill migration with destructive SQL. Verify production __drizzle_migrations and register the hash only; do not execute this SQL.`
        );
      }

      if (dryRun) {
        console.log(`WOULD APPLY ${migrationName}`);
        continue;
      }

      const sql = normalizeMigrationSql(fs.readFileSync(migrationFile, 'utf8'));
      if (!sql) {
        throw new Error(`Migration file is empty: ${migrationName}`);
      }

      console.log(`Applying migration: ${migrationName}`);
      await connection.query(sql);

      await connection.query(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
        [migrationHash, Date.now()]
      );
      console.log(`Recorded migration: ${migrationName}`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
