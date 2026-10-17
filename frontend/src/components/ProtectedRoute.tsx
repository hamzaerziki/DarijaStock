import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export function ProtectedRoute({ children, perm }: { children: React.ReactNode; perm?: string }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (perm && user.role !== "admin" && !user.permissions?.includes(perm)) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft text-warning-text">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">ما عندكش الصلاحية لدخول هاد الصفحة</h2>
        <p className="mt-1 text-sm text-slate-500">تواصل مع مدير النظام إلا كنت كتحتاج هاد الصلاحية.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button variant="outline">رجوع للوحة القيادة</Button>
        </Link>
      </Card>
    );
  }
  return <>{children}</>;
}
