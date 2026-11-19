type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const entries = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL_MS = 60 * 1000;

export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = entries.get(key);
  if (!entry || entry.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

// Este limitador en memoria solo protege una instancia.
// En producción multiinstancia reemplazar por Redis/Upstash con la misma interfaz.
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) {
        entries.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();
}
