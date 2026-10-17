import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import { PageLoader, EmptyState } from "@/components/ui/table";
import { formatMoney, toCents } from "@/lib/utils";
import { isValidPhone, normalizePhone } from "@/lib/validators";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import {
  Search,
  ShoppingCart,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  User,
  MapPin,
  Phone,
  AlertTriangle,
  PackageSearch,
  RotateCcw,
} from "lucide-react";
import { PublicShell } from "@/components/public/PublicShell";
import { OrderProgress, type ProgressStep } from "@/components/public/OrderProgress";
import { ProductCard } from "@/components/public/ProductCard";
import { OrderSummary } from "@/components/public/OrderSummary";
import { statusLabel } from "@/lib/status";
import { productLabel, type PublicProduct, type CartLine, type PublicCustomer } from "@/components/public/types";

type Step = "browse" | "cart" | "info" | "confirm";
type FieldErrors = Partial<Record<"name" | "phone" | "city" | "address", string>>;

const WIZARD: ProgressStep[] = [
  { id: "browse", label: "اختار المنتوجات" },
  { id: "cart", label: "راجع السلة" },
  { id: "info", label: "معلومات الزبون" },
  { id: "confirm", label: "تأكيد الطلب" },
];

// Versioned storage keys. If the stored shape/version doesn't match, we ignore it.
const CART_KEY = "ds_public_cart_v1";
const CUST_KEY = "ds_public_customer_v1";
const EMPTY_CUSTOMER: PublicCustomer = { name: "", phone: "", city: "", address: "", note: "" };
const STEPS: Step[] = ["browse", "cart", "info", "confirm"];

function loadCart(): Record<number, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || "null");
    if (!parsed || parsed.v !== 1 || typeof parsed.items !== "object" || parsed.items === null) return {};
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(parsed.items as Record<string, unknown>)) {
      const id = Number(k);
      const qty = Number(v);
      if (Number.isFinite(id) && Number.isFinite(qty) && qty > 0) out[id] = Math.floor(qty);
    }
    return out;
  } catch {
    return {};
  }
}
function loadCustomer(): PublicCustomer {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUST_KEY) || "null");
    if (!parsed || parsed.v !== 1 || typeof parsed.data !== "object" || parsed.data === null) return { ...EMPTY_CUSTOMER };
    return { ...EMPTY_CUSTOMER, ...parsed.data };
  } catch {
    return { ...EMPTY_CUSTOMER };
  }
}

