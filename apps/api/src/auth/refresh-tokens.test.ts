import { PrismaClient } from "@harmon/db";
// apps/api/src/auth/refresh-tokens.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resetTestDb } from "../../test/db.js";
import {
  RefreshTokenReuseError,
  issueRefreshTokenFamily,
  rotateRefreshToken,
} from "./refresh-tokens.js";

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});
afterEach(async () => {
  await resetTestDb(prisma);
});
afterAll(async () => {
  await prisma.$disconnect();
});

async function makeUser() {
  return prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@test.com`,
      name: "Test",
      birthDate: new Date("1990-01-01"),
    },
  });
}

describe("refresh token rotation", () => {
  it("issues a family and rotates it once", async () => {
    const user = await makeUser();
    const first = await issueRefreshTokenFamily(prisma, user.id);
    const rotated = await rotateRefreshToken(prisma, first.token);
    expect(rotated.userId).toBe(user.id);
    expect(rotated.familyId).toBe(first.familyId);
    expect(rotated.token).not.toBe(first.token);
  });

  it("revokes the whole family when a used token is reused", async () => {
    const user = await makeUser();
    const first = await issueRefreshTokenFamily(prisma, user.id);
    const second = await rotateRefreshToken(prisma, first.token);

    // Reusing `first.token` (already consumed) must revoke the family...
    await expect(rotateRefreshToken(prisma, first.token)).rejects.toThrow(
      RefreshTokenReuseError,
    );

    // ...so the otherwise-valid `second.token` is now also revoked.
    await expect(rotateRefreshToken(prisma, second.token)).rejects.toThrow();
  });

  it("closes the TOCTOU race: only one of two concurrent rotations on the same token wins, and the family is revoked", async () => {
    const user = await makeUser();
    const first = await issueRefreshTokenFamily(prisma, user.id);

    const results = await Promise.allSettled([
      rotateRefreshToken(prisma, first.token),
      rotateRefreshToken(prisma, first.token),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      RefreshTokenReuseError,
    );

    // The family must now be revoked, so even the winner's freshly-minted token is unusable.
    const winnerToken = (
      fulfilled[0] as PromiseFulfilledResult<{ token: string }>
    ).value.token;
    await expect(rotateRefreshToken(prisma, winnerToken)).rejects.toThrow();
  });

  it("rejects an unknown token", async () => {
    await expect(
      rotateRefreshToken(prisma, "not-a-real-token"),
    ).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const user = await makeUser();
    const first = await issueRefreshTokenFamily(prisma, user.id);
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(rotateRefreshToken(prisma, first.token)).rejects.toThrow();
  });
});
