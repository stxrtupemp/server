# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# OpenSSL needed for Prisma to detect the correct binary target (linux-musl-openssl-3.0.x)
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# OpenSSL required at runtime so Prisma detects the correct schema-engine binary
# postgresql-client provides psql for the startup baseline check
RUN apk add --no-cache openssl postgresql-client

WORKDIR /app

ENV NODE_ENV=production

# npm ci (without --ignore-scripts) so Prisma postinstall downloads schema-engine
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output and Prisma generated client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

COPY start.sh ./start.sh
RUN chmod +x start.sh && mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Run migrations before starting the server
CMD ["sh", "/app/start.sh"]
