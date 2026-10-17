import { Check, Clock, Package, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DELIVERY_STAGES, statusMeta, statusLabel } from "@/lib/status";

export { statusLabel };

// Icons aligned by index with DELIVERY_STAGES (see lib/status.ts).
const ICONS = [Check, Clock, ShieldCheck, Package, CheckCircle2];

export function StatusTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3">
        <XCircle className="h-6 w-6 shrink-0 text-danger" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-slate-900">الطلب ملغي</p>
          <p className="text-xs text-slate-500">تواصلي معنا إذا عندك شي سؤال.</p>
        </div>
      </div>
    );
  }

  // Unknown status: don't pretend progress.
  const current = statusMeta(status).stage;
  if (current === null) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        الحالة الحالية: <span className="font-semibold">{statusLabel(status)}</span>
      </div>
    );
  }

  return (
    <ol className="flex flex-col">
      {DELIVERY_STAGES.map((stage, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        const Icon = ICONS[i] ?? Package;
        return (
          <li key={stage.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  isDone && "bg-primary text-white",
                  isCurrent && "bg-primary/10 text-primary ring-2 ring-primary",
                  !isDone && !isCurrent && "bg-white text-slate-400 ring-1 ring-slate-200",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {i < DELIVERY_STAGES.length - 1 && (
                <span className={cn("my-1 min-h-4 w-px flex-1", isDone ? "bg-primary" : "bg-slate-200")} aria-hidden />
              )}
            </div>
            <div className="pb-4">
              <p className={cn("text-sm", isCurrent ? "font-semibold text-slate-900" : "text-slate-500")}>
                {stage.label}
              </p>
              {isCurrent && <p className="mt-0.5 text-xs text-primary">الحالة ديال الطلب دابا</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
