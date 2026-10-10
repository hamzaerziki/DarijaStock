import * as React from "react";
import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
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
      <div className="fixed bottom-4 left-4 z-[60] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg animate-slide-in",
              t.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
              t.tone === "error" && "border-red-200 bg-red-50 text-red-800",
              t.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
              t.tone === "info" && "border-slate-200 bg-white text-slate-700"
            )}
          >
            {t.tone === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
            {t.tone === "error" && <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {t.tone === "warning" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="opacity-60 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
