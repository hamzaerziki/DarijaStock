import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "warning" | "info";
type Toast = { id: number; message: string; tone: ToastTone };

const ToastContext = React.createContext<{
  push: (message: string, tone?: ToastTone) => void;
}>({ push: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const push = React.useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" role="region" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-dropdown animate-slide-in",
              t.tone === "success" && "border-[#BFE9DB] bg-success-soft text-success-text",
              t.tone === "error" && "border-[#F6CFCF] bg-danger-soft text-danger-text",
              t.tone === "warning" && "border-[#F3E0B5] bg-warning-soft text-warning-text",
              t.tone === "info" && "border-[#CFE0FB] bg-info-soft text-info-text"
            )}
          >
            {t.tone === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            {t.tone === "error" && <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {t.tone === "warning" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            {t.tone === "info" && <Info className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="rounded opacity-60 transition-opacity hover:opacity-100"
              aria-label="إغلاق الإشعار"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
