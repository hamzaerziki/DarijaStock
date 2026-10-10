import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Import from "./pages/Import";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import Invoices from "./pages/Invoices";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import PublicOrder from "./pages/PublicOrder";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/public/order" element={<PublicOrder />} />
      <Route element={<Layout />}>
        <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute perm="view_authorized_records"><Orders /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute perm="view_authorized_records"><OrderDetail /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute perm="import_messages"><Import /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute perm="view_permitted_products"><Products /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute perm="view_permitted_customers"><Customers /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute perm="view_inventory"><Inventory /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute perm="view_invoice_history"><Invoices /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute perm="view_reports"><Reports /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute perm="manage_users"><Users /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
