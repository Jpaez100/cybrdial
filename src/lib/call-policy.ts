const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export function isDestinationAllowed(e164: string): boolean {
  if (!E164_PATTERN.test(e164)) {
    return false;
  }

  const allowedPrefixes = (process.env.ALLOWED_CALL_PREFIXES ?? "")
    .split(",")
    .map((prefix) => prefix.trim())
    .filter((prefix) => prefix.length > 0);

  return allowedPrefixes.some((prefix) => e164.startsWith(prefix));
}
