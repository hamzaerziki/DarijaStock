import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageLoader } from "@/components/ui/table";
import { DataTable, type Column } from "@/components/data/DataTable";
import { useToast } from "@/components/ui/toast";
import { ClipboardList, FileText, Boxes, AlertTriangle, Package, Users } from "lucide-react";
import { formatMoney, formatQty, formatDate } from "@/lib/utils";
import { movementLabel } from "@/lib/labels";

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
  period_days?: number;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return <EmptyState title="تعذر تحميل البيانات" />;

  const days = data.period_days ?? 30;
  const ordersTotal = Object.values(data.orders_by_status || {}).reduce((a, b) => a + b, 0);
  const invoicesTotal = Object.values(data.invoices_by_status || {}).reduce((a, b) => a + b, 0);

  const lowStockColumns: Column<LowStock>[] = [
    { key: "sku", header: "SKU", priority: "primary", cell: (r) => <span className="code font-semibold text-slate-900" dir="ltr">{r.sku}</span> },
    { key: "name", header: "المنتج", cell: (r) => r.name },
    { key: "physical", header: "فيزيائي", align: "end", tabular: true, cell: (r) => formatQty(r.physical) },
    { key: "threshold", header: "عتبة", align: "end", tabular: true, cell: (r) => formatQty(r.reorder_threshold) },
  ];

  const movementColumns: Column<Movement>[] = [
    { key: "type", header: "النوع", priority: "primary", cell: (m) => movementLabel(m.type) },
    { key: "product", header: "المنتج", cell: (m) => m.product_name || "—" },
    { key: "delta", header: "الكمية", align: "end", tabular: true, cell: (m) => formatQty(m.physical_delta) },
    { key: "date", header: "التاريخ", cell: (m) => <span className="text-slate-500">{formatDate(m.created_at)}</span> },
  ];

  return (
    <>
      <PageHeader title="لوحة القيادة" subtitle="نظرة عامة على النشاط" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={`الكوموندات (${days} يوم)`} value={String(data.orders_in_period)} sub={`الإجمالي: ${ordersTotal}`} icon={ClipboardList} tone="teal" to="/orders" />
        <StatCard title="الفواتير الصادرة" value={String(data.invoices_by_status?.issued ?? 0)} sub={`الإجمالي: ${invoicesTotal}`} icon={FileText} tone="blue" to="/invoices" />
        <StatCard title={`مدخول الفواتير (${days} يوم)`} value={formatMoney(data.invoices_total_in_period)} icon={Boxes} tone="green" to="/invoices" />
        <StatCard title="منتجات تحت العتبة" value={String(data.low_stock?.length ?? 0)} icon={AlertTriangle} tone="amber" to="/inventory?low_only=true" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> إحصائيات عامة
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200 bg-[#F7FAFC] p-4">
              <p className="text-[13px] text-slate-500">المنتجات النشيطة</p>
              <p className="mt-1 text-[22px] font-bold text-slate-900 tnum">{data.products_count}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-[#F7FAFC] p-4">
              <p className="text-[13px] text-slate-500">الزبائن النشيطين</p>
              <p className="mt-1 text-[22px] font-bold text-slate-900 tnum">{data.customers_count}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" /> تنبيهات الستوك
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.low_stock?.length ? (
              <DataTable columns={lowStockColumns} items={data.low_stock} rowKey={(r) => r.product_id} />
            ) : (
              <EmptyState title="كلشي مزيان" hint="ما كاينش منتجات تحت العتبة" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> آخر حركات الستوك
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recent_movements?.length ? (
            <DataTable columns={movementColumns} items={data.recent_movements} rowKey={(m) => m.id} />
          ) : (
            <EmptyState title="ما كاينش حركات" />
          )}
        </CardContent>
      </Card>
    </>
  );
}
