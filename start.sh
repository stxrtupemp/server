#!/bin/sh
set -e

echo "🔥 START.SH EJECUTÁNDOSE 🔥"

echo ">> Prisma version"
npx prisma -v

echo ">> Running migrations..."
npx prisma migrate deploy || {
  echo "❌ MIGRATIONS FAILED"
  exit 1
}

echo ">> Migrations done"

echo ">> Checking seed..."
npx tsx prisma/seed-if-empty.ts

echo ">> Starting server..."
exec node dist/index.js
