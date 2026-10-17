import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
  /** "primary" becomes the mobile card title; "badge" is shown top-end of the card. */
  priority?: "primary" | "badge" | "normal";
  align?: "start" | "end";
  /** Right/left-align + tabular figures for numeric columns. */
  tabular?: boolean;
  className?: string;
};

/**
 * Responsive table: a real `<table>` from `md` up, and a stacked card per row
 * below `md`. Same data, same actions — no column is ever hidden on mobile.
 */
export function DataTable<T>({
  columns,
  items,
  rowKey,
  rowActions,
  onRowClick,
  highlightId,
  rowClassName,
  empty,
}: {
  columns: Column<T>[];
  items: T[];
  rowKey: (item: T) => string | number;
  rowActions?: (item: T) => ReactNode;
  onRowClick?: (item: T) => void;
  highlightId?: string | null;
  rowClassName?: (item: T) => string | undefined;
  empty?: ReactNode;
}) {
  if (items.length === 0 && empty) return <>{empty}</>;

  const alignCls = (c: Column<T>) =>
    cn(c.align === "end" && "text-end", c.tabular && "tnum", c.className);

  const hl = (id: string | number) => (highlightId != null && String(id) === String(highlightId) ? "bg-primary-soft" : "");

  return (
    <>
      {/* Desktop / tablet: real table */}
      <div className="table-wrap hidden md:block">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={alignCls(c)}>
                  {c.header}
                </th>
              ))}
              {rowActions && <th className="text-end">أفعال</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const id = rowKey(item);
              return (
                <tr
                  key={id}
                  data-row-id={String(id)}
                  className={cn(onRowClick && "cursor-pointer", hl(id), rowClassName?.(item))}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={alignCls(c)}>
                      {c.cell(item)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="text-end" onClick={(e) => e.stopPropagation()}>
                      {rowActions(item)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per row */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {items.map((item) => {
          const id = rowKey(item);
          const primary = columns.find((c) => c.priority === "primary");
          const badge = columns.find((c) => c.priority === "badge");
          const rest = columns.filter((c) => c !== primary && c !== badge);
          return (
            <li
              key={id}
              data-row-id={String(id)}
              className={cn("p-4", onRowClick && "cursor-pointer", hl(id), rowClassName?.(item))}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">{primary?.cell(item)}</div>
                {badge && <div className="shrink-0">{badge.cell(item)}</div>}
              </div>

              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                {rest.map((c) => (
                  <div key={c.key} className="flex items-baseline justify-between gap-2">
                    <dt className="text-xs text-slate-500">{c.header}</dt>
                    <dd className={cn("min-w-0 truncate text-end font-medium text-slate-900", c.tabular && "tnum")}>
                      {c.cell(item)}
                    </dd>
                  </div>
                ))}
              </dl>

              {rowActions && (
                <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  {rowActions(item)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
