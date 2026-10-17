import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { EmptyState, PageLoader } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { DataTable, type Column } from "@/components/data/DataTable";
import { useSubmitLock } from "@/hooks/useSubmitLock";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, roleLabel } from "@/lib/labels";
import { UserPlus, UserCog, ShieldAlert, Eye, EyeOff } from "lucide-react";

type User = { id: number; email: string; full_name: string; role: string; is_active: boolean };

const ROLES = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

export default function Users() {
  const { push } = useToast();
  const { user: me } = useAuth();
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get<User[]>("/users");
      setItems(r.data);
    } catch (e) {
      push(apiError(e), "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const columns: Column<User>[] = [
    {
      key: "email",
      header: "الإيميل",
      priority: "primary",
      cell: (u) => (
        <span className="code font-semibold text-slate-900" dir="ltr">
          {u.email}
        </span>
      ),
    },
    { key: "name", header: "الاسم", cell: (u) => u.full_name },
    { key: "role", header: "الدور", cell: (u) => <Badge tone="navy">{roleLabel(u.role)}</Badge> },
    {
      key: "status",
      header: "الحالة",
      priority: "badge",
      cell: (u) => (u.is_active ? <Badge tone="green">نشط</Badge> : <Badge tone="red">موقوف</Badge>),
    },
  ];

  return (
    <>
      <PageHeader
        title="المستخدمين"
        subtitle="إدارة الحسابات والأدوار"
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <UserPlus className="h-4 w-4" /> مستخدم جديد
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" /> لائحة المستخدمين
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <PageLoader />
          ) : items.length === 0 ? (
            <EmptyState title="ما كاينش مستخدمين" />
          ) : (
            <DataTable
              columns={columns}
              items={items}
              rowKey={(u) => u.id}
              rowActions={(u) => (
                <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setOpen(true); }} aria-label={`تعديل ${u.email}`}>
                  تعديل
                </Button>
              )}
            />
          )}
        </CardContent>
      </Card>
      {open && (
        <UserDialog
          user={editing}
          isSelf={editing?.id === me?.id}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); load(); }}
        />
      )}
    </>
  );
}

function UserDialog({
  user,
  isSelf,
  onClose,
  onSaved,
}: {
  user: User | null;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [email, setEmail] = useState(user?.email ?? "");
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [role, setRole] = useState(user?.role ?? "read_only");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const { busy, run } = useSubmitLock();

  async function save() {
    setErr("");
    if (!fullName.trim()) return setErr("الاسم الكامل مطلوب");
    if (!user && !email.trim()) return setErr("البريد الإلكتروني مطلوب");
    if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr("البريد الإلكتروني غير صحيح");
    if (!user && password.length < 8) return setErr("كلمة السر خاصها تكون على الأقل 8 حروف");
    if (user && password && password.length < 8) return setErr("كلمة السر خاصها تكون على الأقل 8 حروف");
    await run(async () => {
      try {
        if (user) {
          await api.patch(`/users/${user.id}`, {
            full_name: fullName,
            role: isSelf ? undefined : role,
            is_active: isSelf ? undefined : isActive,
            password: password || undefined,
          });
          push("تم التعديل", "success");
        } else {
          await api.post("/users", { email, full_name: fullName, role, is_active: isActive, password });
          push("تم إنشاء المستخدم", "success");
        }
        onSaved();
      } catch (e) {
        const m = apiError(e);
        setErr(m);
        push(m, "error");
      }
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={user ? "تعديل مستخدم" : "مستخدم جديد"}
      size="sm"
      footer={
        <>
          <Button onClick={save} loading={busy} disabled={busy}>
            {user ? "حفظ" : "إنشاء"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {isSelf && (
          <div className="flex items-start gap-2 rounded-lg border border-warning-soft bg-warning-soft/50 p-3 text-xs text-warning-text">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ما يمكنش تبدل الدور أو توقف الحساب ديالك بوحدك.
          </div>
        )}
        {!user && (
          <div>
            <Label htmlFor="u-email" required>البريد الإلكتروني</Label>
            <Input id="u-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="user@example.com" dir="ltr" />
          </div>
        )}
        <div>
          <Label htmlFor="u-name" required>الاسم الكامل</Label>
          <Input id="u-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="u-role" required>الدور</Label>
          <Select id="u-role" value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-slate-400">{ROLE_DESCRIPTIONS[role]}</p>
        </div>
        <div>
          <Label htmlFor="u-pw">{user ? "كلمة سر جديدة (اختياري)" : "كلمة السر"}</Label>
          <div className="relative">
            <Input
              id="u-pw"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPw ? "text" : "password"}
              placeholder="على الأقل 8 حروف"
              className="pe-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={showPw ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              aria-pressed={showPw}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isSelf}
          />
          {user ? "الحساب نشط" : "حساب نشط من البداية"}
        </label>
        {err && <FieldError>{err}</FieldError>}
      </div>
    </Dialog>
  );
}
