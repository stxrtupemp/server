import slugify from 'slugify';
import { Role, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { processAndSaveImage, deleteImageFile } from '../../config/storage';
import { buildMeta, paginate } from '../../lib/pagination';
import { NotFoundError, ForbiddenError, ConflictError } from '../../middleware/errorHandler';
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  PatchStatusInput,
  ListPropertiesInput,
  ReorderImagesInput,
} from './properties.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true, locale: 'es' });
  let candidate = base;
  let counter   = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.property.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

const propertySelect = {
  id:          true,
  title:       true,
  slug:        true,
  description: true,
  type:        true,
  operation:   true,
  status:      true,
  price:       true,
  currency:    true,
  area_m2:     true,
  bedrooms:    true,
  bathrooms:   true,
  parking:     true,
  address:     true,
  city:        true,
  zone:        true,
  lat:         true,
  lng:         true,
  features:    true,
  created_at:  true,
  updated_at:  true,
  agent: {
    select: { id: true, name: true, email: true, phone: true, avatar_url: true },
  },
  images: {
    orderBy: [{ is_cover: 'desc' as const }, { order: 'asc' as const }],
    select:  { id: true, url: true, order: true, is_cover: true },
  },
} satisfies Prisma.PropertySelect;

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listProperties(input: ListPropertiesInput, requesterId: string, requesterRole: Role) {
  const { page, limit, sort, type, operation, status, city, zone, price_min, price_max, bedrooms, agent_id } = input;

  // Agents only see their own properties unless they explicitly filter
  const resolvedAgentId =
    requesterRole === Role.AGENT && !agent_id ? requesterId : agent_id;

  const where: Prisma.PropertyWhereInput = {
    ...(type              && { type }),
    ...(operation         && { operation }),
    ...(status            && { status }),
    ...(city              && { city: { contains: city, mode: 'insensitive' } }),
    ...(zone              && { zone: { contains: zone, mode: 'insensitive' } }),
    ...(price_min         && { price: { gte: price_min } }),
    ...(price_max         && { price: { lte: price_max } }),
    ...(bedrooms !== undefined && { bedrooms }),
    ...(resolvedAgentId   && { agent_id: resolvedAgentId }),
  };

  const orderBy: Prisma.PropertyOrderByWithRelationInput =
    sort === 'price_asc'        ? { price: 'asc' }       :
    sort === 'price_desc'       ? { price: 'desc' }      :
    sort === 'created_at_asc'   ? { created_at: 'asc' }  :
                                  { created_at: 'desc' };

  const [total, items] = await prisma.$transaction([
    prisma.property.count({ where }),
    prisma.property.findMany({ where, orderBy, ...paginate(page, limit), select: propertySelect }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getPropertyById(id: string, requesterId: string, requesterRole: Role) {
  const property = await prisma.property.findUnique({ where: { id }, select: propertySelect });
  if (!property) throw new NotFoundError('Property');
  if (requesterRole === Role.AGENT && property.agent.id !== requesterId) {
    throw new ForbiddenError('You can only view your own properties');
  }
  return property;
}

// ─── Get by slug (public) ─────────────────────────────────────────────────────

export async function getPropertyBySlug(slug: string) {
  const property = await prisma.property.findUnique({ where: { slug }, select: propertySelect });
  if (!property) throw new NotFoundError('Property');
  return property;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProperty(input: CreatePropertyInput, requesterId: string, requesterRole: Role) {
  const agentId = requesterRole === Role.ADMIN && input.agent_id ? input.agent_id : requesterId;
  const slug    = await generateUniqueSlug(input.title);

  return prisma.property.create({
    data: {
      ...input,
      agent_id: agentId,
      slug,
      price:    input.price,
      area_m2:  input.area_m2,
      lat:      input.lat,
      lng:      input.lng,
    },
    select: propertySelect,
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProperty(id: string, input: UpdatePropertyInput, requesterId: string, requesterRole: Role) {
  const existing = await prisma.property.findUnique({ where: { id }, select: { agent_id: true } });
  if (!existing) throw new NotFoundError('Property');
  if (requesterRole === Role.AGENT && existing.agent_id !== requesterId) {
    throw new ForbiddenError('You can only edit your own properties');
  }

  const slug = input.title ? await generateUniqueSlug(input.title, id) : undefined;

  return prisma.property.update({
    where: { id },
    data:  { ...input, ...(slug ? { slug } : {}) },
    select: propertySelect,
  });
}

// ─── Patch status ─────────────────────────────────────────────────────────────

export async function patchPropertyStatus(id: string, input: PatchStatusInput, requesterId: string, requesterRole: Role) {
  const existing = await prisma.property.findUnique({ where: { id }, select: { agent_id: true } });
  if (!existing) throw new NotFoundError('Property');
  if (requesterRole === Role.AGENT && existing.agent_id !== requesterId) {
    throw new ForbiddenError('You can only update your own properties');
  }
  return prisma.property.update({ where: { id }, data: { status: input.status }, select: propertySelect });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteProperty(id: string) {
  const existing = await prisma.property.findUnique({
    where:  { id },
    select: { id: true, images: { select: { url: true } } },
  });
  if (!existing) throw new NotFoundError('Property');

  // Delete image files from disk
  await Promise.all(existing.images.map((img) => deleteImageFile(img.url)));

  await prisma.property.delete({ where: { id } });
}

// ─── Images ───────────────────────────────────────────────────────────────────

export async function addPropertyImages(
  propertyId: string,
  files: Express.Multer.File[],
  requesterId: string,
  requesterRole: Role,
) {
  const property = await prisma.property.findUnique({
    where:  { id: propertyId },
    select: { agent_id: true, images: { select: { id: true } } },
  });
  if (!property) throw new NotFoundError('Property');
  if (requesterRole === Role.AGENT && property.agent_id !== requesterId) {
    throw new ForbiddenError('You can only add images to your own properties');
  }
  if (property.images.length + files.length > 10) {
    throw new ConflictError(`A property can have at most 10 images (currently ${property.images.length})`);
  }

  const processed = await Promise.all(files.map((f) => processAndSaveImage(f.buffer)));

  const hasCover  = await prisma.propertyImage.findFirst({ where: { property_id: propertyId, is_cover: true } });
  const baseOrder = property.images.length;

  const created = await prisma.$transaction(
    processed.map((img, i) =>
      prisma.propertyImage.create({
        data: {
          property_id: propertyId,
          url:         img.url,
          order:       baseOrder + i,
          is_cover:    !hasCover && i === 0,
        },
      }),
    ),
  );

  return created;
}

export async function deletePropertyImage(propertyId: string, imageId: string, requesterId: string, requesterRole: Role) {
  const image = await prisma.propertyImage.findFirst({
    where:  { id: imageId, property_id: propertyId },
    include: { property: { select: { agent_id: true } } },
  });
  if (!image) throw new NotFoundError('Image');
  if (requesterRole === Role.AGENT && image.property.agent_id !== requesterId) {
    throw new ForbiddenError('You can only delete images from your own properties');
  }

  await deleteImageFile(image.url);
  await prisma.propertyImage.delete({ where: { id: imageId } });

  // If deleted image was the cover, promote next image
  if (image.is_cover) {
    const next = await prisma.propertyImage.findFirst({
      where:   { property_id: propertyId },
      orderBy: { order: 'asc' },
    });
    if (next) await prisma.propertyImage.update({ where: { id: next.id }, data: { is_cover: true } });
  }
}

export async function reorderPropertyImages(
  propertyId: string,
  input: ReorderImagesInput,
  requesterId: string,
  requesterRole: Role,
) {
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { agent_id: true } });
  if (!property) throw new NotFoundError('Property');
  if (requesterRole === Role.AGENT && property.agent_id !== requesterId) {
    throw new ForbiddenError('You can only reorder images from your own properties');
  }

  await prisma.$transaction(
    input.ids.map((id, index) =>
      prisma.propertyImage.updateMany({
        where: { id, property_id: propertyId },
        data:  { order: index, is_cover: index === 0 },
      }),
    ),
  );

  return prisma.propertyImage.findMany({
    where:   { property_id: propertyId },
    orderBy: { order: 'asc' },
    select:  { id: true, url: true, order: true, is_cover: true },
  });
}
