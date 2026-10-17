/**
 * Single source of truth for order status labels, tones and delivery-stage
 * mapping. The keys MUST match the backend `OrderStatus` enum exactly:
 *   new, needs_review, confirmed, reserved, preparing, fulfilled, cancelled
 * (verified against backend/app/models/order.py — there is NO "draft" or
 * "invoiced" order status).
 */

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusMeta {
  label: string;
  tone: Tone;
  /** Delivery-progress stage index, or null when the status is not a progress step (e.g. cancelled). */
  stage: number | null;
}

export const ORDER_STATUS: Record<string, StatusMeta> = {
  new: { label: "جديد", tone: "info", stage: 0 },
  needs_review: { label: "قيد المراجعة", tone: "warning", stage: 1 },
  confirmed: { label: "مأكد", tone: "info", stage: 2 },
  reserved: { label: "محجوز", tone: "info", stage: 2 },
  preparing: { label: "قيد التحضير", tone: "warning", stage: 3 },
  fulfilled: { label: "مسلّم", tone: "success", stage: 4 },
  cancelled: { label: "ملغى", tone: "danger", stage: null },
};

/** Statuses the Orders <select> filter offers (only values the backend can return). */
export const ORDER_STATUS_FILTERS = Object.keys(ORDER_STATUS);

export function statusMeta(s: string): StatusMeta {
  return ORDER_STATUS[s] ?? { label: s, tone: "neutral", stage: null };
}

export function statusLabel(s: string): string {
  return statusMeta(s).label;
}

/** Invoice statuses (backend Invoice.status enum): draft, issued, cancelled. */
export const INVOICE_STATUS: Record<string, StatusMeta> = {
  draft: { label: "مسودة", tone: "neutral", stage: null },
  issued: { label: "صادرة", tone: "success", stage: null },
  cancelled: { label: "ملغاة", tone: "danger", stage: null },
};

export function invoiceStatusMeta(s: string): StatusMeta {
  return INVOICE_STATUS[s] ?? { label: s, tone: "neutral", stage: null };
}

/** Order-line match statuses (backend OrderItem.match_status). */
export const MATCH_STATUS: Record<string, { label: string; tone: "green" | "amber" | "gray" }> = {
  matched: { label: "مطابق", tone: "green" },
  ambiguous: { label: "غامض", tone: "amber" },
  unmatched: { label: "غير مطابق", tone: "gray" },
};

export function matchStatusMeta(s: string) {
  return MATCH_STATUS[s] ?? { label: s, tone: "gray" as const };
}

/** Delivery-progress stages used by the public StatusTimeline (driven by StatusMeta.stage). */
export const DELIVERY_STAGES = [
  { label: "تسجل الطلب" },
  { label: "قيد المراجعة" },
  { label: "مأكد و محجوز" },
  { label: "قيد التحضير" },
  { label: "تم التسليم" },
];
