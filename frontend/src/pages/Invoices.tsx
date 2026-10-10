import { useEffect, useState } from "react";
import { api, apiError, Page } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Pagination, EmptyState, PageLoader } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { FileText, Eye } from "lucide-react";
import { InvoiceStatus } from "@/components/StatusBadges";
import { formatMoney } from "@/lib/utils";

type Invoice = {
  id:number; number?:string; status:string; issue_date?:string;
  customer_name:string; total:string|number;
};

export default function Invoices() {
  const {push}=useToast();
  const [items,setItems]=useState<Invoice[]>([]);
  const [total,setTotal]=useState(0);
  const [page,setPage]=useState(1);
  const [status,setStatus]=useState("");
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try{
      const r=await api.get<Page<Invoice>>("/invoices",{params:{page,page_size:20,status_filter:status||undefined}});
      setItems(r.data.items); setTotal(r.data.total);
    }catch(e){push(apiError(e),"error");}finally{setLoading(false);}
  }
  useEffect(()=>{load();},[page,status]);

  return (
    <>
      <PageHeader title="الفوترة" subtitle="الفواتير المسودة والصادرة"/>
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5"/> لائحة الفواتير</CardTitle>
          <Select value={status} onChange={(e)=>{setStatus(e.target.value);setPage(1);}} className="w-48">
            <option value="">كل الحالات</option>
            <option value="draft">مسودة</option>
            <option value="issued">صادرة</option>
            <option value="cancelled">ملغاة</option>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {loading?<PageLoader/>:items.length===0?<EmptyState title="ما كاينش فواتير"/>:(
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>الرقم</th><th>الزبون</th><th>التاريخ</th><th>الحالة</th><th className="text-left">المجموع</th><th className="text-left">أفعال</th></tr></thead>
                <tbody>
                  {items.map(inv=>(
                    <tr key={inv.id}>
                      <td className="code">{inv.number||"—"}</td>
                      <td>{inv.customer_name}</td>
                      <td className="text-slate-500">{inv.issue_date||"—"}</td>
                      <td><InvoiceStatus status={inv.status}/></td>
                      <td className="text-left font-medium">{String(inv.total)}</td>
                      <td className="text-left"><Button variant="ghost" size="sm"><Eye className="h-4 w-4"/> عرض</Button></td>
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
