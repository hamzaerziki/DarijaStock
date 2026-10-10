import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, apiError, Page } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Pagination, EmptyState, PageLoader } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Search, Plus, FileText, ClipboardList } from "lucide-react";
import { OrderStatus } from "@/components/StatusBadges";
import { formatMoney } from "@/lib/utils";

type Order = {
  id: number;
  order_number: string;
  status: string;
  customer?: { id: number; code: string; name: string; phone?: string };
  total: string | number;
  created_at?: string;
};

export default function Orders() {
  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { push } = useToast();

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<Page<Order>>("/orders", { params: { page, page_size: 20, q: q || undefined, status_filter: status || undefined } });
      setItems(r.data.items);
      setTotal(r.data.total);
    } catch (e) {
      push(apiError(e), "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [page, status]); // q on search button

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
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث: رقم / اسم الزبون / مرجع" className="w-56" />
              <Button variant="outline" size="sm" onClick={() => { setPage(1); load(); }}>
                <Search className="h-4 w-4" /> بحث
              </Button>
            </div>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">كل الحالات</option>
              <option value="draft">مشروع</option>
              <option value="confirmed">مأكد</option>
              <option value="fulfilled">مسلّم</option>
              <option value="cancelled">ملغى</option>
              <option value="invoiced">مفوتر</option>
            </Select>
            <Button size="sm" onClick={() => push("فتح محرر إضافة كوموند يدوي سيضاف لاحقا", "info")}>
              <Plus className="h-4 w-4" /> كوموند جديد
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <PageLoader />
          ) : items.length === 0 ? (
            <EmptyState title="ما كاينش كوموندات" hint="ابدأ باستيراد مسجات الواتساب أو إنشاء كوموند يدوي" />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>رقم</th>
                    <th>التاريخ</th>
                    <th>الزبون</th>
                    <th>الحالة</th>
                    <th className="text-left">المجموع</th>
                    <th className="text-left">أفعال</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((o) => (
                    <tr key={o.id}>
                      <td className="code font-medium text-slate-900">{o.order_number}</td>
                      <td className="text-slate-500">{o.created_at ? new Date(o.created_at).toLocaleString("fr-FR") : "—"}</td>
                      <td className="max-w-xs truncate">{o.customer?.name || "—"}</td>
                      <td><OrderStatus status={o.status} /></td>
                      <td className="text-left font-medium">{formatMoney(o.total)}</td>
                      <td className="text-left">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/orders/${o.id}`)}>
                          <FileText className="h-4 w-4" /> تفاصيل
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pageSize={20} total={total} onChange={setPage} />
        </CardContent>
      </Card>
    </>
  );
}