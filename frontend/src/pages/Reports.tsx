import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { EmptyState, PageLoader } from "@/components/ui/table";
import { DataTable, type Column } from "@/components/data/DataTable";
import { formatMoney, formatQty, formatDate } from "@/lib/utils";
import { auditLabel } from "@/lib/labels";
import { BarChart3, Package, Users, ClipboardList, FileText, Boxes, ScrollText, AlertTriangle } from "lucide-react";

type Summary = {
  products: number; customers: number; orders: number; invoices: number;
  issued_invoices_total: string; stock_physical: string; stock_reserved: string;
};

type Audit = {
  id: number; action: string; actor_name?: string; entity_type?: string;
  entity_id?: number; details?: Record<string, unknown>; created_at?: string;
};

export default function Reports() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [summaryErr, setSummaryErr] = useState("");
  const [auditErr, setAuditErr] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    api.get<Summary>("/reports/summary")
      .then((r) => setSummary(r.data))
      .catch((e) => setSummaryErr(apiError(e)))
      .finally(() => setSummaryLoading(false));
    api.get<Audit[]>("/reports/audit", { params: { limit: 50 } })
      .then((r) => setAudit(r.data))
      .catch((e) => setAuditErr(apiError(e)))
      .finally(() => setAuditLoading(false));
  }, []);

  const auditColumns: Column<Audit>[] = [
    {
      key: "action",
      header: "الحدث",
      priority: "primary",
      cell: (e) => <Badge tone="teal">{auditLabel(e.action)}</Badge>,
    },
    { key: "actor", header: "المستخدم", cell: (e) => e.actor_name || "—" },
    { key: "entity", header: "الكيان", cell: (e) => (e.entity_type ? `${e.entity_type}#${e.entity_id ?? ""}` : "—") },
    { key: "date", header: "التاريخ", cell: (e) => <span className="text-slate-500">{formatDate(e.created_at)}</span> },
    {
      key: "details",
      header: "تفاصيل",
      cell: (e) =>
        e.details && Object.keys(e.details).length ? (
          <details className="text-xs">
            <summary className="cursor-pointer text-primary">عرض</summary>
            <pre className="mt-1 max-w-md overflow-x-auto rounded bg-slate-50 p-2 text-[11px] text-slate-600" dir="ltr">
              {JSON.stringify(e.details, null, 2)}
            </pre>
          </details>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="التقارير" subtitle="ملخصات و سجل التدقيق" />

      {summaryLoading ? (
        <PageLoader />
      ) : summaryErr ? (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-danger-text">
            <AlertTriangle className="h-5 w-5" /> <span className="text-sm">{summaryErr}</span>
          </div>
        </Card>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="المنتجات" value={String(summary.products)} icon={Package} tone="teal" />
          <StatCard title="الزبائن" value={String(summary.customers)} icon={Users} tone="blue" />
          <StatCard title="الكوموندات" value={String(summary.orders)} icon={ClipboardList} tone="navy" />
          <StatCard title="الفواتير" value={String(summary.invoices)} icon={FileText} tone="navy" />
          <StatCard title="مدخول الفواتير الصادرة" value={formatMoney(summary.issued_invoices_total)} icon={BarChart3} tone="green" />
          <StatCard title="الستوك الفيزيائي" value={formatQty(summary.stock_physical)} icon={Boxes} tone="blue" />
          <StatCard title="الستوك المحجوز" value={formatQty(summary.stock_reserved)} icon={Boxes} tone="amber" />
        </div>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" /> سجل التدقيق (آخر 50)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {auditLoading ? (
            <PageLoader />
          ) : auditErr ? (
            <div className="flex items-center gap-2 p-6 text-sm text-danger-text">
              <AlertTriangle className="h-5 w-5" /> {auditErr}
            </div>
          ) : audit.length === 0 ? (
            <EmptyState title="ما كاينش سجل" />
          ) : (
            <DataTable columns={auditColumns} items={audit} rowKey={(e) => e.id} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
