import { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { EmptyState, PageLoader } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/card";
import { UserPlus, UserCog } from "lucide-react";

type User = { id: number; email: string; full_name: string; role: string; is_active: boolean };

const ROLES: { value: string; label: string }[] = [
  { value: "admin", label: "مدير النظام" },
  { value: "order_operator", label: "عامل الكوموندات" },
  { value: "stock_manager", label: "مسؤول الستوك" },
  { value: "order_approver", label: "مصادق الكوموندات" },
  { value: "invoice_operator", label: "عامل الفوترة" },
  { value: "read_only", label: "قراءة فقط" },
];

export default function Users() {
  const { push } = useToast();
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
  useEffect(() => { load(); }, []);

  return (
    <>
      <PageHeader title="المستخدمين" subtitle="إدارة الحسابات والأدوار" actions={
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <UserPlus className="h-4 w-4" /> مستخدم جديد
        </Button>
      } />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" /> لائحة المستخدمين</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <PageLoader /> : items.length === 0 ? <EmptyState title="ما كاينش مستخدمين" /> : (
            <div className="table-wrap border-0">
              <table className="data-table">
                <thead><tr><th>الإيميل</th><th>الاسم</th><th>الدور</th><th>الحالة</th><th className="text-left">أفعال</th></tr></thead>
                <tbody>
                  {items.map((u) => (
                    <tr key={u.id}>
                      <td className="code">{u.email}</td>
                      <td>{u.full_name}</td>
                      <td><Badge tone="navy">{ROLES.find((r) => r.value === u.role)?.label ?? u.role}</Badge></td>
                      <td>{u.is_active ? <Badge tone="green">نشط</Badge> : <Badge tone="red">موقوف</Badge>}</td>
                      <td className="text-left">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setOpen(true); }}>تعديل</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {open && <UserDialog user={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </>
  );
}

function UserDialog({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const [email, setEmail] = useState(user?.email ?? "");
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [role, setRole] = useState(user?.role ?? "read_only");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    setLoading(true);
    try {
      if (user) {
        await api.patch(`/users/${user.id}`, { full_name: fullName, role, is_active: isActive, password: password || undefined });
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={user ? "تعديل مستخدم" : "مستخدم جديد"} size="sm"
      footer={<><Button onClick={save} loading={loading}>{user ? "حفظ" : "إنشاء"}</Button><Button variant="outline" onClick={onClose}>إلغاء</Button></>}>
      <div className="space-y-3">
        {!user && (
          <div>
            <Label required>البريد الإلكتروني</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="user@example.com" />
          </div>
        )}
        <div>
          <Label required>الاسم الكامل</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label required>الدور</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </div>
        <div>
          <Label>{user ? "كلمة سر جديدة (اختياري)" : "كلمة السر"}</Label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="على الأقل 8 حروف" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> الحساب نشط
        </label>
        {err && <FieldError>{err}</FieldError>}
      </div>
    </Dialog>
  );
}
