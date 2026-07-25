// apps/api/src/auth/refresh-tokens.ts
import { randomBytes, createHash, randomUUID } from "node:crypto";
import type { PrismaClient } from "@harmon/db";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class RefreshTokenReuseError extends Error {
  constructor() {
    super("Refresh token reuse detected — family revoked");
  }
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function createTokenRow(
  prisma: PrismaClient,
  userId: string,
  familyId: string,
): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  await prisma.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return raw;
}

export async function issueRefreshTokenFamily(
  prisma: PrismaClient,
  userId: string,
): Promise<{ token: string; familyId: string }> {
  const familyId = randomUUID();
  const token = await createTokenRow(prisma, userId, familyId);
  return { token, familyId };
}

export async function rotateRefreshToken(
  prisma: PrismaClient,
  rawToken: string,
): Promise<{ token: string; userId: string; familyId: string }> {
  const tokenHash = hashToken(rawToken);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!row || row.revokedAt || row.expiresAt < new Date()) {
    throw new Error("Invalid or expired refresh token");
  }

  if (row.usedAt) {
    await revokeRefreshFamily(prisma, row.familyId);
    throw new RefreshTokenReuseError();
  }

  await prisma.refreshToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  const newToken = await createTokenRow(prisma, row.userId, row.familyId);
  return { token: newToken, userId: row.userId, familyId: row.familyId };
}

export async function revokeRefreshFamily(prisma: PrismaClient, familyId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
