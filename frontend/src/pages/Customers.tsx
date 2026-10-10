import { useEffect, useState } from "react";
import { api, apiError, Page } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, EmptyState, PageLoader } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, Users } from "lucide-react";

type Customer = {
  id:number; code:string; name:string; phone?:string; city?:string; is_active:boolean;
};

export default function Customers() {
  const {push}=useToast();
  const [items,setItems]=useState<Customer[]>([]);
  const [total,setTotal]=useState(0);
  const [page,setPage]=useState(1);
  const [q,setQ]=useState("");
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try{
      const r=await api.get<Page<Customer>>("/customers",{params:{page,page_size:20,q:q||undefined}});
      setItems(r.data.items); setTotal(r.data.total);
    }catch(e){push(apiError(e),"error");}finally{setLoading(false);}
  }
  useEffect(()=>{load();},[page]);

  return (
    <>
      <PageHeader title="الزبائن" subtitle="قائمة الزبائن" actions={<Button size="sm"><Plus className="h-4 w-4"/> إضافة زبون</Button>}/>
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/> لائحة الزبائن</CardTitle>
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="بحث: الكود/الإسم/الهاتف" className="w-56"/>
            <Button variant="outline" size="sm" onClick={()=>{setPage(1);load();}}><Search className="h-4 w-4"/> بحث</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading?<PageLoader/>:items.length===0?<EmptyState title="ما كاينش زبائن"/>:(
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>الكود</th><th>الإسم</th><th>الهاتف</th><th>المدينة</th><th>نشط</th><th className="text-left">أفعال</th></tr></thead>
                <tbody>
                  {items.map(c=>(
                    <tr key={c.id}><td className="code">{c.code}</td><td>{c.name}</td><td className="code">{c.phone||"—"}</td><td>{c.city||"—"}</td><td>{c.is_active?"نعم":"لا"}</td><td className="text-left"><Button variant="ghost" size="sm">تفاصيل</Button></td></tr>
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
