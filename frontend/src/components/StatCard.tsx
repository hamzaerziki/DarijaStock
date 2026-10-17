import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
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
  to,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "teal" | "amber" | "blue" | "green" | "navy";
  loading?: boolean;
  /** When set, the card becomes a link to this path. */
  to?: string;
}) {
  const tones: Record<string, string> = {
    teal: "bg-primary-soft text-primary",
    amber: "bg-warning-soft text-warning-text",
    blue: "bg-info-soft text-info-text",
    green: "bg-success-soft text-success-text",
    navy: "bg-slate-100 text-slate-700",
  };
  const body = (
    <>
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="h-[22px] w-[22px]" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-500">{title}</p>
        {loading ? (
          <div className="mt-1.5 flex h-8 items-center">
            <Spinner className="h-5 w-5 text-slate-400" />
          </div>
        ) : (
          <p className="mt-1 truncate text-[26px] font-bold leading-tight text-slate-900 tnum">{value}</p>
        )}
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </>
  );

  const base = "flex items-center gap-4 p-5 transition-shadow";
  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          base,
          "rounded-xl border border-slate-200 bg-white shadow-card hover:shadow-card-hover",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        )}
      >
        {body}
      </Link>
    );
  }
  return <Card className={cn(base, "hover:shadow-card-hover")}>{body}</Card>;
}
