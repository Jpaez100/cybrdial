const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export function isE164PhoneNumber(value: string): boolean {
  return E164_PATTERN.test(value);
}
