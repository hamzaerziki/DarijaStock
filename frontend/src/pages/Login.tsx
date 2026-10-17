import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label, Input, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Store, Package, ClipboardList, BarChart3, ShieldCheck, Lock, Mail, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sp] = useSearchParams();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const { busy, run } = useSubmitLock();
  usePageTitle("تسجيل الدخول");

  // Where to go after a successful login: ?next= (set by the 401 interceptor)
  // wins, then ProtectedRoute's state.from, else the dashboard.
  const from = sp.get("next") || (location.state as { from?: string } | null)?.from || "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    await run(async () => {
      try {
        await login(email, password);
        push("تسجيل الدخول تم بنجاح / Connexion réussie", "success");
        navigate(from, { replace: true });
      } catch (e) {
        const m = apiError(e);
        setErr(m);
        push(m, "error");
      }
    });
  }

  return (
    <div className="min-h-screen bg-navy lg:grid lg:grid-cols-2">
      {/* Branding panel (hidden on small screens) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(13,129,119,0.6) 0, transparent 45%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-card">
              <Store className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-2xl font-bold tracking-tight">DarijaStock</span>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-snug">
            كل الكوموندات والستوك <span className="text-primary">فبلاصة وحدة</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            تسيير ديال المنتجات، الزبائن، الفوترة والتقارير — بواجهة عربية ساهلة وسريعة.
          </p>

          <ul className="mt-8 space-y-4">
            <Feature icon={ClipboardList} text="تسيير الكوموندات من الاستيراد حتى التسليم" />
            <Feature icon={Package} text="متابعة الستوك والتنبيهات فاش كينقص" />
            <Feature icon={BarChart3} text="تقارير وأرقام واضحة على كل نشاط" />
            <Feature icon={ShieldCheck} text="صلاحيات لكل مستخدم حسب الدور ديالو" />
          </ul>
        </div>

        <p className="relative text-xs text-white/50">DarijaStock — تسيير الكوموندات والستوك</p>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6">
        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="mb-6 flex flex-col items-center gap-3 lg:hidden">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-card">
              <Store className="h-7 w-7" aria-hidden />
            </span>
            <span className="text-2xl font-bold text-slate-900">DarijaStock</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">مرحبا بيك من جديد</h1>
              <p className="mt-1 text-sm text-slate-500">دخل للأكونت ديالك باش تكمل التسيير</p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                    className="h-11 ps-9"
                    placeholder="name@example.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="h-11 ps-9 pe-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    aria-label={showPw ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    aria-pressed={showPw}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div aria-live="polite">{err && <FieldError>{err}</FieldError>}</div>

              <Button type="submit" className="h-12 w-full text-base" size="lg" loading={busy}>
                دخول
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              نسيت كلمة السر؟ تواصل مع المسؤول ديال النظام
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400 lg:hidden">
            DarijaStock — تسيير الكوموندات والستوك
          </p>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof Package; text: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-white/90">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      {text}
    </li>
  );
}
