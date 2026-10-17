import type { ReactNode } from "react";
import { Store } from "lucide-react";

export function PublicShell({ children, end }: { children: ReactNode; end?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-3 sm:px-4 lg:px-6">
          <a href="/public/order" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <Store className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-base font-bold text-slate-900">DarijaStock</span>
              <span className="text-[11px] text-slate-500">طلب من الدار</span>
            </span>
          </a>
          <div className="ms-auto flex items-center gap-2">{end}</div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
        {children}
      </div>
    </div>
  );
}
