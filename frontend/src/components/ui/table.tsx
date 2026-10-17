import { ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";
import { Button } from "./button";

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] text-slate-500">
      <span>
        صفحة {page} من {pages} — {total} سطر
      </span>
      <div className="flex gap-1.5">
        <Button variant="outline" size="icon" className="h-9 w-9" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="الصفحة السابقة">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="الصفحة التالية">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <PackageOpen className="h-6 w-6" />
      </div>
      <p className="font-semibold text-slate-600">{title}</p>
      {hint && <p className="max-w-xs text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
    </div>
  );
}
