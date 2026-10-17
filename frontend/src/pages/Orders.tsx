import { useNavigate } from "react-router-dom";
import { api, Page } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Pagination, EmptyState, PageLoader } from "@/components/ui/table";
import { Search, Plus, FileText, ClipboardList } from "lucide-react";
import { StatusBadge, ComingSoon } from "@/components/StatusBadges";
import { DataTable, type Column } from "@/components/data/DataTable";
import { useListPage } from "@/hooks/useListPage";
import { formatMoney, formatDate } from "@/lib/utils";
import { ORDER_STATUS, ORDER_STATUS_FILTERS } from "@/lib/status";

type Order = {
  id: number;
  order_number: string;
  status: string;
  customer?: { id: number; code: string; name: string; phone?: string };
  total: string | number;
  created_at?: string;
};

export default function Orders() {
  const navigate = useNavigate();
  const list = useListPage<Order>({
    fetcher: (params, signal) => api.get<Page<Order>>("/orders", { params, signal }).then((r) => r.data),
    filterKeys: ["status_filter"],
  });
  const { items, loading, page, pageSize, total, q, draftQ, setDraftQ, filters, submitSearch, setFilter, setPage, clearFilters, filtered } = list;

  const columns: Column<Order>[] = [
    {
      key: "number",
      header: "رقم",
      priority: "primary",
      cell: (o) => <span className="code font-semibold text-slate-900">{o.order_number}</span>,
    },
    { key: "date", header: "التاريخ", cell: (o) => <span className="text-slate-500">{formatDate(o.created_at)}</span> },
    { key: "customer", header: "الزبون", cell: (o) => <span className="max-w-[16rem] truncate">{o.customer?.name || "—"}</span> },
    {
      key: "status",
      header: "الحالة",
      priority: "badge",
      cell: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: "total",
      header: "المجموع",
      align: "end",
      tabular: true,
      cell: (o) => <span className="font-medium">{formatMoney(o.total)}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="الكوموندات" subtitle="لائحة الكوموندات، تأكيد و تدقيق قبل التسليم/الفوترة" />
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            لائحة الكوموندات
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Input
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                placeholder="بحث: رقم / اسم الزبون / مرجع"
                className="w-56"
                aria-label="بحث في الكوموندات"
              />
              <Button variant="outline" onClick={submitSearch}>
                <Search className="h-4 w-4" /> بحث
              </Button>
            </div>
            <Select
              value={filters.status_filter}
              onChange={(e) => setFilter("status_filter", e.target.value)}
              aria-label="تصفية حسب الحالة"
            >
              <option value="">كل الحالات</option>
              {ORDER_STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS[s].label}
                </option>
              ))}
            </Select>
            <span title="هاد الميزة غادي تتزاد فمرحلة قادمة" className="inline-flex">
              <Button disabled aria-disabled>
                <Plus className="h-4 w-4" /> كوموند جديد <ComingSoon />
              </Button>
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <PageLoader />
          ) : items.length === 0 ? (
            <EmptyState
              title={filtered ? "ما كاينش نتائج مطابقة" : "ما كاينش كوموندات"}
              hint={filtered ? "بدّل البحث أو التصفية" : "ابدأ باستيراد مسجات الواتساب"}
            />
          ) : (
            <>
              {filtered && (
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-[13px] text-slate-500">
                  <span>{total} نتيجة مطابقة للتصفية الحالية</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    مسح التصفية
                  </Button>
                </div>
              )}
              <DataTable
                columns={columns}
                items={items}
                rowKey={(o) => o.id}
                onRowClick={(o) => navigate(`/orders/${o.id}`)}
                rowActions={(o) => (
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${o.id}`)} aria-label={`تفاصيل الكوموند ${o.order_number}`}>
                    <FileText className="h-4 w-4" /> تفاصيل
                  </Button>
                )}
              />
            </>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </CardContent>
      </Card>
    </>
  );
}
