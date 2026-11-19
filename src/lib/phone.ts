const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export function isE164PhoneNumber(value: string): boolean {
  return E164_PATTERN.test(value);
}

export function normalizeE164PhoneNumber(value: string): string | null {
  const normalized = value.trim().replace(/[\s().-]/g, "");
  return isE164PhoneNumber(normalized) ? normalized : null;
}
