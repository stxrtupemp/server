-- Add SUPER_ADMIN to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN' BEFORE 'ADMIN';

-- Create tenants table
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logo_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");
CREATE INDEX "tenants_active_idx" ON "tenants"("active");

-- Insert default tenant (id matches backfill below)
INSERT INTO "tenants" ("id", "name", "slug", "active", "created_at", "updated_at")
VALUES ('DEFAULT_TENANT_001', 'Default', 'default', true, NOW(), NOW());

-- Add tenant_id columns (nullable initially for backfill)
ALTER TABLE "users"         ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "properties"    ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "clients"       ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "deals"         ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "tasks"         ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "notes"         ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE "web_contacts"  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;

-- Backfill all existing rows to default tenant
UPDATE "users"         SET "tenant_id" = 'DEFAULT_TENANT_001' WHERE "tenant_id" IS NULL;
UPDATE "properties"    SET "tenant_id" = 'DEFAULT_TENANT_001' WHERE "tenant_id" IS NULL;
UPDATE "clients"       SET "tenant_id" = 'DEFAULT_TENANT_001' WHERE "tenant_id" IS NULL;
UPDATE "deals"         SET "tenant_id" = 'DEFAULT_TENANT_001' WHERE "tenant_id" IS NULL;
UPDATE "tasks"         SET "tenant_id" = 'DEFAULT_TENANT_001' WHERE "tenant_id" IS NULL;
UPDATE "notes"         SET "tenant_id" = 'DEFAULT_TENANT_001' WHERE "tenant_id" IS NULL;
UPDATE "web_contacts"  SET "tenant_id" = 'DEFAULT_TENANT_001' WHERE "tenant_id" IS NULL;

-- Make NOT NULL on data tables (users stays nullable for SUPER_ADMIN)
ALTER TABLE "properties"   ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "clients"      ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "deals"        ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "tasks"        ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "notes"        ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "web_contacts" ALTER COLUMN "tenant_id" SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS "users_tenant_id_idx"         ON "users"("tenant_id");
CREATE INDEX IF NOT EXISTS "properties_tenant_id_idx"    ON "properties"("tenant_id");
CREATE INDEX IF NOT EXISTS "clients_tenant_id_idx"       ON "clients"("tenant_id");
CREATE INDEX IF NOT EXISTS "deals_tenant_id_idx"         ON "deals"("tenant_id");
CREATE INDEX IF NOT EXISTS "tasks_tenant_id_idx"         ON "tasks"("tenant_id");
CREATE INDEX IF NOT EXISTS "notes_tenant_id_idx"         ON "notes"("tenant_id");
CREATE INDEX IF NOT EXISTS "web_contacts_tenant_id_idx"  ON "web_contacts"("tenant_id");

-- Foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "properties" ADD CONSTRAINT "properties_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deals" ADD CONSTRAINT "deals_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "web_contacts" ADD CONSTRAINT "web_contacts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
