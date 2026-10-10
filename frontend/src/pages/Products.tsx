import { useEffect, useState } from "react";
import { api, apiError, Page } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, EmptyState, PageLoader } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, Package } from "lucide-react";
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
  const { push } = useToast();
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<Page<Product>>("/products", { params: { page, page_size: 20, q: q || undefined } });
      setItems(r.data.items);
      setTotal(r.data.total);
    } catch (e) {
      push(apiError(e), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page]);

  return (
    <>
      <PageHeader title="المنتجات" subtitle="إدارة المنتجات، الوحدات والبدائل" actions={
        <Button size="sm"><Plus className="h-4 w-4"/> إضافة منتج</Button>
      } />
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5"/> لائحة المنتجات</CardTitle>
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="بحث: SKU / الاسم" className="w-56"/>
            <Button variant="outline" size="sm" onClick={()=>{setPage(1);load();}}><Search className="h-4 w-4"/> بحث</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <PageLoader/> : items.length===0 ? <EmptyState title="ما كاينش منتجات" hint="أضف منتج جديد"/> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>الإسم</th>
                    <th>الفئة</th>
                    <th>الوحدة</th>
                    <th className="text-left">الثمن</th>
                    <th>نشط</th>
                    <th className="text-left">أفعال</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p=>(
                    <tr key={p.id}>
                      <td className="code">{p.sku}</td>
                      <td>{p.name_ar || p.name}</td>
                      <td>{p.category||"—"}</td>
                      <td>{p.base_unit}</td>
                      <td className="text-left">{formatMoney(p.price)}</td>
                      <td>{p.is_active?"نعم":"لا"}</td>
                      <td className="text-left"><Button variant="ghost" size="sm">تفاصيل</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} pageSize={20} total={total} onChange={setPage}/>
        </CardContent>
      </Card>
    </>
  );
}
