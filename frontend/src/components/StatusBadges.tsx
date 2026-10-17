import { Badge } from "@/components/ui/card";
import { statusMeta, invoiceStatusMeta, matchStatusMeta, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, Info, Clock, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Map semantic tones to Badge tones + an icon (text + icon, never colour alone). */
const TONE_BADGE: Record<Tone, { tone: "green" | "amber" | "red" | "blue" | "gray" | "teal"; Icon: LucideIcon }> = {
  success: { tone: "green", Icon: CheckCircle2 },
  warning: { tone: "amber", Icon: AlertTriangle },
  danger: { tone: "red", Icon: XCircle },
  info: { tone: "blue", Icon: Info },
  neutral: { tone: "gray", Icon: Clock },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status);
  const { tone, Icon } = TONE_BADGE[meta.tone];
  return (
    <Badge tone={tone}>
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const meta = invoiceStatusMeta(status);
  const { tone, Icon } = TONE_BADGE[meta.tone];
  return (
    <Badge tone={tone}>
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function MatchStatusBadge({ status }: { status: string }) {
  const meta = matchStatusMeta(status);
  return (
    <Badge tone={meta.tone}>
      {meta.tone === "gray" ? <HelpCircle className="h-3 w-3" aria-hidden /> : null}
      {meta.label}
    </Badge>
  );
}

/** Back-compat aliases so existing imports keep working. */
export const OrderStatus = StatusBadge;
export const InvoiceStatus = InvoiceStatusBadge;

export function FlagLabel({ label, tone = "amber" }: { label: string; tone?: "amber" | "red" | "blue" }) {
  return (
    <Badge tone={tone === "amber" ? "amber" : tone === "red" ? "red" : "blue"}>
      <AlertTriangle className="h-3 w-3" aria-hidden />
      {label}
    </Badge>
  );
}

/** Small "coming soon" chip for placeholder actions. */
export function ComingSoon({ className }: { className?: string }) {
  return (
    <Badge tone="gray" className={cn("align-middle", className)}>
      قريبا
    </Badge>
  );
}
