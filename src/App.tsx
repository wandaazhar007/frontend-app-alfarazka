import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingOverlay from './components/LoadingOverlay/LoadingOverlay';
import AppLayout from './components/Layout/AppLayout';
import SellerLayout from './components/Layout/SellerLayout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProductsPage from './pages/admin/ProductsPage';
import ProductCategoriesPage from './pages/admin/ProductCategoriesPage';
import SellersPage from './pages/admin/SellersPage';
import StockMorningPage from './pages/admin/StockMorningPage';
import StockEveningPage from './pages/admin/StockEveningPage';
import DailySettlementPage from './pages/admin/DailySettlementPage';
import DailyReportPage from './pages/reports/DailyReportPage';
import ExpensesPage from './pages/admin/ExpensesPage';
import ExpenseCategoriesPage from './pages/admin/ExpenseCategoriesPage';
import DailyClosingPage from './pages/admin/DailyClosingPage';
import CustomersPage from './pages/admin/CustomersPage';
import TokoSalePage from './pages/admin/TokoSalePage';
import PaketSalePage from './pages/admin/PaketSalePage';
import ReceivablesPage from './pages/receivables/ReceivablesPage';
import AuditLogPage from './pages/owner/AuditLogPage';
import UsersPage from './pages/owner/UsersPage';
import LicensePage from './pages/LicensePage';
import SellerDashboard from './pages/seller/SellerDashboard';

function RootRedirect() {
  const { appUser, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay message="Memuat..." />;
  }

  if (!appUser) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/${appUser.role}`} replace />;
}

// Standalone (not under AppLayout/SellerLayout) so it isn't tied to a
// role-specific shell — applies to any role that has mustChangePassword.
function ChangePasswordRoute() {
  const { appUser, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay message="Memuat..." />;
  }

  if (!appUser) {
    return <Navigate to="/login" replace />;
  }

  if (!appUser.mustChangePassword) {
    return <Navigate to={`/${appUser.role}`} replace />;
  }

  return <ChangePassword />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePasswordRoute />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Shell admin/owner: sidebar + topbar (§6) */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['admin', 'owner']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/owner"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/product-categories"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ProductCategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sellers"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SellersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stock/morning"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StockMorningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stock/evening"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StockEveningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/daily-settlement"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DailySettlementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/daily"
          element={
            <ProtectedRoute allowedRoles={['admin', 'owner']}>
              <DailyReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/expenses"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ExpensesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/expense-categories"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ExpenseCategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/daily-closing"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DailyClosingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/customers"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CustomersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sales/toko"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <TokoSalePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/sales/paket"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PaketSalePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receivables"
          element={
            <ProtectedRoute allowedRoles={['admin', 'owner']}>
              <ReceivablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/users"
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/license"
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <LicensePage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Shell seller: topbar + bottom nav (§6, §8.8) */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['seller']}>
            <SellerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/seller" element={<SellerDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
