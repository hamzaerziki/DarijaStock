import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { PageLoader, EmptyState } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { OrderStatus } from "@/components/StatusBadges";
import { formatMoney, formatQty, formatDate } from "@/lib/utils";
import { CheckCircle2, Truck, XCircle, FileText, ArrowRight, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type OrderItem = {
  id: number; product_id?: number; raw_text?: string; unit_code?: string;
  quantity: string; quantity_base: string; unit_price: string; tax_rate: string;
  discount: string; line_total: string; match_status: string; note?: string;
};
type Order = {
  id: number; order_number: string; status: string; source: string;
  customer?: { id: number; code: string; name: string; phone?: string };
  warehouse_id?: number; subtotal: string; discount_total: string; tax_total: string;
  total: string; currency: string; customer_note?: string; internal_note?: string;
  items: OrderItem[]; created_at?: string;
};
type HistoryRow = { id: number; from_status?: string; to_status: string; note?: string; created_at?: string };

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | { type: "confirm" | "fulfill" | "cancel"; title: string; message: string }>(null);

  const perms = user?.permissions ?? [];
  const isAdmin = user?.role === "admin";
  const can = (p: string) => isAdmin || perms.includes(p);

  async function load() {
    setLoading(true);
    try {
      const [o, h] = await Promise.all([
        api.get<Order>(`/orders/${id}`),
        api.get<HistoryRow[]>(`/orders/${id}/history`),
      ]);
      setOrder(o.data);
      setHistory(h.data);
    } catch (e) {
      push(apiError(e), "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [id]);

  async function doAction(type: "confirm" | "fulfill" | "cancel") {
    if (!order) return;
    setBusy(true);
    try {
      await api.post(`/orders/${order.id}/${type}`, {});
      push(
        type === "confirm" ? "تم التأكيد والحجز" : type === "fulfill" ? "تم التسليم من المخزن" : "تم الإلغاء",
        "success"
      );
      setConfirmAction(null);
      load();
    } catch (e) {
      push(apiError(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function createInvoice() {
    if (!order) return;
    setBusy(true);
    try {
      const inv = await api.post(`/invoices/from-order/${order.id}`);
      push("تم إنشاء مسودة الفاتورة", "success");
      navigate(`/invoices?highlight=${inv.data.id}`);
    } catch (e) {
      push(apiError(e), "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoader />;
  if (!order) return <EmptyState title="الكوموند ماموجوداش" />;

  return (
    <>
      <PageHeader
        title={`كوموند ${order.order_number}`}
        subtitle={`المصدر: ${order.source} — ${formatDate(order.created_at)}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/orders")}>
            <ArrowRight className="h-4 w-4" /> رجوع
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>العناصر</CardTitle>
              <OrderStatus status={order.status} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="table-wrap border-0">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>المنتج / النص</th>
                      <th>الوحدة</th>
                      <th className="text-left">الكمية</th>
                      <th className="text-left">الثمن</th>
                      <th className="text-left">المجموع</th>
                      <th>المطابقة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((it) => (
                      <tr key={it.id}>
                        <td className="max-w-xs truncate">{it.raw_text || `#${it.product_id}`}</td>
                        <td>{it.unit_code || "—"}</td>
                        <td className="text-left">{formatQty(it.quantity)}</td>
                        <td className="text-left">{formatMoney(it.unit_price)}</td>
                        <td className="text-left font-medium">{formatMoney(it.line_total)}</td>
                        <td>
                          <Badge tone={it.match_status === "matched" ? "green" : it.match_status === "ambiguous" ? "amber" : "gray"}>
                            {it.match_status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1 border-t border-slate-100 p-4 text-sm">
                <Row label="المجموع الفرعي" value={formatMoney(order.subtotal)} />
                <Row label="الخصم" value={formatMoney(order.discount_total)} />
                <Row label="الضريبة" value={formatMoney(order.tax_total)} />
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                  <span>المجموع</span>
                  <span>{formatMoney(order.total, order.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {(order.customer_note || order.internal_note) && (
            <Card>
              <CardHeader><CardTitle>ملاحظات</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                {order.customer_note && <p><span className="font-medium text-slate-800">ملاحظة الزبون: </span>{order.customer_note}</p>}
                {order.internal_note && <p><span className="font-medium text-slate-800">ملاحظة داخلية: </span>{order.internal_note}</p>}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>الزبون</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm text-slate-600">
              <p className="text-base font-semibold text-slate-900">{order.customer?.name || "— بدون زبون —"}</p>
              {order.customer?.code && <p className="code">كود: {order.customer.code}</p>}
              {order.customer?.phone && <p className="code">هاتف: {order.customer.phone}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>أفعال</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {order.status === "draft" && can("approve_orders") && (
                <Button onClick={() => setConfirmAction({ type: "confirm", title: "تأكيد الكوموند", message: "غادي يتحجز الستوك للكوموند. متأكد؟" })} disabled={busy}>
                  <CheckCircle2 className="h-4 w-4" /> تأكيد و حجز الستوك
                </Button>
              )}
              {(order.status === "confirmed" || order.status === "preparing") && can("dispatch_stock") && (
                <Button variant="navy" onClick={() => setConfirmAction({ type: "fulfill", title: "تسليم الكوموند", message: "غادي يخرج الستوك من المخزن. متأكد؟" })} disabled={busy}>
                  <Truck className="h-4 w-4" /> تسليم
                </Button>
              )}
              {(order.status === "confirmed" || order.status === "fulfilled" || order.status === "invoiced") && can("prepare_invoice_drafts") && (
                <Button variant="outline" onClick={createInvoice} disabled={busy}>
                  <FileText className="h-4 w-4" /> إنشاء مسودة فاتورة
                </Button>
              )}
              {order.status !== "fulfilled" && order.status !== "cancelled" && can("reject_orders") && (
                <Button variant="destructive" onClick={() => setConfirmAction({ type: "cancel", title: "إلغاء الكوموند", message: "غادي يتحرر الستوك المحجوز. متأكد؟" })} disabled={busy}>
                  <XCircle className="h-4 w-4" /> إلغاء
                </Button>
              )}
              {order.status === "draft" && !can("approve_orders") && (
                <p className="text-xs text-slate-400">ما عندكش صلاحية التأكيد.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> سجل الحالات</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {history.length === 0 ? <p className="text-sm text-slate-400">ما كاينش</p> : history.map((h) => (
                <div key={h.id} className="flex items-start gap-2 text-xs">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                  <div>
                    <p className="text-slate-700">
                      {h.from_status ? `${h.from_status} → ` : ""}<span className="font-medium">{h.to_status}</span>
                    </p>
                    <p className="text-slate-400">{formatDate(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && doAction(confirmAction.type)}
        title={confirmAction?.title ?? ""}
        message={confirmAction?.message ?? ""}
        loading={busy}
        destructive={confirmAction?.type === "cancel"}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}