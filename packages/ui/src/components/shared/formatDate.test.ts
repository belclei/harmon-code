import { describe, expect, it } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate", () => {
  it("formats an ISO date as dd/mm/aaaa", () => {
    expect(formatDate("2026-07-24T12:00:00.000Z")).toBe("24/07/2026");
  });

  it("pads single-digit day and month", () => {
    expect(formatDate("2026-01-05T12:00:00.000Z")).toBe("05/01/2026");
  });
});
