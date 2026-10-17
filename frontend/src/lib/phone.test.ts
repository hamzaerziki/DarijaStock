import { describe, it, expect } from "vitest";
import { normalizePhone, isValidPhone } from "./validators";

describe("normalizePhone", () => {
  it("strips spaces and dashes", () => {
    expect(normalizePhone("06 12-34.56 78")).toBe("0612345678");
  });
  it("converts +212 to leading 0", () => {
    expect(normalizePhone("+212612345678")).toBe("0612345678");
    expect(normalizePhone("+212 6 12 34 56 78")).toBe("0612345678");
  });
  it("converts 00212 to leading 0", () => {
    expect(normalizePhone("00212612345678")).toBe("0612345678");
  });
});

describe("isValidPhone", () => {
  it("accepts valid Moroccan mobiles", () => {
    expect(isValidPhone("0612345678")).toBe(true);
    expect(isValidPhone("+212612345678")).toBe(true);
    expect(isValidPhone("0712345678")).toBe(true);
  });
  it("rejects invalid numbers", () => {
    expect(isValidPhone("0412345678")).toBe(false); // 04 not allowed by rule 0[5-7]
    expect(isValidPhone("061234567")).toBe(false); // too short
    expect(isValidPhone("06123456789")).toBe(false); // too long
    expect(isValidPhone("")).toBe(false);
  });
});
