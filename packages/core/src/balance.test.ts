import type { AccountLike, TransactionLike } from "@harmon/domain";
import { describe, expect, it } from "vitest";
import { balance } from "./balance.js";

const ASOF = new Date("2026-07-15T12:00:00.000Z"); // 2026-07-15 in America/Sao_Paulo

function account(overrides: Partial<AccountLike> = {}): AccountLike {
  return {
    id: "acc-1",
    type: "checking",
    openingBalanceCents: 0,
    overdraftLimitCents: 0,
    isActive: true,
    ...overrides,
  };
}

function tx(
  overrides: Partial<TransactionLike> &
    Pick<TransactionLike, "id" | "kind" | "amountBRLCents">,
): TransactionLike {
  return {
    transactionDate: new Date("2026-07-10T00:00:00.000Z"),
    isScheduled: false,
    ...overrides,
  };
}

describe("balance", () => {
  it("is the opening balance for a zeroed account with no transactions", () => {
    const result = balance({
      account: account({ openingBalanceCents: 5_000 }),
      transactions: [],
      asOf: ASOF,
    });
    expect(result.valueCents).toBe(5_000);
    expect(result.breakdown.reduce((s, l) => s + l.valueCents, 0)).toBe(
      result.valueCents,
    );
  });

  it("adds income transactions", () => {
    const result = balance({
      account: account({ openingBalanceCents: 1_000 }),
      transactions: [tx({ id: "t1", kind: "income", amountBRLCents: 2_000 })],
      asOf: ASOF,
    });
    expect(result.valueCents).toBe(3_000);
  });

  it("subtracts expense transactions", () => {
    const result = balance({
      account: account({ openingBalanceCents: 1_000 }),
      transactions: [tx({ id: "t1", kind: "expense", amountBRLCents: 400 })],
      asOf: ASOF,
    });
    expect(result.valueCents).toBe(600);
  });

  it("nets to zero for a transfer pair (out on this account, in on the paired account) when only the outgoing leg is passed", () => {
    const result = balance({
      account: account({ openingBalanceCents: 1_000 }),
      transactions: [
        tx({
          id: "t1",
          kind: "transfer",
          transferDirection: "out",
          amountBRLCents: 300,
        }),
      ],
      asOf: ASOF,
    });
    expect(result.valueCents).toBe(700);
  });

  it("adds for the incoming leg of a transfer", () => {
    const result = balance({
      account: account({ openingBalanceCents: 1_000 }),
      transactions: [
        tx({
          id: "t1",
          kind: "transfer",
          transferDirection: "in",
          amountBRLCents: 300,
        }),
      ],
      asOf: ASOF,
    });
    expect(result.valueCents).toBe(1_300);
  });

  it("ignores scheduled transactions entirely", () => {
    const result = balance({
      account: account({ openingBalanceCents: 1_000 }),
      transactions: [
        tx({
          id: "t1",
          kind: "expense",
          amountBRLCents: 900,
          isScheduled: true,
        }),
      ],
      asOf: ASOF,
    });
    expect(result.valueCents).toBe(1_000);
  });

  it("ignores transactions dated after asOf", () => {
    const result = balance({
      account: account({ openingBalanceCents: 1_000 }),
      transactions: [
        tx({
          id: "t1",
          kind: "expense",
          amountBRLCents: 900,
          transactionDate: new Date("2026-07-20T00:00:00.000Z"),
        }),
      ],
      asOf: ASOF,
    });
    expect(result.valueCents).toBe(1_000);
  });

  it("includes a transaction dated exactly on asOf's Sao Paulo calendar day", () => {
    const result = balance({
      account: account({ openingBalanceCents: 1_000 }),
      // asOf is 2026-07-15T12:00Z = 2026-07-15 09:00 in Sao Paulo -> "today" is the 15th.
      transactions: [
        tx({
          id: "t1",
          kind: "expense",
          amountBRLCents: 900,
          transactionDate: new Date("2026-07-15T00:00:00.000Z"),
        }),
      ],
      asOf: ASOF,
    });
    expect(result.valueCents).toBe(100);
  });

  it("treats a manual balance-adjustment transaction like any other confirmed transaction", () => {
    // §2.2: "ajuste de saldo" is just a Transaction with description="Ajuste de saldo" at the
    // API layer — core has no special-cased concept for it, it's a plain signed delta.
    const result = balance({
      account: account({ openingBalanceCents: 1_000 }),
      transactions: [tx({ id: "adj-1", kind: "income", amountBRLCents: 250 })],
      asOf: ASOF,
    });
    expect(result.valueCents).toBe(1_250);
  });

  it("can go negative within the overdraft limit without an overdraft_note line", () => {
    const result = balance({
      account: account({ openingBalanceCents: 0, overdraftLimitCents: 500 }),
      transactions: [tx({ id: "t1", kind: "expense", amountBRLCents: 300 })],
      asOf: ASOF,
    });
    expect(result.valueCents).toBe(-300);
    expect(result.breakdown.some((l) => l.kind === "overdraft_note")).toBe(
      false,
    );
  });

  it("adds a zero-valued overdraft_note line when balance falls beyond the overdraft limit", () => {
    const result = balance({
      account: account({ openingBalanceCents: 0, overdraftLimitCents: 200 }),
      transactions: [tx({ id: "t1", kind: "expense", amountBRLCents: 300 })],
      asOf: ASOF,
    });
    expect(result.valueCents).toBe(-300);
    const note = result.breakdown.find((l) => l.kind === "overdraft_note");
    expect(note).toBeDefined();
    expect(note?.valueCents).toBe(0);
    // Overdraft note must never change the total (invariant §3.0).
    expect(result.breakdown.reduce((s, l) => s + l.valueCents, 0)).toBe(
      result.valueCents,
    );
  });
});
