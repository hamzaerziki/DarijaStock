import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Input, FieldError } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { LogIn } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      push("تسجيل الدخول تم بنجاح / Connexion réussie", "success");
      navigate("/");
    } catch (e) {
      const m = apiError(e);
      setErr(m);
      push(m, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700">
            <LogIn className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">DarijaStock</CardTitle>
          <p className="text-sm text-slate-500">تسجيل الدخول</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
            </div>
            <div>
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {err && <FieldError>{err}</FieldError>}
            <Button type="submit" className="w-full" loading={loading}>
              الدخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}