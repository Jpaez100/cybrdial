import { afterEach, describe, expect, it } from "vitest";
import { isDestinationAllowed } from "./call-policy";

describe("isDestinationAllowed", () => {
  afterEach(() => {
    delete process.env.ALLOWED_CALL_PREFIXES;
  });

  it("rechaza todos los destinos si no hay prefijos", () => {
    process.env.ALLOWED_CALL_PREFIXES = "";
    expect(isDestinationAllowed("+14155552671")).toBe(false);
  });

  it("permite destinos por prefijo E.164 configurado", () => {
    process.env.ALLOWED_CALL_PREFIXES = "+1, +57";
    expect(isDestinationAllowed("+14155552671")).toBe(true);
    expect(isDestinationAllowed("+573001234567")).toBe(true);
    expect(isDestinationAllowed("+442071838750")).toBe(false);
  });
});
