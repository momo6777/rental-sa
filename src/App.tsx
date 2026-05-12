import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { useAuth } from './hooks/useAuth';
import { generateNotifications } from './lib/notificationService';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Units from './pages/Units';
import Tenants from './pages/Tenants';
import TenantDetails from './pages/TenantDetails';
import Contracts from './pages/Contracts';
import Payments from './pages/Payments';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';
import Accounting from './pages/Accounting';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) generateNotifications();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ConfigProvider direction="rtl">
      <BrowserRouter>
        {user ? (
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate replace to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/units" element={<Units />} />
              <Route path="/tenants/:id" element={<TenantDetails />} />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/accounting" element={<Accounting />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/login" element={<Navigate replace to="/dashboard" />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        ) : (
          <>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate replace to="/login" />} />
            </Routes>
          </>
        )}
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;