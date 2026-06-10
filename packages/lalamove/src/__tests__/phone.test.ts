import { expect, test, describe } from "bun:test";
import { normalizeMalaysianPhone, isValidMalaysianPhone } from "../phone";

describe("phone", () => {
  test("normalizes Malaysian phone formats to E.164", () => {
    expect(normalizeMalaysianPhone("0123456789")).toBe("+60123456789");
    expect(normalizeMalaysianPhone("012-345 6789")).toBe("+60123456789");
    expect(normalizeMalaysianPhone("60123456789")).toBe("+60123456789");
    expect(normalizeMalaysianPhone("+60123456789")).toBe("+60123456789");
  });

  test("returns null for invalid numbers", () => {
    expect(normalizeMalaysianPhone("")).toBeNull();
    expect(normalizeMalaysianPhone("123")).toBeNull();
    expect(normalizeMalaysianPhone("+6512345678")).toBeNull();
  });

  test("isValidMalaysianPhone validates E.164 format", () => {
    expect(isValidMalaysianPhone("+60123456789")).toBe(true);
    expect(isValidMalaysianPhone("0123456789")).toBe(false);
    expect(isValidMalaysianPhone("+65123456789")).toBe(false);
  });
});
