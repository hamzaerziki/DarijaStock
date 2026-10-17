import { api, Page } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, EmptyState, PageLoader } from "@/components/ui/table";
import { Plus, Search, Package } from "lucide-react";
import { Badge } from "@/components/ui/card";
import { ComingSoon } from "@/components/StatusBadges";
import { DataTable, type Column } from "@/components/data/DataTable";
import { useListPage } from "@/hooks/useListPage";
import { formatMoney } from "@/lib/utils";

type Product = {
  id: number;
  sku: string;
  name: string;
  name_ar?: string;
  category?: string;
  base_unit: string;
  price: string | number;
  is_active: boolean;
};

export default function Products() {
  const list = useListPage<Product>({
    fetcher: (params, signal) => api.get<Page<Product>>("/products", { params, signal }).then((r) => r.data),
  });
  const { items, loading, page, pageSize, total, draftQ, setDraftQ, submitSearch, setPage, filtered, clearFilters } = list;

  const columns: Column<Product>[] = [
    { key: "sku", header: "SKU", priority: "primary", cell: (p) => <span className="code font-semibold text-slate-900" dir="ltr">{p.sku}</span> },
    { key: "name", header: "الإسم", cell: (p) => <span className="truncate">{p.name_ar || p.name}</span> },
    { key: "category", header: "الفئة", cell: (p) => p.category || "—" },
    { key: "unit", header: "الوحدة", cell: (p) => p.base_unit },
    { key: "price", header: "الثمن", align: "end", tabular: true, cell: (p) => formatMoney(p.price) },
    {
      key: "active",
      header: "نشط",
      priority: "badge",
      cell: (p) => <Badge tone={p.is_active ? "green" : "gray"}>{p.is_active ? "نشط" : "موقوف"}</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="المنتجات"
        subtitle="إدارة المنتجات، الوحدات والبدائل"
        actions={
          <span title="إضافة منتج غادي تتزاد فمرحلة قادمة" className="inline-flex">
            <Button disabled aria-disabled>
              <Plus className="h-4 w-4" /> إضافة منتج <ComingSoon />
            </Button>
          </span>
        }
      />
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> لائحة المنتجات
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              placeholder="بحث: SKU / الاسم"
              className="w-56"
              aria-label="بحث في المنتجات"
            />
            <Button variant="outline" onClick={submitSearch}>
              <Search className="h-4 w-4" /> بحث
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <PageLoader />
          ) : items.length === 0 ? (
            <EmptyState
              title={filtered ? "ما كاينش نتائج مطابقة" : "ما كاينش منتجات"}
              hint={filtered ? "بدّل كلمة البحث" : "أضف منتج جديد"}
            />
          ) : (
            <>
              {filtered && (
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-[13px] text-slate-500">
                  <span>{total} نتيجة مطابقة</span>
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    مسح البحث
                  </Button>
                </div>
              )}
              <DataTable columns={columns} items={items} rowKey={(p) => p.id} />
            </>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </CardContent>
      </Card>
    </>
  );
}
