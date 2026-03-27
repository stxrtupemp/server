import { prisma } from '../config/database';

// ─── Character transliteration map ───────────────────────────────────────────
// Covers Spanish, French, German, Portuguese, Italian diacritics
const TRANSLITERATE_MAP: Record<string, string> = {
  á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a', å: 'a', æ: 'ae',
  é: 'e', è: 'e', ë: 'e', ê: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o', ø: 'o', œ: 'oe',
  ú: 'u', ù: 'u', ü: 'u', û: 'u',
  ñ: 'n', ç: 'c', ß: 'ss', ý: 'y', ÿ: 'y',
  // Uppercase versions handled by toLowerCase() first
};

// ─── Core normaliser ──────────────────────────────────────────────────────────

/**
 * Convert any string into a URL-safe slug.
 *
 * Steps:
 *  1. Lowercase
 *  2. Transliterate diacritics
 *  3. Strip NFD combining characters
 *  4. Replace non-alphanumeric characters with hyphens
 *  5. Collapse repeated hyphens
 *  6. Trim leading/trailing hyphens
 *  7. Truncate to 80 characters
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    // Transliterate known chars
    .replace(/[^\u0000-\u007E]/g, (char) => TRANSLITERATE_MAP[char] ?? char)
    // NFD decompose + strip combining diacritical marks
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace anything not alphanumeric or hyphen with a hyphen
    .replace(/[^a-z0-9]+/g, '-')
    // Collapse consecutive hyphens
    .replace(/-{2,}/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Truncate to 80 chars, cutting at a hyphen boundary if possible
    .slice(0, 80)
    .replace(/-+$/, '');
}

// ─── DB-backed unique slug ────────────────────────────────────────────────────

/**
 * Generate a slug for `title` that is guaranteed to be unique in the
 * `properties` table. If the base slug is taken, appends `-2`, `-3`, … until
 * a free slot is found.
 *
 * @param title     Source string (property title)
 * @param excludeId Exclude this property ID when checking uniqueness (used on updates)
 */
export async function generateUniqueSlug(
  title:      string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(title);

  if (!base) {
    // Fallback for titles that produce an empty slug (e.g. "!!!")
    return generateUniqueSlug(`property-${Date.now()}`, excludeId);
  }

  let candidate = base;
  let counter   = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.property.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (!existing) return candidate;

    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

// ─── Batch slug normalisation (utility for migrations/seeds) ─────────────────

/**
 * Re-slugify all properties that have a null or empty slug.
 * Useful as a one-off migration script.
 */
export async function backfillSlugs(): Promise<number> {
  const properties = await prisma.property.findMany({
    where: { OR: [{ slug: '' }, { slug: { equals: undefined } }] },
    select: { id: true, title: true },
  });

  let count = 0;

  for (const prop of properties) {
    const slug = await generateUniqueSlug(prop.title);
    await prisma.property.update({ where: { id: prop.id }, data: { slug } });
    count++;
  }

  return count;
}
