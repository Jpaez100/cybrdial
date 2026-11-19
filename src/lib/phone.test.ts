import { describe, expect, it } from "vitest";
import { isE164PhoneNumber, normalizeE164PhoneNumber } from "./phone";

describe("phone helpers", () => {
  it("valida formato E.164", () => {
    expect(isE164PhoneNumber("+14155552671")).toBe(true);
    expect(isE164PhoneNumber("4155552671")).toBe(false);
  });

  it("normaliza separadores comunes", () => {
    expect(normalizeE164PhoneNumber("+1 (415) 555-2671")).toBe("+14155552671");
    expect(normalizeE164PhoneNumber("4155552671")).toBeNull();
  });
});
