// apps/api/test/db.ts
import type { PrismaClient } from "@harmon/db";

// Truncates every table this sprint's tests touch, between tests — keeps
// integration tests independent without needing a full migrate reset per test.
export async function resetTestDb(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.featureFlagOverride.deleteMany(),
    prisma.featureFlag.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
