import { describe, expect, it } from "vitest";
import { formatMoney } from "./formatMoney";

describe("formatMoney", () => {
  it("formats whole reais with thousands separator", () => {
    expect(formatMoney(123456)).toBe("R$ 1.234,56");
  });

  it("formats a single real", () => {
    expect(formatMoney(100)).toBe("R$ 1,00");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("R$ 0,00");
  });

  it("formats negative values with a leading minus before the currency sign", () => {
    expect(formatMoney(-500)).toBe("-R$ 5,00");
  });

  it("formats sub-real cent values", () => {
    expect(formatMoney(999)).toBe("R$ 9,99");
  });
});
