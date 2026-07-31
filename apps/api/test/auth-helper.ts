// apps/api/test/auth-helper.ts
// Shared test helper: create a user and sign a valid access token for it,
// bypassing the full login flow (auth itself is covered by auth/routes.test.ts).
import type { PrismaClient } from "@harmon/db";
import { signAccessToken } from "../src/auth/jwt.js";

export async function createAuthedUser(
  prisma: PrismaClient,
  jwtSecret: string,
  overrides: Partial<{
    email: string;
    name: string;
    role: "user" | "admin";
  }> = {},
): Promise<{ userId: string; accessToken: string }> {
  const role = overrides.role ?? "user";
  const user = await prisma.user.create({
    data: {
      email:
        overrides.email ??
        `user-${Math.random().toString(36).slice(2)}@harmon.dev`,
      name: overrides.name ?? "Test User",
      birthDate: new Date("1990-01-01"),
      role,
    },
  });
  const accessToken = await signAccessToken({ sub: user.id, role }, jwtSecret);
  return { userId: user.id, accessToken };
}
