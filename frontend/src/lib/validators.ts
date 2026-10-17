/** Input validation + normalisation helpers shared by the public flow and admin forms. */

/**
 * Normalise a Moroccan phone to the local `0XXXXXXXXX` form.
 * Strips spaces/dashes/dots and converts a leading +212 / 00212 to 0.
 */
export function normalizePhone(raw: string): string {
  let s = (raw || "").replace(/[\s\-().]/g, "");
  if (s.startsWith("+212")) s = "0" + s.slice(4);
  else if (s.startsWith("00212")) s = "0" + s.slice(5);
  return s;
}

/** Valid Moroccan mobile: 0 followed by 5/6/7 and 8 more digits (10 total). */
export function isValidPhone(raw: string): boolean {
  return /^0[5-7]\d{8}$/.test(normalizePhone(raw));
}

/** Split a textarea of WhatsApp messages on blank lines (same rule used on submit). */
export function splitMessages(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((m) => m.trim())
    .filter(Boolean);
}
