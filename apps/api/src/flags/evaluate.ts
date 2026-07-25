export interface FlagInput {
  key: string;
  state: "off" | "beta" | "on";
  rolloutPercent: number;
}

export interface OverrideInput {
  state: "on" | "off";
}

export interface UserInput {
  id: string;
  isBetaTester: boolean;
}

// Deterministic, dependency-free string hash (djb2) — same user+flag always
// lands on the same side of the rollout percentage (ARQUITETURA.md §6.3).
function deterministicPercent(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return Math.abs(hash) % 100;
}

export function evaluateFlag(
  flag: FlagInput,
  override: OverrideInput | null,
  user: UserInput,
): boolean {
  if (override) {
    return override.state === "on";
  }
  if (flag.state === "off") {
    return false;
  }
  if (flag.state === "beta") {
    return user.isBetaTester;
  }
  // state === "on": gated by rolloutPercent, deterministic per user+flag.
  return deterministicPercent(`${user.id}:${flag.key}`) < flag.rolloutPercent;
}
