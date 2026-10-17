import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantitySelector({
  value,
  onChange,
  name,
}: {
  value: number;
  onChange: (next: number) => void;
  name: string;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[#CFE3E0] bg-white p-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label={`نقص من ${name}`}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-[#EFFAF7] hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span
        className="w-10 text-center text-sm font-bold text-slate-900 tnum"
        aria-live="polite"
        aria-label={`الكمية ديال ${name}`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={`زيد من ${name}`}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-[#EFFAF7] hover:text-primary"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
