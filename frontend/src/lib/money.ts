/**
 * Money helpers. The backend returns decimals as strings — never use parseFloat
 * for arithmetic. All math is done on integer cents.
 */

/** Convert "125.50" | 125.5 | null | undefined -> integer cents. Safe for display math. */
export function toCents(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return 0;
  const neg = s.startsWith("-");
  const [int, frac = ""] = s.replace("-", "").split(".");
  const cents = Number(int) * 100 + Number((frac + "00").slice(0, 2));
  return neg ? -cents : cents;
}

/** Format a money value for display, e.g. "1 234,50 MAD" (fr-FR style, matching existing UI). */
export function formatMoney(v: string | number | null | undefined, currency = "MAD"): string {
  const cents = toCents(v);
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const int = Math.floor(abs / 100).toLocaleString("fr-FR");
  const frac = String(abs % 100).padStart(2, "0");
  return `${neg ? "-" : ""}${int},${frac} ${currency}`;
}

/** Format integer cents back into a money string. */
export function centsToMoney(cents: number, currency = "MAD"): string {
  return formatMoney(cents / 100, currency);
}
