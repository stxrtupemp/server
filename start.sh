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

echo ">> Starting server..."
exec node dist/index.js