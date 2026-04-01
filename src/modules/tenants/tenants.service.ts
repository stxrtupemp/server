import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { buildMeta, paginate } from '../../lib/pagination';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import type { CreateTenantInput, UpdateTenantInput, ListTenantsInput, CreateTenantUserInput } from './tenants.schema';

const tenantSelect = {
  id: true, name: true, slug: true, domain: true, logo_url: true, active: true,
  created_at: true, updated_at: true,
  _count: { select: { users: true, properties: true } },
} satisfies Prisma.TenantSelect;

export async function listTenants(input: ListTenantsInput) {
  const { page, limit, active, search } = input;
  const where: Prisma.TenantWhereInput = {
    ...(active !== undefined && { active }),
    ...(search && { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ]}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.tenant.count({ where }),
    prisma.tenant.findMany({ where, orderBy: { created_at: 'desc' }, ...paginate(page, limit), select: tenantSelect }),
  ]);
  return { items, meta: buildMeta(page, limit, total) };
}

export async function getTenantById(id: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id }, select: tenantSelect });
  if (!tenant) throw new NotFoundError('Tenant');
  return tenant;
}

export async function createTenant(input: CreateTenantInput) {
  const existing = await prisma.tenant.findUnique({ where: { slug: input.slug } });
  if (existing) throw new ConflictError('A tenant with that slug already exists');
  return prisma.tenant.create({ data: input, select: tenantSelect });
}

export async function updateTenant(id: string, input: UpdateTenantInput) {
  const existing = await prisma.tenant.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Tenant');
  if (input.slug && input.slug !== existing.slug) {
    const conflict = await prisma.tenant.findUnique({ where: { slug: input.slug } });
    if (conflict) throw new ConflictError('A tenant with that slug already exists');
  }
  return prisma.tenant.update({ where: { id }, data: input, select: tenantSelect });
}

export async function deleteTenant(id: string) {
  const existing = await prisma.tenant.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Tenant');
  await prisma.tenant.delete({ where: { id } });
}

export async function createTenantUser(tenantId: string, input: CreateTenantUserInput) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError('Tenant');
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError('A user with that email already exists');
  const password_hash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  return prisma.user.create({
    data: { ...input, password_hash, tenant_id: tenantId },
    select: { id: true, email: true, name: true, role: true, phone: true, active: true, created_at: true },
  });
}

export async function getTenantBySlug(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where:  { slug },
    select: { id: true, name: true, slug: true, logo_url: true, active: true },
  });
  if (!tenant) throw new NotFoundError('Tenant');
  return tenant;
}
