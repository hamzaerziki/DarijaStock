import { cn } from "@/lib/utils";

export type ProgressStep = { id: string; label: string };

export function OrderProgress({ steps, currentIndex }: { steps: ProgressStep[]; currentIndex: number }) {
  return (
    <>
      {/* Desktop: horizontal numbered steps */}
      <ol className="hidden items-center sm:flex" aria-label="مراحل الطلب">
        {steps.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <li key={step.id} className="flex items-center">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tnum transition-colors",
                    isDone && "bg-primary text-white",
                    isCurrent && "bg-primary/10 text-primary ring-2 ring-primary",
                    !isDone && !isCurrent && "bg-white text-slate-400 ring-1 ring-slate-200",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    isCurrent ? "font-semibold text-slate-900" : "text-slate-500",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span
                  className={cn(
                    "mx-3 h-px flex-1 min-w-6 transition-colors",
                    isDone ? "bg-primary" : "bg-slate-200",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact counter + progress bar */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-900">{steps[currentIndex]?.label}</span>
          <span className="text-xs text-slate-500 tnum">
            الخطوة {currentIndex + 1} من {steps.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            aria-hidden
          />
        </div>
      </div>
    </>
  );
}
