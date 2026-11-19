import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite hasta el límite y devuelve reintento", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const key = `test-${Date.now()}-limit`;
    expect(rateLimit({ key, limit: 2, windowMs: 1000 }).ok).toBe(true);
    expect(rateLimit({ key, limit: 2, windowMs: 1000 }).ok).toBe(true);
    const blocked = rateLimit({ key, limit: 2, windowMs: 1000 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("extrae la primera IP reenviada", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("203.0.113.10");
  });
});
