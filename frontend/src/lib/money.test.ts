import { describe, it, expect } from "vitest";
import { toCents, formatMoney, centsToMoney } from "./money";

describe("toCents", () => {
  it("parses decimal strings without float error", () => {
    expect(toCents("0.10")).toBe(10);
    expect(toCents("19.99")).toBe(1999);
    expect(toCents("1234.5")).toBe(123450);
  });
  it("handles numbers", () => {
    expect(toCents(12.34)).toBe(1234);
  });
  it("treats empty/null/invalid as 0", () => {
    expect(toCents("")).toBe(0);
    expect(toCents(null)).toBe(0);
    expect(toCents(undefined)).toBe(0);
    expect(toCents("abc")).toBe(0);
  });
  it("handles negatives", () => {
    expect(toCents("-5.5")).toBe(-550);
  });
  it("rounds to 2 decimals of a string", () => {
    expect(toCents("1.005")).toBe(100);
  });
});

describe("formatMoney", () => {
  it("formats strings safely", () => {
    // fr-FR groups thousands with a narrow no-break space (U+202F).
    expect(formatMoney("1234.5")).toBe("1\u202f234,50 MAD");
    expect(formatMoney("0")).toBe("0,00 MAD");
  });
  it("does not throw on garbage", () => {
    expect(formatMoney("not-a-number")).toBe("0,00 MAD");
  });
  it("appends custom currency", () => {
    expect(formatMoney(12, "USD")).toBe("12,00 USD");
  });
});

describe("centsToMoney", () => {
  it("round-trips", () => {
    expect(centsToMoney(1999)).toBe("19,99 MAD");
  });
});
