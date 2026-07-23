import { describe, expect, it } from "vitest";
import {
  clampDay,
  closingDate,
  dueDate,
  faturaPeriodo,
  saoPauloYMD,
} from "./dates.js";

describe("clampDay", () => {
  it("returns the day unchanged when it fits in the month", () => {
    expect(clampDay(2026, 7, 10)).toBe(10);
  });

  it("clamps day 31 in February of a non-leap year to 28", () => {
    expect(clampDay(2026, 2, 31)).toBe(28);
  });

  it("clamps day 31 in February of a leap year to 29", () => {
    expect(clampDay(2024, 2, 31)).toBe(29);
  });

  it("clamps day 30 in February to the last day of February", () => {
    expect(clampDay(2026, 2, 30)).toBe(28);
  });

  it("does not clamp day 30 in a 30-day month", () => {
    expect(clampDay(2026, 4, 30)).toBe(30);
  });
});

describe("closingDate", () => {
  it("falls on the last day of February when closingDay=31 in a non-leap year (never skips the month)", () => {
    const card = { id: "c1", closingDay: 31, dueDay: 10, isActive: true };
    const closing = closingDate(card, 2026, 2);
    expect(closing.getUTCFullYear()).toBe(2026);
    expect(closing.getUTCMonth()).toBe(1); // 0-indexed: February
    expect(closing.getUTCDate()).toBe(28);
  });

  it("falls on Feb 29 in a leap year for closingDay=31", () => {
    const card = { id: "c1", closingDay: 31, dueDay: 10, isActive: true };
    const closing = closingDate(card, 2024, 2);
    expect(closing.getUTCDate()).toBe(29);
  });
});

describe("dueDate", () => {
  it("falls in the same month when dueDay > closingDay", () => {
    const card = { id: "c1", closingDay: 5, dueDay: 15, isActive: true };
    const due = dueDate(card, 2026, 7);
    expect(due.getUTCFullYear()).toBe(2026);
    expect(due.getUTCMonth()).toBe(6); // July
    expect(due.getUTCDate()).toBe(15);
  });

  it("falls in the next month when dueDay <= closingDay", () => {
    const card = { id: "c1", closingDay: 25, dueDay: 10, isActive: true };
    const due = dueDate(card, 2026, 7);
    expect(due.getUTCFullYear()).toBe(2026);
    expect(due.getUTCMonth()).toBe(7); // August
    expect(due.getUTCDate()).toBe(10);
  });

  it("clamps the due day too (dueDay=31 in a 30-day month)", () => {
    const card = { id: "c1", closingDay: 1, dueDay: 31, isActive: true };
    const due = dueDate(card, 2026, 4); // closing April 1st -> due falls in April (31>1, same month)
    expect(due.getUTCMonth()).toBe(3); // April
    expect(due.getUTCDate()).toBe(30); // April has 30 days
  });
});

describe("faturaPeriodo", () => {
  it("is a half-open interval (previousClosing, closing]", () => {
    const card = { id: "c1", closingDay: 10, dueDay: 20, isActive: true };
    const period = faturaPeriodo(card, 2026, 7);
    expect(period.start.getUTCMonth()).toBe(5); // June
    expect(period.start.getUTCDate()).toBe(10);
    expect(period.end.getUTCMonth()).toBe(6); // July
    expect(period.end.getUTCDate()).toBe(10);
  });

  it("never skips a month when closing day is 31 and previous month is February", () => {
    const card = { id: "c1", closingDay: 31, dueDay: 10, isActive: true };
    const period = faturaPeriodo(card, 2026, 3); // period ending in March
    expect(period.start.getUTCMonth()).toBe(1); // February
    expect(period.start.getUTCDate()).toBe(28); // clamped, non-leap
    expect(period.end.getUTCMonth()).toBe(2); // March
    expect(period.end.getUTCDate()).toBe(31);
  });
});

describe("saoPauloYMD", () => {
  it("extracts the calendar date in America/Sao_Paulo for a UTC instant", () => {
    // 2026-07-10T02:30:00Z is 2026-07-09 23:30 in America/Sao_Paulo (UTC-3, no DST since 2019)
    const parts = saoPauloYMD(new Date("2026-07-10T02:30:00.000Z"));
    expect(parts).toEqual({ year: 2026, month: 7, day: 9 });
  });

  it("extracts the calendar date when the instant is already well into the Sao Paulo day", () => {
    const parts = saoPauloYMD(new Date("2026-07-10T15:00:00.000Z"));
    expect(parts).toEqual({ year: 2026, month: 7, day: 10 });
  });
});
