/** Single source of truth for human-readable labels of backend enums. */

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدير النظام",
  order_operator: "عامل الكوموندات",
  stock_manager: "مسؤول الستوك",
  order_approver: "مصادق الكوموندات",
  invoice_operator: "عامل الفوترة",
  read_only: "قراءة فقط",
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "كل الصلاحيات، بما فيها تدبير المستخدمين.",
  order_operator: "إنشاء و تدقيق الكوموندات.",
  stock_manager: "متابعة الستوك و الحركات.",
  order_approver: "تأكيد الكوموندات و حجز الستوك.",
  invoice_operator: "إنشاء و إصدار الفواتير.",
  read_only: "قراءة فقط بدون أي تعديل.",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

/** Stock movement types (backend movement.type). Fallback to raw value. */
export const MOVEMENT_LABELS: Record<string, string> = {
  purchase: "شراء",
  sale: "بيع",
  sale_return: "مرتجع بيع",
  purchase_return: "مرتجع شراء",
  adjustment: "تسوية",
  reservation: "حجز",
  release: "تحرير",
  dispatch: "إخراج",
  transfer: "تحويل",
  initial: "رصيد افتتاحي",
};

export function movementLabel(type: string): string {
  return MOVEMENT_LABELS[type] ?? type;
}

/** Audit-log action labels (backend audit.action). Fallback to raw value. */
export const AUDIT_LABELS: Record<string, string> = {
  "order.created": "إنشاء كوموند",
  "order.confirmed": "تأكيد كوموند",
  "order.fulfilled": "تسليم كوموند",
  "order.cancelled": "إلغاء كوموند",
  "order.updated": "تعديل كوموند",
  "invoice.drafted": "إنشاء مسودة فاتورة",
  "invoice.issued": "إصدار فاتورة",
  "invoice.cancelled": "إلغاء فاتورة",
  "import.processed": "معالجة استيراد",
  "user.created": "إنشاء مستخدم",
  "user.updated": "تعديل مستخدم",
  "login": "تسجيل دخول",
};

export function auditLabel(action: string): string {
  return AUDIT_LABELS[action] ?? action;
}
