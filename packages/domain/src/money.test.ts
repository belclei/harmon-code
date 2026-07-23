import { describe, expect, it } from "vitest";
import type { BreakdownLine, Money } from "./money.js";

describe("Money / BreakdownLine shape", () => {
  it("allows constructing a Money whose breakdown sums to valueCents", () => {
    const breakdown: BreakdownLine[] = [
      {
        label: "a",
        valueCents: 1_000,
        kind: "account_balance",
        isEstimate: false,
      },
      { label: "b", valueCents: -300, kind: "scheduled_tx", isEstimate: true },
    ];
    const money: Money = {
      valueCents: breakdown.reduce((sum, line) => sum + line.valueCents, 0),
      breakdown,
    };

    expect(money.valueCents).toBe(700);
  });
});
