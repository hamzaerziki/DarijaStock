import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { api, Page } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Pagination, EmptyState, PageLoader } from "@/components/ui/table";
import { FileText, Eye } from "lucide-react";
import { InvoiceStatusBadge, ComingSoon } from "@/components/StatusBadges";
import { DataTable, type Column } from "@/components/data/DataTable";
import { useListPage } from "@/hooks/useListPage";
import { formatMoney } from "@/lib/utils";
import { INVOICE_STATUS } from "@/lib/status";

type Invoice = {
  id: number;
  number?: string;
  status: string;
  issue_date?: string;
  customer_name: string;
  total: string | number;
};

export default function Invoices() {
  const [sp, setSp] = useSearchParams();
  const highlight = sp.get("highlight");
  const scrolled = useRef(false);

  const list = useListPage<Invoice>({
    fetcher: (params, signal) => api.get<Page<Invoice>>("/invoices", { params, signal }).then((r) => r.data),
    filterKeys: ["status_filter"],
  });
  const { items, loading, page, pageSize, total, filters, setFilter, setPage } = list;

  // Scroll to the newly created invoice and clear the ?highlight flag afterwards.
  useEffect(() => {
    if (!highlight || loading || scrolled.current) return;
    const els = document.querySelectorAll<HTMLElement>(`[data-row-id="${CSS.escape(highlight)}"]`);
    const visible = Array.from(els).find((el) => el.offsetParent !== null);
    if (!visible) return;
    visible.scrollIntoView({ behavior: "smooth", block: "center" });
    scrolled.current = true;
    const t = setTimeout(() => {
      setSp(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.delete("highlight");
          return n;
        },
        { replace: true },
      );
    }, 3000);
    return () => clearTimeout(t);
  }, [highlight, loading, items, setSp]);

  const columns: Column<Invoice>[] = [
    {
      key: "number",
      header: "الرقم",
      priority: "primary",
      cell: (inv) => <span className="code font-semibold text-slate-900">{inv.number || `#${inv.id}`}</span>,
    },
    { key: "customer", header: "الزبون", cell: (inv) => <span className="truncate">{inv.customer_name}</span> },
    { key: "date", header: "التاريخ", cell: (inv) => <span className="text-slate-500">{inv.issue_date || "—"}</span> },
    { key: "status", header: "الحالة", priority: "badge", cell: (inv) => <InvoiceStatusBadge status={inv.status} /> },
    {
      key: "total",
      header: "المجموع",
      align: "end",
      tabular: true,
      cell: (inv) => <span className="font-medium">{formatMoney(inv.total)}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="الفوترة" subtitle="الفواتير المسودة والصادرة" />
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> لائحة الفواتير
          </CardTitle>
          <Select
            value={filters.status_filter}
            onChange={(e) => setFilter("status_filter", e.target.value)}
            className="w-48"
            aria-label="تصفية حسب الحالة"
          >
            <option value="">كل الحالات</option>
            {Object.entries(INVOICE_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <PageLoader />
          ) : items.length === 0 ? (
            <EmptyState title="ما كاينش فواتير" hint="الفواتير كتتولد من صفحة تفاصيل الكوموند" />
          ) : (
            <DataTable
              columns={columns}
              items={items}
              rowKey={(inv) => inv.id}
              highlightId={highlight}
              rowActions={() => (
                <span title="عرض الفاتورة غادي يتزاد فمرحلة قادمة" className="inline-flex">
                  <Button variant="ghost" size="sm" disabled aria-disabled>
                    <Eye className="h-4 w-4" /> عرض <ComingSoon />
                  </Button>
                </span>
              )}
            />
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </CardContent>
      </Card>
    </>
  );
}
