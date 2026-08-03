import type { PrismaClient } from "@lurem/db";
import { evaluateFlag } from "./evaluate.js";

export async function resolveFlags(
  prisma: PrismaClient,
  userId: string,
): Promise<Record<string, boolean>> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, isBetaTester: true },
  });
  const [flags, overrides] = await Promise.all([
    prisma.featureFlag.findMany(),
    prisma.featureFlagOverride.findMany({ where: { userId } }),
  ]);
  const overrideByKey = new Map(overrides.map((o) => [o.flagKey, o]));

  const result: Record<string, boolean> = {};
  for (const flag of flags) {
    const override = overrideByKey.get(flag.key);
    result[flag.key] = evaluateFlag(
      { key: flag.key, state: flag.state, rolloutPercent: flag.rolloutPercent },
      override ? { state: override.state as "on" | "off" } : null,
      user,
    );
  }
  return result;
}
