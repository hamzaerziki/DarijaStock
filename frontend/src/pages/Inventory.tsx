import { useEffect, useState } from "react";
import { api, apiError, Page } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Pagination, EmptyState, PageLoader } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Search, Boxes } from "lucide-react";
import { formatMoney, formatQty } from "@/lib/utils";

type StockRow = {
  product_id:number; sku:string; name:string; name_ar?:string;
  unit:string; price:string|number; reorder_threshold:string|number;
  physical:string|number; reserved:string|number; available:string|number; low_stock:boolean;
};

export default function Inventory() {
  const {push}=useToast();
  const [items,setItems]=useState<StockRow[]>([]);
  const [total,setTotal]=useState(0);
  const [page,setPage]=useState(1);
  const [q,setQ]=useState("");
  const [lowOnly,setLowOnly]=useState(false);
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    try{
      const r=await api.get<Page<StockRow>>("/inventory/stock",{params:{page,page_size:20,q:q||undefined,low_only:lowOnly}});
      setItems(r.data.items); setTotal(r.data.total);
    }catch(e){push(apiError(e),"error");}finally{setLoading(false);}
  }
  useEffect(()=>{load();},[page,lowOnly]);

  return (
    <>
      <PageHeader title="الستوك" subtitle="رصيد المخزن + تحذيرات"/>
      <Card>
        <CardHeader className="flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5"/> رصيد الستوك</CardTitle>
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="بحث SKU/إسم" className="w-56"/>
            <Button variant="outline" size="sm" onClick={()=>{setPage(1);load();}}><Search className="h-4 w-4"/> بحث</Button>
            <Select value={String(lowOnly)} onChange={(e)=>{setLowOnly(e.target.value==="true");setPage(1);}}>
              <option value="false">كل</option>
              <option value="true">أقل من العتبة فقط</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading?<PageLoader/>:items.length===0?<EmptyState title="ما كاينش نتائج"/>:(
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th><th>المنتج</th><th>الوحدة</th><th className="text-left">الثمن</th>
                    <th className="text-left">فيزيائي</th><th className="text-left">محجوز</th><th className="text-left">متوفر</th><th>عتبة</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(r=>(
                    <tr key={r.product_id} className={r.low_stock?"bg-amber-50/40":""}>
                      <td className="code">{r.sku}</td>
                      <td>{r.name_ar||r.name}</td>
                      <td>{r.unit}</td>
                      <td className="text-left">{formatMoney(r.price)}</td>
                      <td className="text-left">{formatQty(r.physical)}</td>
                      <td className="text-left">{formatQty(r.reserved)}</td>
                      <td className="text-left font-medium">{formatQty(r.available)}</td>
                      <td>{formatQty(r.reorder_threshold)}</td>
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
