import { api, Page } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, EmptyState, PageLoader } from "@/components/ui/table";
import { Plus, Search, Users } from "lucide-react";
import { ComingSoon } from "@/components/StatusBadges";
import { DataTable, type Column } from "@/components/data/DataTable";
import { useListPage } from "@/hooks/useListPage";

type Customer = {
  id: number;
  code: string;
  name: string;
  phone?: string;
  city?: string;
  is_active: boolean;
};

export default function Customers() {
  const list = useListPage<Customer>({
    fetcher: (params, signal) => api.get<Page<Customer>>("/customers", { params, signal }).then((r) => r.data),
  });
  const { items, loading, page, pageSize, total, draftQ, setDraftQ, submitSearch, setPage, filtered, clearFilters } = list;

  const columns: Column<Customer>[] = [
    { key: "code", header: "الكود", priority: "primary", cell: (c) => <span className="code font-semibold text-slate-900" dir="ltr">{c.code}</span> },
    { key: "name", header: "الإسم", cell: (c) => <span className="truncate">{c.name}</span> },
    { key: "phone", header: "الهاتف", cell: (c) => <span className="code" dir="ltr">{c.phone || "—"}</span> },
    { key: "city", header: "المدينة", cell: (c) => c.city || "—" },
    {
      key: "active",
      header: "نشط",
      priority: "badge",
      cell: (c) => <Badge tone={c.is_active ? "green" : "gray"}>{c.is_active ? "نشط" : "موقوف"}</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="الزبائن"
        subtitle="قائمة الزبائن"
        actions={
          <span title="إضافة زبون غادي تتزاد فمرحلة قادمة" className="inline-flex">
            <Button disabled aria-disabled>
              <Plus className="h-4 w-4" /> إضافة زبون <ComingSoon />
            </Button>
          </span>
        }
      />
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> لائحة الزبائن
          </CardTitle>
          <div className="flex items-center gap-2">
            <Input
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              placeholder="بحث: الكود/الإسم/الهاتف"
              className="w-56"
              aria-label="بحث في الزبائن"
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
            <EmptyState title={filtered ? "ما كاينش نتائج مطابقة" : "ما كاينش زبائن"} hint={filtered ? "بدّل كلمة البحث" : undefined} />
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
              <DataTable columns={columns} items={items} rowKey={(c) => c.id} />
            </>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
        </CardContent>
      </Card>
    </>
  );
}
