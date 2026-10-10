import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  MessagesSquare,
  Package,
  Boxes,
  Users,
  FileText,
  BarChart3,
  UserCog,
  LogOut,
  Menu,
  Store,
} from "lucide-react";
import { useAuth, type CurrentUser } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Package; perms?: string[]; anyOf?: string[] };

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "لوحة القيادة", icon: LayoutDashboard, perms: ["view_authorized_records"] },
  { to: "/orders", label: "الكوموندات", icon: ClipboardList, perms: ["view_authorized_records"] },
  { to: "/import", label: "استيراد المسجات", icon: MessagesSquare, perms: ["import_messages"] },
  { to: "/products", label: "المنتجات", icon: Package, perms: ["view_permitted_products"] },
  { to: "/customers", label: "الزبائن", icon: Users, perms: ["view_permitted_customers"] },
  { to: "/inventory", label: "الستوك", icon: Boxes, perms: ["view_inventory"] },
  { to: "/invoices", label: "الفوترة", icon: FileText, perms: ["view_invoice_history"] },
  { to: "/reports", label: "التقارير", icon: BarChart3, perms: ["view_reports"] },
  { to: "/users", label: "المستخدمين", icon: UserCog, perms: ["manage_users"] },
];

const ADMIN = "admin";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const visible = (user: CurrentUser | null) =>
    NAV_ITEMS.filter((it) => {
      if (!user) return false;
      if (user.role === ADMIN) return true;
      if (it.perms && it.perms.some((p) => user.permissions?.includes(p))) return true;
      if (it.anyOf && it.anyOf.some((p) => user.permissions?.includes(p))) return true;
      return false;
    });

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "sticky top-0 flex h-screen flex-col border-e border-slate-800 bg-navy text-slate-300 transition-all",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <button className="flex items-center gap-2 px-4 py-4" onClick={() => navigate("/")}>
          <Store className="h-6 w-6 text-teal-400" />
          {!collapsed && <span className="text-lg font-bold text-white">DarijaStock</span>}
        </button>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
          {visible(user).map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              title={it.label}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-teal-700 text-white" : "hover:bg-slate-800 hover:text-white",
                  collapsed && "justify-center px-0"
                )
              }
            >
              <it.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{it.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-2">
          <div className={cn("mb-1 px-2 py-2", collapsed && "text-center")}>
            {!collapsed && (
              <>
                <p className="truncate text-sm font-medium text-white">{user?.full_name || user?.email}</p>
                <p className="text-xs text-slate-400">{user?.role}</p>
              </>
            )}
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center gap-2 border-t border-slate-800 py-2 text-slate-400 hover:text-white"
          aria-label="طي القائمة"
        >
          <Menu className="h-4 w-4" />
        </button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-5 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}