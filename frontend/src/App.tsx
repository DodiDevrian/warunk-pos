import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/misc';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import Dashboard from '@/pages/Dashboard';
import Products from '@/pages/Products';
import Categories from '@/pages/Categories';
import Suppliers from '@/pages/Suppliers';
import Customers from '@/pages/Customers';
import Inventory from '@/pages/Inventory';
import Purchases from '@/pages/Purchases';
import POS from '@/pages/POS';
import Sales from '@/pages/Sales';
import Reports from '@/pages/Reports';
import Users from '@/pages/Users';
import SettingsPage from '@/pages/Settings';
import Profile from '@/pages/Profile';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<ProtectedRoute roles={['administrator', 'kasir']} />}>
            <Route index element={<POS />} />
          </Route>
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/reports" element={<ProtectedRoute roles={['administrator', 'owner']} />}>
            <Route index element={<Reports />} />
          </Route>
          <Route path="/users" element={<ProtectedRoute roles={['administrator']} />}>
            <Route index element={<Users />} />
          </Route>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
