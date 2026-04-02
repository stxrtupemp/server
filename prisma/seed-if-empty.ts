/**
 * Runs seed only if the tenants table is empty.
 * Called from start.sh on every deployment.
 */
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.tenant.count();
  if (count === 0) {
    console.log('>> DB is empty — running seed...');
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
    console.log('>> Seed done');
  } else {
    console.log(`>> Seed skipped (${count} tenant(s) already exist)`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
