import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  X,
  Store,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useAuth, type CurrentUser } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/labels";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useFocusTrap } from "@/hooks/useFocusTrap";

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

/** Route → document title (first match wins; order matters). */
const TITLES: [RegExp, string][] = [
  [/^\/orders\/[^/]+$/, "تفاصيل الكوموند"],
  [/^\/orders/, "الكوموندات"],
  [/^\/import/, "استيراد المسجات"],
  [/^\/products\/[^/]+$/, "تفاصيل المنتج"],
  [/^\/products/, "المنتجات"],
  [/^\/customers/, "الزبائن"],
  [/^\/inventory/, "الستوك"],
  [/^\/invoices/, "الفوترة"],
  [/^\/reports/, "التقارير"],
  [/^\/users/, "المستخدمين"],
  [/^\/$/, "لوحة القيادة"],
];

const COLLAPSE_KEY = "darjastock_sidebar_collapsed";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  useFocusTrap(asideRef, mobileOpen);

  const title = TITLES.find(([re]) => re.test(location.pathname))?.[1] ?? "لوحة القيادة";
  usePageTitle(title);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const visible = (u: CurrentUser | null) =>
    NAV_ITEMS.filter((it) => {
      if (!u) return false;
      if (u.role === ADMIN) return true;
      if (it.perms && it.perms.some((p) => u.permissions?.includes(p))) return true;
      if (it.anyOf && it.anyOf.some((p) => u.permissions?.includes(p))) return true;
      return false;
    });

  function doLogout() {
    logout();
    navigate("/login");
  }

  const initial = (user?.full_name || user?.email || "?").trim().charAt(0).toUpperCase();
  const role = user ? roleLabel(user.role) : "";

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        تخطى إلى المحتوى
      </a>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0B1B2D]/45 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex min-h-screen">
        <aside
          ref={asideRef}
          tabIndex={-1}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-screen w-[248px] flex-col border-e border-white/10 bg-navy text-sidebar-text transition-transform duration-200 ease-in-out focus:outline-none",
            "lg:sticky lg:top-0 lg:z-30 lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
            collapsed && "lg:w-[76px]"
          )}
          aria-label="التنقل الرئيسي"
        >
          {/* Brand / logo area */}
          <div className="flex h-[70px] shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
            <button
              onClick={() => navigate("/")}
              className="flex min-w-0 items-center gap-2.5 rounded-lg transition-opacity hover:opacity-90"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                <Store className="h-5 w-5" />
              </span>
              {!collapsed && <span className="truncate text-[17px] font-bold text-white">DarijaStock</span>}
            </button>
            <button
              onClick={() => setMobileOpen(false)}
              className="ms-auto flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
            {visible(user).map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                title={it.label}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-sidebar-text/90 hover:bg-white/10 hover:text-white",
                    collapsed && "lg:justify-center lg:px-0"
                  )
                }
              >
                <it.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Footer: identity + logout */}
          <div className="shrink-0 border-t border-white/10 p-3">
            <div className={cn("mb-1 flex items-center gap-2.5 px-2 py-2", collapsed && "lg:justify-center lg:px-0")}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {initial}
              </span>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">{user?.full_name || user?.email}</p>
                  <p className="truncate text-[11px] text-sidebar-muted">{role}</p>
                </div>
              )}
            </div>
            <button
              onClick={doLogout}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-text/90 transition-colors hover:bg-white/10 hover:text-white",
                collapsed && "lg:justify-center lg:px-0"
              )}
              title="تسجيل الخروج"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span>تسجيل الخروج</span>}
            </button>
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden shrink-0 items-center justify-center gap-2 border-t border-white/10 py-2.5 text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white lg:flex"
            aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            {collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
          </button>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-[#EDF4F8] hover:text-slate-900 lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Store className="h-4 w-4" />
              </span>
              <span className="text-base font-bold text-slate-900">DarijaStock</span>
            </div>

            <div className="ms-auto flex items-center gap-3">
              <div className="hidden items-center gap-2.5 sm:flex">
                <div className="text-start">
                  <p className="text-[13px] font-semibold text-slate-900">{user?.full_name || user?.email}</p>
                  <p className="text-[11px] text-slate-500">{role}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                  {initial}
                </span>
              </div>
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="flex-1 p-3 md:p-[18px] lg:p-[26px] focus:outline-none">
            <div className="mx-auto w-full max-w-[1600px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
