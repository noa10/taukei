/**
 * Normalize a Malaysian phone number to E.164 format.
 */
export function normalizeMalaysianPhone(raw: string): string | null {
  if (!raw) return null;

  const stripped = raw.replace(/[^\d+]/g, "");

  if (/^\+60\d{8,11}$/.test(stripped)) {
    return stripped;
  }

  if (/^60\d{8,11}$/.test(stripped)) {
    return `+${stripped}`;
  }

  if (/^0\d{8,10}$/.test(stripped)) {
    return `+60${stripped.slice(1)}`;
  }

  return null;
}

export function isValidMalaysianPhone(phone: string): boolean {
  return /^\+60\d{8,11}$/.test(phone);
}
