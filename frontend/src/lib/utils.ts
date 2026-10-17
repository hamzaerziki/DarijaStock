import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Money helpers live in lib/money.ts; re-exported here for backward compatibility.
export { toCents, formatMoney, centsToMoney } from "./money";

export function formatQty(value: string | number | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value;
  if (n === null || n === undefined || Number.isNaN(n as number)) return "0";
  return (n as number).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return value;
  }
}
