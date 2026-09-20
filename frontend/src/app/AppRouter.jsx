import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';
import HomePage from '../pages/HomePage';
import AuthPage from '../pages/AuthPage';
import FeatureUnavailablePage from '../pages/FeatureUnavailablePage';
import AppHeader from '../components/AppHeader';
import { useAuth } from '../features/auth/useAuth';
import useModules from '../features/modules/useModules';

const AdminModulesPage = lazy(() => import('../pages/AdminModulesPage'));

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { isLoading, isEnabled } = useModules();

  if (isLoading) {
    return <div className="app-loading"><Spin size="large" /></div>;
  }

  return (
    <Routes>
      <Route path="/" element={isEnabled('listings') ? <HomePage /> : <FeatureUnavailablePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/admin/modules" element={(
        <AdminRoute>
          <Suspense fallback={<div className="app-loading"><Spin size="large" /></div>}>
            <AdminModulesPage />
          </Suspense>
        </AdminRoute>
      )} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppRouter() {
  return (
    <BrowserRouter>
      <AppHeader />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default AppRouter;
