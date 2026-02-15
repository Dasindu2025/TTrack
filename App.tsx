
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Approvals } from './pages/Approvals';
import { Employees } from './pages/Employees';
import { Reports } from './pages/Reports';
import { DetailedReports } from './pages/DetailedReports';
import { Settings } from './pages/Settings';
import { Companies } from './pages/Companies';
import { Projects } from './pages/Projects';
import { Policies } from './pages/Policies';
import { AuditLogs } from './pages/AuditLogs';
import { Loader2 } from 'lucide-react';

// Protected Route Wrapper with Role Check
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const userStr = localStorage.getItem('tyo_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/companies" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <Companies />
          </ProtectedRoute>
        } />

        {/* Company Admin Routes */}
        <Route path="/approvals" element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'SUPER_ADMIN']}>
            <Approvals />
          </ProtectedRoute>
        } />

        <Route path="/employees" element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'SUPER_ADMIN']}>
            <Employees />
          </ProtectedRoute>
        } />

        <Route path="/projects" element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <Projects />
          </ProtectedRoute>
        } />

        <Route path="/policies" element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <Policies />
          </ProtectedRoute>
        } />

        <Route path="/audit-logs" element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN']}>
            <AuditLogs />
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'SUPER_ADMIN']}>
            <Reports />
          </ProtectedRoute>
        } />

        {/* Employee Routes */}
        <Route path="/detailed-reports" element={
          <ProtectedRoute allowedRoles={['EMPLOYEE']}>
            <DetailedReports />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </HashRouter>
  );
};

export default App;
