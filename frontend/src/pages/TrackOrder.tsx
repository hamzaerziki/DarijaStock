import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadges";
import { formatMoney, formatDate } from "@/lib/utils";
import { isValidPhone, normalizePhone } from "@/lib/validators";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { Search, Package, FileText, ArrowRight, ClipboardList } from "lucide-react";
import { PublicShell } from "@/components/public/PublicShell";
import { StatusTimeline } from "@/components/public/StatusTimeline";

type Item = {
  id: number;
  raw_text?: string | null;
  unit_code?: string | null;
  quantity: string;
  unit_price: string;
  line_total: string;
};

type Order = {
  id: number;
  order_number: string;
  status: string;
  source: string;
  customer?: { name: string; phone?: string | null } | null;
  subtotal: string;
  tax_total: string;
  total: string;
  currency: string;
  items: Item[];
  created_at?: string | null;
};

const NOT_FOUND = "ما لقيناش طلب بهاد الرقم ورقم الهاتف. تأكد من المعلومات وعاود المحاولة.";

export default function TrackOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { orderNumber?: string } | null)?.orderNumber || "";

  const [orderNumber, setOrderNumber] = useState(prefill);
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const { busy: loading, run } = useSubmitLock();

  async function search() {
    setErr("");
    setOrder(null);
    if (!orderNumber.trim() || !isValidPhone(phone)) {
      setErr("اكتب رقم الطلب ورقم هاتف صحيح باش نلقاو الطلب ديالك");
      return;
    }
    await run(async () => {
      try {
        const r = await api.post<Order>("/public/orders/track", {
          order_number: orderNumber.trim(),
          phone: normalizePhone(phone),
        });
        setOrder(r.data);
      } catch {
        // Single generic message: never echo backend text for a missing order.
        setErr(NOT_FOUND);
      }
    });
  }

  return (
    <PublicShell
      end={
        <Button variant="outline" size="sm" className="h-10 gap-2" onClick={() => navigate("/public/order")}>
          <ArrowRight className="h-4 w-4" aria-hidden /> طلب جديد
        </Button>
      }
    >
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">تبع الطلب ديالك</h1>
            <p className="text-xs text-slate-500">دخل رقم الطلب ورقم الهاتف باش تشوف واش توصل</p>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <FileText className="h-5 w-5 text-primary" aria-hidden /> معلومات الطلب
          </h2>
          <div className="grid gap-4">
            <div>
              <Label required htmlFor="tr-number">رقم الطلب</Label>
              <Input
                id="tr-number"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="مثال: CMD-202610-00001"
                className="code h-12 text-base"
                dir="ltr"
              />
            </div>
            <div>
              <Label required htmlFor="tr-phone">رقم الهاتف</Label>
              <Input
                id="tr-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="مثال: 0612345678"
                className="code h-12 text-base"
                inputMode="tel"
                dir="ltr"
              />
            </div>
            <div role="alert">{err && <FieldError>{err}</FieldError>}</div>
            <Button size="lg" className="h-12 w-full gap-2" loading={loading} disabled={loading} onClick={search}>
              <Search className="h-4 w-4" aria-hidden /> تبع الطلب
            </Button>
          </div>
        </section>

        {loading && <PageLoader />}

        {order && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Package className="h-5 w-5 text-primary" aria-hidden /> تفاصيل الطلب
              </h2>
              <StatusBadge status={order.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Box label="رقم الطلب">
                <span className="code tnum font-bold" dir="ltr">{order.order_number}</span>
              </Box>
              <Box label="المجموع النهائي">
                <span className="tnum font-bold">{formatMoney(order.total, order.currency || "MAD")}</span>
              </Box>
              <Box label="تاريخ الطلب">
                <span className="text-slate-700">{formatDate(order.created_at)}</span>
              </Box>
              {order.customer?.name && (
                <Box label="الزبون" wide>
                  <span className="font-medium">{order.customer.name}</span>
                </Box>
              )}
            </div>

            <div className="mt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">مسار الطلب</h3>
              <StatusTimeline status={order.status} />
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">المنتوجات</h3>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                {order.items.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-slate-500">ما كاين حتى منتوج فهاد الطلب.</p>
                ) : (
                  order.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{it.raw_text || "منتوج"}</p>
                        <p className="tnum mt-0.5 text-xs text-slate-500">
                          {it.quantity} {it.unit_code ? `× ${it.unit_code}` : ""} · {formatMoney(it.unit_price)}
                        </p>
                      </div>
                      <div className="tnum ms-3 shrink-0 font-semibold text-slate-900">{formatMoney(it.line_total, order.currency || "MAD")}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <Row label="المجموع الفرعي" value={formatMoney(order.subtotal, order.currency || "MAD")} />
                <Row label="الضريبة" value={formatMoney(order.tax_total, order.currency || "MAD")} />
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                  <span>المجموع النهائي</span>
                  <span className="tnum">{formatMoney(order.total, order.currency || "MAD")}</span>
                </div>
              </div>
            </div>

            <Button variant="outline" size="lg" className="mt-5 h-12 w-full gap-2" onClick={() => navigate("/public/order")}>
              <ArrowRight className="h-4 w-4" aria-hidden /> سيفط طلب جديد
            </Button>
          </section>
        )}
      </div>
    </PublicShell>
  );
}

function Box({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-lg bg-[#F7FAFC] p-3 ${wide ? "col-span-2 sm:col-span-3" : ""}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="tnum font-medium text-slate-900">{value}</span>
    </div>
  );
}
