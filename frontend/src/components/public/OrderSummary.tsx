import { Trash2 } from "lucide-react";
import { formatMoney, toCents } from "@/lib/utils";
import { QuantitySelector } from "./QuantitySelector";
import { productLabel, type CartLine } from "./types";

export function OrderSummary({
  lines,
  editable = false,
  onQty,
  onRemove,
}: {
  lines: CartLine[];
  editable?: boolean;
  onQty?: (id: number, next: number) => void;
  onRemove?: (id: number) => void;
}) {
  const subtotalCents = lines.reduce((sum, l) => sum + toCents(l.price) * l.qty, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          المنتوجات المختارة{editable ? "" : ` (${itemCount})`}
        </h2>
        {editable && <span className="text-xs text-slate-500 tnum">{itemCount} عنصر</span>}
      </div>

      {lines.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          السلة خاوية. زيد منتوج على الأقل باش تكمل.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 px-4">
          {lines.map((l) => {
            const lineCents = toCents(l.price) * l.qty;
            return (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F7FAFC]">
                  {l.image_url ? (
                    <img src={l.image_url} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-[10px] text-slate-400">—</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{productLabel(l)}</p>
                  <p className="mt-0.5 text-xs text-slate-500 tnum">
                    {formatMoney(l.price)} / {l.base_unit}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {editable && onQty ? (
                    <QuantitySelector value={l.qty} onChange={(next) => onQty(l.id, next)} name={productLabel(l)} />
                  ) : (
                    <span className="rounded-md bg-[#F7FAFC] px-2 py-1 text-sm font-semibold text-slate-700 tnum">
                      × {l.qty}
                    </span>
                  )}
                  <span className="w-24 text-end text-sm font-semibold text-slate-900 tnum">
                    {formatMoney(lineCents / 100)}
                  </span>
                  {editable && onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(l.id)}
                      aria-label={`حيد ${productLabel(l)}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2 border-t border-slate-100 px-4 py-3 text-sm">
        <Row label="المجموع الفرعي" value={formatMoney(subtotalCents / 100)} />
        <Row label="التوصيل" value="يتحدد لاحقا" muted />
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
          <span>المجموع النهائي</span>
          <span className="tnum">{formatMoney(subtotalCents / 100)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={muted ? "text-slate-500" : "font-medium text-slate-900 tnum"}>{value}</span>
    </div>
  );
}
