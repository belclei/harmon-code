import { describe, expect, it } from "vitest";
import { evaluateFlag } from "./evaluate.js";

const BETA_USER = { id: "user_beta", isBetaTester: true };
const NORMAL_USER = { id: "user_normal", isBetaTester: false };

describe("evaluateFlag", () => {
  it("is off for everyone when state is off, regardless of override", () => {
    const flag = {
      key: "imports.pipeline",
      state: "off" as const,
      rolloutPercent: 100,
    };
    expect(evaluateFlag(flag, null, NORMAL_USER)).toBe(false);
    expect(evaluateFlag(flag, null, BETA_USER)).toBe(false);
  });

  it("is on only for beta testers when state is beta", () => {
    const flag = {
      key: "imports.pipeline",
      state: "beta" as const,
      rolloutPercent: 100,
    };
    expect(evaluateFlag(flag, null, BETA_USER)).toBe(true);
    expect(evaluateFlag(flag, null, NORMAL_USER)).toBe(false);
  });

  it("user override wins over state", () => {
    const flag = {
      key: "imports.pipeline",
      state: "off" as const,
      rolloutPercent: 100,
    };
    expect(evaluateFlag(flag, { state: "on" }, NORMAL_USER)).toBe(true);

    const onFlag = {
      key: "imports.pipeline",
      state: "on" as const,
      rolloutPercent: 100,
    };
    expect(evaluateFlag(onFlag, { state: "off" }, NORMAL_USER)).toBe(false);
  });

  it("respects rolloutPercent=0 as off for everyone when state is on", () => {
    const flag = {
      key: "imports.pipeline",
      state: "on" as const,
      rolloutPercent: 0,
    };
    expect(evaluateFlag(flag, null, NORMAL_USER)).toBe(false);
  });

  it("respects rolloutPercent=100 as on for everyone when state is on", () => {
    const flag = {
      key: "imports.pipeline",
      state: "on" as const,
      rolloutPercent: 100,
    };
    expect(evaluateFlag(flag, null, NORMAL_USER)).toBe(true);
  });

  it("is deterministic for the same user+flag at a partial rollout", () => {
    const flag = {
      key: "imports.pipeline",
      state: "on" as const,
      rolloutPercent: 50,
    };
    const first = evaluateFlag(flag, null, NORMAL_USER);
    const second = evaluateFlag(flag, null, NORMAL_USER);
    expect(first).toBe(second);
  });
});
