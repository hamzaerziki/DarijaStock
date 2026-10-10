import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/ui/table";

export function ProtectedRoute({ children, perm }: { children: React.ReactNode; perm?: string }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (perm && user.role !== "admin" && !user.permissions?.includes(perm)) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-800">
        ما عندكش الصلاحية لدخول هاد الصفحة. / Accès non autorisé.
      </div>
    );
  }
  return <>{children}</>;
}