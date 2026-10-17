import { api, Page } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Pagination, EmptyState, PageLoader } from "@/components/ui/table";
import { Search, Boxes } from "lucide-react";
import { DataTable, type Column } from "@/components/data/DataTable";
import { useListPage } from "@/hooks/useListPage";
import { formatMoney, formatQty } from "@/lib/utils";

type StockRow = {
  product_id: number;
  sku: string;
  name: string;
  name_ar?: string;
  unit: string;
  price: string | number;
  reorder_threshold: string | number;
  physical: string | number;
  reserved: string | number;
  available: string | number;
  low_stock: boolean;
};

export default function Inventory() {
  const list = useListPage<StockRow>({
    fetcher: (params, signal) => api.get<Page<StockRow>>("/inventory/stock", { params, signal }).then((r) => r.data),
    filterKeys: ["low_only"],
  });
  const { items, loading, page, pageSize, total, draftQ, setDraftQ, submitSearch, setPage, filters, setFilter, filtered, clearFilters } = list;

  const columns: Column<StockRow>[] = [
    { key: "sku", header: "SKU", priority: "primary", cell: (r) => <span className="code font-semibold text-slate-900" dir="ltr">{r.sku}</span> },
    { key: "name", header: "المنتج", cell: (r) => <span className="truncate">{r.name_ar || r.name}</span> },
    { key: "unit", header: "الوحدة", cell: (r) => r.unit },
    { key: "price", header: "الثمن", align: "end", tabular: true, cell: (r) => formatMoney(r.price) },
    { key: "physical", header: "فيزيائي", align: "end", tabular: true, cell: (r) => formatQty(r.physical) },
    { key: "reserved", header: "محجوز", align: "end", tabular: true, cell: (r) => formatQty(r.reserved) },
    {
      key: "available",
      header: "متوفر",
      align: "end",
      tabular: true,
      priority: "badge",
      cell: (r) =>
        r.low_stock ? (
          <Badge tone="amber">{formatQty(r.available)} ⚠</Badge>
        ) : (
          <span className="font-medium">{formatQty(r.available)}</span>
        ),
    },
    { key: "threshold", header: "عتبة", align: "end", tabular: true, cell: (r) => formatQty(r.reorder_threshold) },
  ];

  return (
    <>
      <PageHeader title="الستوك" subtitle="رصيد المخزن + تحذيرات" />
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" /> رصيد الستوك
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              placeholder="بحث SKU/إسم"
              className="w-56"
              aria-label="بحث في الستوك"
            />
            <Button variant="outline" onClick={submitSearch}>
              <Search className="h-4 w-4" /> بحث
            </Button>
            <Select
              value={filters.low_only || "false"}
              onChange={(e) => setFilter("low_only", e.target.value === "true" ? "true" : "")}
              aria-label="تصفية حسب الرصيد"
            >
              <option value="false">كل</option>
              <option value="true">أقل من العتبة فقط</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <PageLoader />
          ) : items.length === 0 ? (
            <EmptyState
              title={filtered ? "ما كاينش نتائج مطابقة" : "ما كاينش نتائج"}
              hint={filtered ? "بدّل البحث أو التصفية" : undefined}
            />
          ) : (
            <>
              {filtered && (
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-[13px] text-slate-500">
                  <span>{total} نتيجة مطابقة</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    مسح التصفية
                  </Button>
                </div>
              )}
              <DataTable
                columns={columns}
                items={items}
                rowKey={(r) => r.product_id}
                rowClassName={(r) => (r.low_stock ? "bg-warning-soft/40" : undefined)}
              />
            </>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </CardContent>
      </Card>
    </>
  );
}
