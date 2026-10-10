import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";
import { Spinner } from "./ui/button";

export function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  tone = "teal",
  loading,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "teal" | "amber" | "blue" | "green" | "navy";
  loading?: boolean;
}) {
  const tones: Record<string, string> = {
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    navy: "bg-slate-100 text-slate-800",
  };
  return (
    <Card className="flex items-start gap-4 p-4">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        {loading ? (
          <div className="mt-1 flex h-7 items-center">
            <Spinner className="h-5 w-5 text-slate-400" />
          </div>
        ) : (
          <p className="mt-0.5 truncate text-xl font-bold text-slate-900">{value}</p>
        )}
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </Card>
  );
}