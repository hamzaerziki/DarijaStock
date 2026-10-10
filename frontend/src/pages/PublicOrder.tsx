import { useEffect, useMemo, useState } from "react";
import { api, apiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";
import { PageLoader, EmptyState } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Store, ShoppingCart, Plus, Minus, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";

type PublicProduct = {
  id: number; sku: string; name: string; name_ar?: string; name_fr?: string;
  category?: string; base_unit: string; price: string; image_url?: string;
};

export default function PublicOrder() {
  const { push } = useToast();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ order_number: string } | null>(null);

  useEffect(() => {
    api
      .get<PublicProduct[]>("/public/products")
      .then((r) => setProducts(r.data))
      .catch((e) => push(apiError(e), "error"))
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(
    () => Object.entries(cart).reduce((sum, [id, qty]) => {
      const p = products.find((x) => x.id === Number(id));
      return sum + (p ? Number(p.price) * qty : 0);
    }, 0),
    [cart, products]
  );
  const count = Object.values(cart).reduce((a, b) => a + b, 0);

  function add(id: number, delta: number) {
    setCart((c) => {
      const next = { ...c };
      const v = (next[id] ?? 0) + delta;
      if (v <= 0) delete next[id];
      else next[id] = v;
      return next;
    });
  }

  const [category, setCategory] = useState<string>("all");
  const categories = useMemo(() => {
    const s = new Set(products.map(p=>p.category || "أخرى"));
    return ["all", ...Array.from(s)];
  }, [products]);
  const filtered = useMemo(() => {
    if (category==="all") return products;
    return products.filter(p => (p.category||"أخرى")===category);
  }, [products, category]);
  const groupedFiltered = useMemo(() => {
    const g: Record<string, PublicProduct[]> = {};
    filtered.forEach((p) => {
      const k = p.category || "أخرى";
      (g[k] ||= []).push(p);
    });
    return g;
  }, [filtered]);

  async function submit() {
    setErr("");
    if (!name.trim() || phone.trim().length < 6) {
      setErr("اكتب الإسم ورقم الهاتف صحيح / Remplis ton nom et ton numéro de téléphone");
      return;
    }
    if (!/^0[5-7][0-9]{8}$/.test(phone.replace(/\D/g,''))) {
      setErr("رقم الهاتف ماشي صحيح. خصو يبدا ب06 07 او 05 ويكون 10 أرقام");
      return;
    }
    const phoneClean = phone.replace(/\D/g,'');
    if (count === 0) {
      setErr("زيد على الأقل منتج واحد / Ajoute au moins un produit");
      return;
    }
    setSending(true);
    try {
      const r = await api.post<{ order_number: string }>("/public/orders", {
        name: name.trim(),
        phone: phoneClean,
        city: city || undefined,
        address: address || undefined,
        note: note || undefined,
        items: Object.entries(cart).map(([id, qty]) => ({ product_id: Number(id), quantity: qty })),
      });
      setDone({ order_number: r.data.order_number });
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-900">توصلنا بطلبيتك!</h2>
            <p className="text-sm text-slate-500">رقم الطلبية:</p>
            <Badge tone="navy" className="code text-base">{done.order_number}</Badge>
            <p className="text-sm text-slate-500">غادي نتواصلو معاك قريب للتأكيد. شكرا بزاف!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">طلب جديد</h1>
            <p className="text-xs text-slate-500">أطلب من دار / Commandez en ligne</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {loading ? <PageLoader /> : products.length === 0 ? <EmptyState title="ما كاينش منتجات متوفرة" /> : (
            <>
              <Card>
                <CardHeader><CardTitle>نختارو فئة</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
              {categories.length>0 && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                  <span className="text-sm text-slate-600">فلتر حسب الفئة:</span>
                  {categories.map(c=>(
                    <Button key={c} size="sm" variant={category===c?"default":"outline"} onClick={()=>setCategory(c)} className="h-9">{c==="all"?"كلشي":c}</Button>
                  ))}
                </div>
              )}
                </CardContent>
              </Card>
              {Object.entries(groupedFiltered).map(([cat, list]) => (
                <Card key={cat}>
                  <CardHeader><CardTitle>{cat}</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 p-3">
                    {list.map((p) => (
                      <div key={p.id} className="flex flex-col rounded-lg border border-slate-100 bg-white shadow-sm overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name_ar||p.name} className="h-40 w-full object-cover" loading="lazy"/>
                        ) : (
                          <div className="flex h-40 w-full items-center justify-center bg-slate-50 text-slate-300">—</div>
                        )}
                        <div className="p-4 flex-1 flex flex-col gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-slate-800 line-clamp-2">{p.name_ar || p.name}</p>
                            <p className="mt-1 text-sm font-bold text-emerald-700">{formatMoney(p.price)} / {p.base_unit}</p>
                          </div>
                          <div className="mt-auto">
                            {cart[p.id] ? (
                              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                                <Button variant="outline" size="lg" className="h-14 w-14" onClick={()=>add(p.id,-1)} aria-label="نقص واحد"><Minus className="h-6 w-6"/></Button>
                                <span className="w-12 text-center text-2xl font-bold">{cart[p.id]}</span>
                                <Button size="lg" className="h-14 w-14" onClick={()=>add(p.id,1)} aria-label="زيد واحد"><Plus className="h-6 w-6"/></Button>
                              </div>
                            ) : (
                              <Button size="lg" className="h-14 w-full text-base" onClick={()=>add(p.id,1)}><Plus className="h-5 w-5 ml-2"/> أطلب دابا</Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> طلبك</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label required>الإسم الكامل</Label>
                <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="كتب اسمك كامل" className="h-14 text-lg"/>
              </div>
              <div>
                <Label required>رقم الهاتف</Label>
                <Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="مثال 0612345678" className="h-14 text-lg code" inputMode="tel"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>المدينة</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <Label>العنوان</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>ملاحظة</Label>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900">
                <span>المجموع ({count})</span>
                <span>{formatMoney(total)}</span>
              </div>
              {err && <FieldError>{err}</FieldError>}
              {Object.keys(cart).length > 0 && (
                <Button variant="outline" size="lg" className="h-12 w-full" onClick={()=>setCart({})}>مسح الطلبية</Button>
              )}
              <Button className="h-16 w-full text-xl font-bold" loading={sending} onClick={submit}>أرسل الطلبية الآن</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}