export default function PublicOrder() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  const [cart, setCart] = useState<Record<number, number>>(loadCart);
  const [customer, setCustomer] = useState<PublicCustomer>(loadCustomer);

  // Step lives in the URL so a refresh keeps the customer on the same step.
  const rawStep = sp.get("step");
  const step: Step = (STEPS as string[]).includes(rawStep || "") ? (rawStep as Step) : "browse";
  const setStep = (s: Step) =>
    setSp(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (s === "browse") n.delete("step");
        else n.set("step", s);
        return n;
      },
      { replace: true },
    );

  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [fieldErrs, setFieldErrs] = useState<FieldErrors>({});
  const [submitErr, setSubmitErr] = useState("");
  const [revalidateMsg, setRevalidateMsg] = useState("");
  const [revalidating, setRevalidating] = useState(false);
  const { busy: sending, run: runSubmit } = useSubmitLock();
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<{ order_number: string; status: string; message?: string; total?: string; currency?: string } | null>(null);

  async function loadProducts() {
    setLoading(true);
    setLoadErr("");
    try {
      const r = await api.get<PublicProduct[]>("/public/products");
      setProducts(r.data);
    } catch (e) {
      setLoadErr(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify({ v: 1, items: cart })); } catch { /* ignore */ }
  }, [cart]);
  useEffect(() => {
    try { localStorage.setItem(CUST_KEY, JSON.stringify({ v: 1, data: customer })); } catch { /* ignore */ }
  }, [customer]);

  // Derived cart lines, validated against the current product catalog.
  const lines: CartLine[] = useMemo(
    () => products.filter((p) => (cart[p.id] || 0) > 0).map((p) => ({ ...p, qty: cart[p.id] })),
    [products, cart],
  );
  const subtotalCents = lines.reduce((sum, l) => sum + toCents(l.price) * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  const categories = useMemo(() => {
    const s = new Set(products.map((p) => p.category || "أخرى"));
    return Array.from(s);
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (category !== "all") list = list.filter((p) => (p.category || "أخرى") === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        [p.name, p.name_ar, p.name_fr, p.sku, p.category].some((f) => f?.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [products, category, search]);

  const grouped = useMemo(() => {
    const g: Record<string, PublicProduct[]> = {};
    filtered.forEach((p) => {
      const k = p.category || "أخرى";
      (g[k] ||= []).push(p);
    });
    return g;
  }, [filtered]);

  function setQty(id: number, next: number) {
    setCart((c) => {
      const n = { ...c };
      if (next <= 0) delete n[id];
      else n[id] = next;
      return n;
    });
  }
  const add = (id: number, delta: number) => setQty(id, (cart[id] || 0) + delta);
  void add; // reserved for future quick-add affordances

  function validateInfo(): boolean {    const e: FieldErrors = {};
    if (!customer.name.trim()) e.name = "اكتب الاسم الكامل ديالك";
    if (!isValidPhone(customer.phone))
      e.phone = "رقم الهاتف ماشي صحيح. خصو يبدا ب05/06/07 ويكون 10 أرقام";
    if (!customer.city.trim()) e.city = "اكتب المدينة ديالك";
    if (!customer.address.trim()) e.address = "اكتب العنوان ديالك";
    setFieldErrs(e);
    return Object.keys(e).length === 0;
  }

  async function toConfirm() {
    if (!validateInfo()) return;
    setStep("confirm");
    setRevalidateMsg("");
    setRevalidating(true);
    try {
      const r = await api.get<PublicProduct[]>("/public/products");
      setProducts(r.data);
      const available = new Set(r.data.map((p) => p.id));
      const missing = Object.keys(cart).filter((id) => !available.has(Number(id)));
      if (missing.length) setRevalidateMsg("بعض المنتوجات ما بقاتش متوفرة وتحيدات من السلة.");
    } catch {
      /* keep existing catalog if revalidation fails; backend is authoritative */
    } finally {
      setRevalidating(false);
    }
  }

  async function submit() {
    setSubmitErr("");
    if (lines.length === 0) {
      setSubmitErr("زيد منتوج على الأقل باش تأكد الطلب.");
      return;
    }
    await runSubmit(async () => {
      const phoneClean = normalizePhone(customer.phone);
      try {
        const r = await api.post<{ order_number: string; status: string; message?: string }>("/public/orders", {
          name: customer.name.trim(),
          phone: phoneClean,
          city: customer.city.trim() || undefined,
          address: customer.address.trim() || undefined,
          note: customer.note.trim() || undefined,
          items: lines.map((l) => ({ product_id: l.id, quantity: l.qty })),
        });
        const res = r.data;
        setDone({ order_number: res.order_number, status: res.status || "needs_review", message: res.message });
        setSp(
          (prev) => {
            const n = new URLSearchParams(prev);
            n.delete("step");
            return n;
          },
          { replace: true },
        );
        try { localStorage.removeItem(CART_KEY); localStorage.removeItem(CUST_KEY); } catch { /* ignore */ }
        // Best-effort: fetch the authoritative order total from the track endpoint.
        api
          .post<{ total: string; currency: string }>("/public/orders/track", { order_number: res.order_number, phone: phoneClean })
          .then((t) => setDone((d) => (d ? { ...d, total: t.data.total, currency: t.data.currency } : d)))
          .catch(() => { /* total stays hidden if this fails */ });
      } catch (e) {
        setSubmitErr(apiError(e));
      }
    });
  }

  async function copyNumber() {
    if (!done) return;
    try {
      await navigator.clipboard.writeText(done.order_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  function startOver() {
    setCart({});
    setCustomer({ ...EMPTY_CUSTOMER });
    setDone(null);
    setStep("browse");
    setFieldErrs({});
    setSubmitErr("");
  }

  const currentIndex = WIZARD.findIndex((s) => s.id === step);

  // ---------- Success ----------
  if (done) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-lg py-6 sm:py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card sm:p-8">
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">توصلنا بطلبك!</h1>
            <p className="mt-2 text-sm text-slate-500">
              غادي نتواصلو معاك قريب للتأكيد. شكرا بزاف!
            </p>

            <div className="mt-5 flex flex-col items-center gap-2">
              <span className="text-xs text-slate-500">رقم الطلب</span>
              <div className="flex items-center gap-2">
                <span className="code tnum rounded-lg bg-[#F7FAFC] px-3 py-2 text-base font-bold text-navy" dir="ltr">
                  {done.order_number}
                </span>
                <button
                  type="button"
                  onClick={copyNumber}
                  aria-label="نسخ رقم الطلب"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-[#EFFAF7] hover:text-primary"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                </button>
              </div>
              {copied && <span className="text-xs text-primary" aria-live="polite">تنسخ الرقم!</span>}
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#DDF5F0] px-4 py-2 text-sm font-semibold text-primary">
              <span>الحالة:</span>
              <span>{statusLabel(done.status)}</span>
            </div>

            {done.total ? (
              <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
                <span className="text-slate-500">المجموع النهائي</span>
                <span className="tnum text-base font-bold text-slate-900">{formatMoney(done.total, done.currency || "MAD")}</span>
              </div>
            ) : (
              <p className="mt-5 text-xs text-slate-400">المجموع النهائي غادي يتأكد معاك من طرف الفريق.</p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <Button size="lg" className="h-12 w-full gap-2" onClick={() => navigate("/public/track", { state: { orderNumber: done.order_number } })}>
                تبع الطلب ديالك <ArrowLeft className="h-4 w-4" aria-hidden />
              </Button>
              <Button variant="outline" size="lg" className="h-12 w-full gap-2" onClick={startOver}>
                <RotateCcw className="h-4 w-4" aria-hidden /> رجع للمنتوجات
              </Button>
            </div>
          </div>
        </div>
      </PublicShell>
    );
  }

  // ---------- Wizard ----------
  const trackLink = (
    <Button variant="outline" size="sm" className="h-10 gap-2" onClick={() => navigate("/public/track")}>
      تتبع الطلب
    </Button>
  );
  const cartChip =
    count > 0 ? (
      <span className="tnum inline-flex h-10 items-center gap-2 rounded-lg bg-[#DDF5F0] px-3 text-sm font-semibold text-primary">
        <ShoppingCart className="h-4 w-4" aria-hidden /> {count}
      </span>
    ) : null;

  return (
    <PublicShell end={<>{cartChip}{trackLink}</>}>
      <div className="mx-auto max-w-[1100px]">
        <OrderProgress steps={WIZARD} currentIndex={currentIndex} />

        {/* ---- Step: browse ---- */}
        {step === "browse" && (
          <div className="mt-5">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card sm:p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-sm">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="قلب على المنتوجات..."
                    className="h-11 ps-9 text-base"
                    aria-label="قلب على المنتوجات"
                  />
                </div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  <Chip active={category === "all"} onClick={() => setCategory("all")}>الكل</Chip>
                  {categories.map((c) => (
                    <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="mt-5"><PageLoader /></div>
            ) : loadErr ? (
              <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white py-10 text-center">
                <AlertTriangle className="h-10 w-10 text-warning" aria-hidden />
                <p className="text-sm font-medium text-slate-700">ما قدرناش نجيبو المنتوجات</p>
                <p className="code text-xs text-slate-500" dir="ltr">{loadErr}</p>
                <Button variant="outline" className="gap-2" onClick={loadProducts}>
                  <RotateCcw className="h-4 w-4" aria-hidden /> عاود المحاولة
                </Button>
              </div>
            ) : products.length === 0 ? (
              <div className="mt-5"><EmptyState title="ما كاينش منتوجات متوفرة دابا" /></div>
            ) : filtered.length === 0 ? (
              <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white py-10 text-center">
                <PackageSearch className="h-10 w-10 text-slate-300" aria-hidden />
                <p className="text-sm font-medium text-slate-700">ما لقينا حتى منتوج بهاد البحث</p>
                <button type="button" className="text-sm font-semibold text-primary" onClick={() => { setSearch(""); setCategory("all"); }}>
                  مسح البحث
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-6">
                {Object.entries(grouped).map(([cat, list]) => (
                  <section key={cat}>
                    <h2 className="mb-3 text-base font-semibold text-slate-900">{cat}</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                      {list.map((p) => (
                        <ProductCard key={p.id} product={p} qty={cart[p.id] || 0} onQty={(next) => setQty(p.id, next)} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- Step: cart ---- */}
        {step === "cart" && (
          <div className="mt-5">
            <OrderSummary lines={lines} editable onQty={setQty} onRemove={(id) => setQty(id, 0)} />
          </div>
        )}

        {/* ---- Step: info ---- */}
        {step === "info" && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
                <User className="h-5 w-5 text-primary" aria-hidden /> معلومات التوصيل
              </h2>
              <div className="grid gap-4">
                <Field label="الاسم الكامل" required error={fieldErrs.name} htmlFor="pf-name">
                  <Input
                    id="pf-name"
                    value={customer.name}
                    onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                    placeholder="دخل الاسم الكامل ديالك"
                    className="h-11 text-base"
                  />
                </Field>
                <Field label="رقم الهاتف" required error={fieldErrs.phone} htmlFor="pf-phone">
                  <Input
                    id="pf-phone"
                    value={customer.phone}
                    onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="06XXXXXXXX"
                    className="code h-11 text-base"
                    inputMode="tel"
                    dir="ltr"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="المدينة" required error={fieldErrs.city} htmlFor="pf-city">
                    <Input
                      id="pf-city"
                      value={customer.city}
                      onChange={(e) => setCustomer((c) => ({ ...c, city: e.target.value }))}
                      placeholder="المدينة ديالك"
                      className="h-11"
                    />
                  </Field>
                  <Field label="العنوان" required error={fieldErrs.address} htmlFor="pf-address">
                    <Input
                      id="pf-address"
                      value={customer.address}
                      onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
                      placeholder="العنوان بالتفصيل"
                      className="h-11"
                    />
                  </Field>
                </div>
                <Field label="ملاحظة إضافية" htmlFor="pf-note">
                  <Textarea
                    id="pf-note"
                    rows={3}
                    value={customer.note}
                    onChange={(e) => setCustomer((c) => ({ ...c, note: e.target.value }))}
                    placeholder="أي حاجة بغيتي تضيفها (اختياري)"
                  />
                </Field>
              </div>
            </div>

            <div className="space-y-4">
              <OrderSummary lines={lines} />
            </div>
          </div>
        )}

        {/* ---- Step: confirm ---- */}
        {step === "confirm" && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">راجع المعلومات ديالك</h2>
                <Button variant="ghost" size="sm" onClick={() => setStep("info")}>بدل المعلومات</Button>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="الاسم" value={customer.name} Icon={User} />
                <Info label="الهاتف" value={customer.phone} Icon={Phone} code />
                <Info label="المدينة" value={customer.city} Icon={MapPin} />
                <Info label="العنوان" value={customer.address} Icon={MapPin} />
              </dl>
              {customer.note && (
                <div className="mt-3 rounded-lg bg-[#F7FAFC] p-3 text-sm">
                  <span className="text-slate-500">ملاحظة: </span>
                  <span className="text-slate-900">{customer.note}</span>
                </div>
              )}

              {revalidateMsg && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-slate-800" role="status">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                  {revalidateMsg}
                </div>
              )}

              <div className="mt-4">
                <OrderSummary lines={lines} />
              </div>
            </div>

            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
                <h2 className="mb-3 text-base font-semibold text-slate-900">ملخص الطلب</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">عدد المنتوجات</span><span className="tnum font-medium">{count}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">المجموع التقريبي</span><span className="tnum font-medium">{formatMoney(subtotalCents / 100)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">التوصيل</span><span className="text-slate-500">يتحدد لاحقا</span></div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base font-bold">
                    <span>المجموع التقريبي</span>
                    <span className="tnum">{formatMoney(subtotalCents / 100)}</span>
                  </div>
                </div>
                <p className="mt-2 text-center text-xs text-slate-400">المجموع النهائي كيتأكد من طرف الفريق بعد المراجعة.</p>
                {submitErr && <div className="mt-3" role="alert"><FieldError>{submitErr}</FieldError></div>}
                <Button size="lg" className="mt-4 h-12 w-full gap-2" loading={sending} disabled={lines.length === 0 || sending} onClick={submit}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> أكد وأرسل الطلب
                </Button>
                <p className="mt-2 text-center text-xs text-slate-400">غادي نتواصلو معاك باش نأكدو الطلب.</p>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* ---- Sticky action bar ---- */}
      {step === "browse" ? (
        <div className="sticky bottom-0 z-20 -mx-3 mt-6 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
          <div className="mx-auto flex max-w-[1100px] items-center gap-3">
            <div className="flex flex-col leading-tight">
              <span className="text-xs text-slate-500">{count} عنصر</span>
              <span className="tnum text-base font-bold text-slate-900">{formatMoney(subtotalCents / 100)}</span>
            </div>
            <Button size="lg" className="ms-auto min-w-[180px] gap-2" disabled={count === 0} onClick={() => setStep("cart")}>
              كمل الطلب <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : (
        <WizardFooter
          backLabel={step === "cart" ? "رجع للمنتوجات" : step === "info" ? "رجع للسلة" : "بدل المعلومات"}
          onBack={() => setStep(step === "cart" ? "browse" : step === "info" ? "cart" : "info")}
          nextLabel={step === "cart" ? "معلومات التوصيل" : step === "info" ? "أكد الطلب" : "تأكيد الطلب"}
          onNext={() => (step === "cart" ? setStep("info") : step === "info" ? toConfirm() : submit())}
          nextDisabled={(step !== "confirm" && count === 0) || revalidating}
          sending={sending}
          hint={
            step === "cart" || step === "info" ? (
              <span className="tnum hidden text-sm text-slate-500 sm:inline">{formatMoney(subtotalCents / 100)}</span>
            ) : undefined
          }
        />
      )}
    </PublicShell>
  );
}

// ---------- Small helpers ----------

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "h-9 whitespace-nowrap rounded-full bg-primary px-4 text-sm font-semibold text-white"
          : "h-9 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:border-primary hover:text-primary"
      }
    >
      {children}
    </button>
  );
}

function Field({ label, required, error, children, htmlFor }: { label: string; required?: boolean; error?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <Label required={required} htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function Info({ label, value, Icon, code = false }: { label: string; value: string; Icon: typeof User; code?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-[#F7FAFC] p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className={`mt-0.5 text-sm font-medium text-slate-900 ${code ? "code tnum" : ""}`} dir={code ? "ltr" : undefined}>
          {value || "—"}
        </dd>
      </div>
    </div>
  );
}

function WizardFooter({
  backLabel,
  onBack,
  nextLabel,
  onNext,
  nextDisabled,
  sending,
  hint,
}: {
  backLabel: string;
  onBack: () => void;
  nextLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
  sending?: boolean;
  hint?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-3 mt-6 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
      <div className="mx-auto flex max-w-[1100px] items-center gap-3">
        <Button variant="outline" size="lg" className="gap-2" onClick={onBack}>
          <ArrowRight className="h-4 w-4" aria-hidden /> {backLabel}
        </Button>
        <div className="ms-auto flex items-center gap-3">
          {hint}
          <Button size="lg" className="min-w-[180px] gap-2" onClick={onNext} disabled={nextDisabled} loading={sending}>
            {nextLabel} <ArrowLeft className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
