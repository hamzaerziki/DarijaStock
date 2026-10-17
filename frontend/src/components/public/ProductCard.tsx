import { ImageOff } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { QuantitySelector } from "./QuantitySelector";
import { productLabel, type PublicProduct } from "./types";

export function ProductCard({
  product,
  qty,
  onQty,
}: {
  product: PublicProduct;
  qty: number;
  onQty: (next: number) => void;
}) {
  const selected = qty > 0;
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-white shadow-card transition-colors",
        selected ? "border-primary ring-2 ring-primary/20" : "border-slate-200",
      )}
    >
      <div className="relative flex h-36 w-full items-center justify-center bg-[#F7FAFC] sm:h-40">
        {product.category && (
          <span className="absolute start-2 top-2 inline-flex items-center rounded-full bg-[#DDF5F0] px-2.5 py-0.5 text-xs font-medium text-primary">
            {product.category}
          </span>
        )}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={productLabel(product)}
            loading="lazy"
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-slate-300">
            <ImageOff className="h-7 w-7" aria-hidden />
            <span className="text-[11px] text-slate-400">بلا صورة</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold text-slate-900" dir="rtl">
            {productLabel(product)}
          </p>
          {product.name_fr && product.name_fr !== productLabel(product) && (
            <p className="mt-1 truncate text-xs text-slate-500 code" dir="ltr">
              {product.name_fr}
            </p>
          )}
          <p className="mt-2 text-[17px] font-semibold text-primary tnum">
            {formatMoney(product.price)}
            <span className="ms-1 text-xs font-normal text-slate-500">/ {product.base_unit}</span>
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          {selected ? (
            <QuantitySelector value={qty} onChange={onQty} name={productLabel(product)} />
          ) : (
            <button
              type="button"
              onClick={() => onQty(1)}
              className="h-10 flex-1 rounded-lg bg-primary text-sm font-semibold text-white transition-colors hover:bg-[#096B63] active:bg-[#07574F]"
            >
              زيد للسلة
            </button>
          )}
          {selected && <span className="text-xs text-slate-500 tnum">× {qty}</span>}
        </div>
      </div>
    </div>
  );
}
