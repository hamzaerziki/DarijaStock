import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageLoader } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { BarChart3, ScrollText } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/card";

type Summary = {
  products: number; customers: number; orders: number; invoices: number;
  issued_invoices_total: string; stock_physical: string; stock_reserved: string;
};

type Audit = {
  id: number; action: string; actor_name?: string; entity_type?: string;
  entity_id?: number; details?: Record<string, unknown>; created_at?: string;
};

export default function Reports() {
  const { push } = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Summary>("/reports/summary").catch(() => null),
      api.get<Audit[]>("/reports/audit", { params: { limit: 50 } }).catch(() => null),
    ])
      .then(([s, a]) => {
        if (s) setSummary(s.data);
        if (a) setAudit(a.data);
        if (!s && !a) push("ما عندكش الصلاحية لهاد التقارير", "warning");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  return (
    <>
      <PageHeader title="التقارير" subtitle="ملخصات و سجل التدقيق" />

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Mini label="المنتجات" value={summary.products} />
          <Mini label="الزبائن" value={summary.customers} />
          <Mini label="الكوموندات" value={summary.orders} />
          <Mini label="الفواتير" value={summary.invoices} />
          <Mini label="مدخول الفواتير الصادرة" value={formatMoney(summary.issued_invoices_total)} />
          <Mini label="الستوك الفيزيائي" value={summary.stock_physical} />
          <Mini label="الستوك المحجوز" value={summary.stock_reserved} />
        </div>
      )}

      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> سجل التدقيق (آخر 50)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {audit.length === 0 ? (
            <EmptyState title="ما كاينش سجل" />
          ) : (
            <div className="table-wrap border-0">
              <table className="data-table">
                <thead><tr><th>الحدث</th><th>المستخدم</th><th>الكيان</th><th>التاريخ</th><th>تفاصيل</th></tr></thead>
                <tbody>
                  {audit.map((e) => (
                    <tr key={e.id}>
                      <td><Badge tone="teal">{e.action}</Badge></td>
                      <td>{e.actor_name || "—"}</td>
                      <td>{e.entity_type ? `${e.entity_type}#${e.entity_id ?? ""}` : "—"}</td>
                      <td className="text-slate-500">{e.created_at ? new Date(e.created_at).toLocaleString("fr-FR") : "—"}</td>
                      <td className="max-w-xs truncate text-xs text-slate-500">{e.details ? JSON.stringify(e.details) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900">
        <BarChart3 className="h-4 w-4 text-teal-600" /> {value}
      </p>
    </Card>
  );
}
