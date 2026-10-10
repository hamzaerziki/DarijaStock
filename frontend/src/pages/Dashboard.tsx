import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageLoader } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ClipboardList, FileText, Boxes, AlertTriangle, Package, Users } from "lucide-react";
import { formatMoney } from "@/lib/utils";

type Movement = { id: number; type: string; physical_delta: string; product_name?: string; created_at?: string };
type LowStock = { product_id: number; name: string; sku: string; physical: string; reorder_threshold: string };
type Dash = {
  orders_by_status: Record<string, number>;
  orders_in_period: number;
  products_count: number;
  customers_count: number;
  invoices_by_status: Record<string, number>;
  invoices_issued_in_period: number;
  invoices_total_in_period: string;
  low_stock: LowStock[];
  recent_movements: Movement[];
};

export default function Dashboard() {
  const { push } = useToast();
  const [data, setData] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Dash>("/dashboard")
      .then((r) => setData(r.data))
      .catch((e) => push(apiError(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <EmptyState title="تعذر تحميل البيانات" />;

  const ordersTotal = Object.values(data.orders_by_status || {}).reduce((a, b) => a + b, 0);
  const invoicesTotal = Object.values(data.invoices_by_status || {}).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader title="لوحة القيادة" subtitle="نظرة عامة على النشاط" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="الكوموندات (30 يوم)" value={String(data.orders_in_period)} sub={`الإجمالي: ${ordersTotal}`} icon={ClipboardList} tone="teal" />
        <StatCard title="الفواتير الصادرة" value={String(data.invoices_by_status?.issued ?? 0)} sub={`الإجمالي: ${invoicesTotal}`} icon={FileText} tone="blue" />
        <StatCard title="مدخول الفواتير (30 يوم)" value={formatMoney(data.invoices_total_in_period)} icon={Boxes} tone="green" />
        <StatCard title="منتجات تحت العتبة" value={String(data.low_stock?.length ?? 0)} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> إحصائيات عامة</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">المنتجات النشيطة</p><p className="text-xl font-bold">{data.products_count}</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">الزبائن</p><p className="text-xl font-bold">{data.customers_count}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> تنبيهات الستوك</CardTitle></CardHeader>
          <CardContent className="p-0">
            {data.low_stock?.length ? (
              <div className="table-wrap border-0">
                <table className="data-table">
                  <thead><tr><th>SKU</th><th>المنتج</th><th className="text-left">فيزيائي</th><th className="text-left">عتبة</th></tr></thead>
                  <tbody>
                    {data.low_stock.map((r) => (
                      <tr key={r.product_id}><td className="code">{r.sku}</td><td>{r.name}</td><td className="text-left">{r.physical}</td><td className="text-left">{r.reorder_threshold}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="كلشي مزيان" hint="ما كاينش منتجات تحت العتبة" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> آخر حركات الستوك</CardTitle></CardHeader>
        <CardContent className="p-0">
          {data.recent_movements?.length ? (
            <div className="table-wrap border-0">
              <table className="data-table">
                <thead><tr><th>النوع</th><th>المنتج</th><th className="text-left">الكمية</th><th>التاريخ</th></tr></thead>
                <tbody>
                  {data.recent_movements.map((m) => (
                    <tr key={m.id}>
                      <td>{m.type}</td>
                      <td>{m.product_name || "—"}</td>
                      <td className="text-left">{m.physical_delta}</td>
                      <td className="text-slate-500">{m.created_at ? new Date(m.created_at).toLocaleString("fr-FR") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="ما كاينش حركات" />
          )}
        </CardContent>
      </Card>
    </>
  );
}
