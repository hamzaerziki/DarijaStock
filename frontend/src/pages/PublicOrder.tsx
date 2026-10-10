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
  category?: string; base_unit: string; price: string;
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

  const grouped = useMemo(() => {
    const g: Record<string, PublicProduct[]> = {};
    products.forEach((p) => {
      const k = p.category || "أخرى";
      (g[k] ||= []).push(p);
    });
    return g;
  }, [products]);

  async function submit() {
    setErr("");
    if (!name.trim() || phone.trim().length < 6) {
      setErr("خاص الإسم ورقم الهاتف صحيح / Nom et téléphone obligatoires");
      return;
    }
    if (count === 0) {
      setErr("زيد على الأقل منتج واحد / Ajoutez au moins un produit");
      return;
    }
    setSending(true);
    try {
      const r = await api.post<{ order_number: string }>("/public/orders", {
        name: name.trim(),
        phone: phone.trim(),
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
            Object.entries(grouped).map(([cat, list]) => (
              <Card key={cat}>
                <CardHeader><CardTitle>{cat}</CardTitle></CardHeader>
                <CardContent className="divide-y divide-slate-100 p-0">
                  {list.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">{p.name_ar || p.name}</p>
                        <p className="text-xs text-slate-400">
                          <span className="code">{p.sku}</span> — {formatMoney(p.price)} / {p.base_unit}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {cart[p.id] ? (
                          <>
                            <Button variant="outline" size="icon" onClick={() => add(p.id, -1)}><Minus className="h-3.5 w-3.5" /></Button>
                            <span className="w-8 text-center font-medium">{cart[p.id]}</span>
                          </>
                        ) : null}
                        <Button size="icon" onClick={() => add(p.id, 1)}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> الطلبية</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label required>الاسم الكامل</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الإسم و النسب" />
              </div>
              <div>
                <Label required>رقم الهاتف</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06XXXXXXXX" className="code" />
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
              <Button className="w-full" loading={sending} onClick={submit}>إرسال الطلبية</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}