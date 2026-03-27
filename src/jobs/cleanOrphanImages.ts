/**
 * cleanOrphanImages.ts
 *
 * Standalone script that scans the filesystem upload directory and removes
 * image files that are no longer referenced by any row in `property_images`.
 *
 * Usage:
 *   npm run db:clean-images          (via package.json script)
 *   npx tsx src/jobs/cleanOrphanImages.ts
 *
 * Safe by default — runs in dry-run mode unless --delete flag is passed.
 * Logs every action to stdout.
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma    = new PrismaClient();
const DRY_RUN   = !process.argv.includes('--delete');
const UPLOAD_DIR = process.env['UPLOAD_DIR'] ?? 'uploads';

// Sub-directories to scan (add more if needed)
const SCAN_SUBDIRS = ['properties', 'avatars'] as const;

interface CleanupReport {
  scanned:  number;
  orphans:  number;
  deleted:  number;
  errors:   string[];
  totalSizeBytes: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

/**
 * Recursively list all files in a directory.
 */
function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).reduce<string[]>((acc, entry) => {
    const full = path.join(dir, entry);
    const stat  = fs.statSync(full);
    if (stat.isDirectory())  return [...acc, ...listFiles(full)];
    if (stat.isFile())       return [...acc, full];
    return acc;
  }, []);
}

/**
 * Convert an absolute filesystem path back to the URL path stored in the DB.
 * e.g. /app/uploads/properties/abc.webp  →  /uploads/properties/abc.webp
 */
function pathToUrl(absolutePath: string, uploadDir: string): string {
  const relative = path.relative(path.resolve(uploadDir), absolutePath);
  return `/uploads/${relative.replace(/\\/g, '/')}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('════════════════════════════════════════════');
  console.log(' Orphan Image Cleaner');
  console.log(` Mode   : ${DRY_RUN ? 'DRY RUN (no files deleted)' : '⚠️  DELETE MODE'}`);
  console.log(` Upload : ${path.resolve(UPLOAD_DIR)}`);
  console.log('════════════════════════════════════════════\n');

  const report: CleanupReport = {
    scanned: 0, orphans: 0, deleted: 0, errors: [], totalSizeBytes: 0,
  };

  // 1. Fetch all URLs referenced in the DB
  const dbImages = await prisma.propertyImage.findMany({ select: { url: true } });
  // Also include user avatars if you store them
  const dbAvatars = await prisma.user.findMany({
    where:  { avatar_url: { not: null } },
    select: { avatar_url: true },
  });

  const knownUrls = new Set<string>([
    ...dbImages.map((i) => i.url),
    ...dbAvatars.map((u) => u.avatar_url!),
  ]);

  console.log(`  DB references : ${knownUrls.size} URLs\n`);

  // 2. Walk each sub-directory
  for (const subdir of SCAN_SUBDIRS) {
    const dirPath = path.join(path.resolve(UPLOAD_DIR), subdir);
    const files   = listFiles(dirPath);

    console.log(`  Scanning /${subdir} … (${files.length} files)`);

    for (const filePath of files) {
      report.scanned++;
      const url  = pathToUrl(filePath, UPLOAD_DIR);
      const stat = fs.statSync(filePath);

      if (!knownUrls.has(url)) {
        report.orphans++;
        report.totalSizeBytes += stat.size;

        if (DRY_RUN) {
          console.log(`  [DRY] Would delete: ${url} (${formatBytes(stat.size)})`);
        } else {
          try {
            fs.unlinkSync(filePath);
            report.deleted++;
            console.log(`  [DEL] Deleted     : ${url} (${formatBytes(stat.size)})`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            report.errors.push(`${url}: ${msg}`);
            console.error(`  [ERR] ${url}: ${msg}`);
          }
        }
      }
    }
  }

  // 3. Summary
  console.log('\n════════════════════════════════════════════');
  console.log(' Summary');
  console.log('════════════════════════════════════════════');
  console.log(`  Files scanned   : ${report.scanned}`);
  console.log(`  Orphan files    : ${report.orphans}`);
  console.log(`  Reclaimable     : ${formatBytes(report.totalSizeBytes)}`);
  if (!DRY_RUN) {
    console.log(`  Files deleted   : ${report.deleted}`);
    console.log(`  Errors          : ${report.errors.length}`);
  }
  if (DRY_RUN && report.orphans > 0) {
    console.log('\n  Re-run with --delete to permanently remove orphan files.');
  }
  console.log('════════════════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
