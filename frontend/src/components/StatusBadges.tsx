import { Badge } from "@/components/ui/card";

export function OrderStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: "amber" | "teal" | "green" | "red" | "blue" | "gray" }> = {
    draft: { label: "مشروع", tone: "gray" },
    confirmed: { label: "مأكد / محجوز", tone: "amber" },
    fulfilled: { label: "مسلّم", tone: "green" },
    cancelled: { label: "ملغى", tone: "red" },
    invoiced: { label: "مفوتر", tone: "blue" },
  };
  const m = map[status] ?? { label: status, tone: "gray" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function InvoiceStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: "gray" | "green" | "red" }> = {
    draft: { label: "مسودة", tone: "gray" },
    issued: { label: "صادرة", tone: "green" },
    cancelled: { label: "ملغاة", tone: "red" },
  };
  const m = map[status] ?? { label: status, tone: "gray" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function FlagLabel({ label, tone = "amber" }: { label: string; tone?: "amber" | "red" | "blue" }) {
  return (
    <Badge tone={tone}>
      <span className="me-1" aria-hidden>
        ⚠
      </span>
      {label}
    </Badge>
  );
}