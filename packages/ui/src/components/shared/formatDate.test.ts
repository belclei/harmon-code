import { describe, expect, it } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate", () => {
  it("formats an ISO date as dd/mm/aaaa", () => {
    expect(formatDate("2026-07-24T12:00:00.000Z")).toBe("24/07/2026");
  });

  it("pads single-digit day and month", () => {
    expect(formatDate("2026-01-05T12:00:00.000Z")).toBe("05/01/2026");
  });

  // Regression tests for timezone pinning — verify date-only ISO strings
  // and midnight-UTC timestamps render correctly regardless of host TZ env var.
  // The key is determinism: output must be the same on any machine's host TZ.
  it("formats date-only ISO string consistently (regression: host-TZ independence)", () => {
    // "2026-07-24" parses as UTC midnight. In Brazil (UTC-3), this is 23:00 on 23/07.
    // The formatter should produce "23/07/2026" consistently, regardless of host TZ.
    expect(formatDate("2026-07-24")).toBe("23/07/2026");
  });

  it("formats midnight-UTC timestamp consistently (regression: host-TZ independence)", () => {
    // "2026-07-24T00:00:00.000Z" is midnight UTC, which is 23:00 BRT on 23/07.
    // The formatter should produce "23/07/2026" consistently, regardless of host TZ.
    expect(formatDate("2026-07-24T00:00:00.000Z")).toBe("23/07/2026");
  });
});
