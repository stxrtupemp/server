#!/bin/sh
set -e

echo ">> Checking database state..."

# If _prisma_migrations doesn't exist but users table does, the DB was set up
# via db push — baseline the initial migration so migrate deploy won't re-apply it
MIGRATIONS_EXIST=$(psql "$DATABASE_URL" -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations' LIMIT 1" \
  2>/dev/null || echo "")

TABLES_EXIST=$(psql "$DATABASE_URL" -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users' LIMIT 1" \
  2>/dev/null || echo "")

if [ -z "$MIGRATIONS_EXIST" ] && [ -n "$TABLES_EXIST" ]; then
  echo ">> Existing schema detected (db push). Baselining migration history..."
  npx prisma migrate resolve --applied "20260331000000_init"
fi

echo ">> Running migrations..."
npx prisma migrate deploy

echo ">> Starting server..."
exec node dist/index.js
