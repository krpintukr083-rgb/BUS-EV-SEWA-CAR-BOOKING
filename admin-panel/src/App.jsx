import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLayout from './layouts/AdminLayout';

// Pages
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import CustomerManagement from './pages/CustomerManagement';
import DriverManagement from './pages/DriverManagement';
import DriverVerification from './pages/DriverVerification';
import VehicleManagement from './pages/VehicleManagement';
import BusManagement from './pages/BusManagement';
import EvSewaManagement from './pages/EvSewaManagement';
import CarManagement from './pages/CarManagement';
import DriverAssignment from './pages/DriverAssignment';
import DocumentRecords from './pages/DocumentRecords';
import BookingManagement from './pages/BookingManagement';
import PaymentManagement from './pages/PaymentManagement';
import WithdrawalManagement from './pages/WithdrawalManagement';
import CancellationManagement from './pages/CancellationManagement';
import AccidentInsurance from './pages/AccidentInsurance';
import Notifications from './pages/Notifications';
import CustomerSupport from './pages/CustomerSupport';
import PoliciesManagement from './pages/PoliciesManagement';
import BasicReports from './pages/BasicReports';
import ServiceControl from './pages/ServiceControl';
import BannerManagement from './pages/BannerManagement';
import ApprovalManagement from './pages/ApprovalManagement';
import VehicleApproval from './pages/VehicleApproval';
import ScheduleApproval from './pages/ScheduleApproval';
import SubAdminManagement from './pages/SubAdminManagement';

const PermissionDenied = () => (
  <div className="content-card" role="alert">
    <h1 className="card-title">Permission denied</h1>
    <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
      Your account does not have permission to access this section.
    </p>
  </div>
);

const AdminPanelRoute = ({ children, permission, superAdminOnly = false }) => {
  const { adminUser, loading, hasPermission, isSuperAdmin } = useAdminAuth();
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Verifying admin session...</div>;
  }
  if (!adminUser || !['admin', 'super_admin', 'sub_admin'].includes(adminUser.role)) {
    return <Navigate to="/login" replace />;
  }
  if (superAdminOnly && !isSuperAdmin()) return <PermissionDenied />;
  if (permission && (
    Array.isArray(permission)
      ? permission.some(requiredPermission => !hasPermission(requiredPermission))
      : !hasPermission(permission)
  )) return <PermissionDenied />;
  return children;
};

const AdminPage = ({ children, permission, superAdminOnly }) => (
  <AdminPanelRoute permission={permission} superAdminOnly={superAdminOnly}>
    {children}
  </AdminPanelRoute>
);

// Admin Protected Route
const AdminProtectedRoute = ({ children }) => {
  const { adminUser, loading } = useAdminAuth();
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Verifying admin session...</div>;
  }
  if (!adminUser || !['admin', 'super_admin', 'sub_admin'].includes(adminUser.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />

      <Route
        path="/"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<AdminPage><Dashboard /></AdminPage>} />
        <Route path="customers" element={<AdminPage permission="customer.view"><CustomerManagement /></AdminPage>} />
        <Route path="drivers" element={<AdminPage permission="driver.view"><DriverManagement /></AdminPage>} />
        <Route path="driver-verification" element={<AdminPage permission="driver.kyc"><DriverVerification /></AdminPage>} />
        <Route path="vehicles" element={<AdminPage permission="vehicle.view"><VehicleManagement /></AdminPage>} />
        <Route path="approvals" element={<AdminPage permission="vehicle.approve"><ApprovalManagement /></AdminPage>} />
        <Route path="vehicle-approval" element={<AdminPage permission="vehicle.approve"><VehicleApproval /></AdminPage>} />
        <Route path="schedule-approval" element={<AdminPage permission={['vehicle.view', 'vehicle.approve']}><ScheduleApproval /></AdminPage>} />
        <Route path="bus-management" element={<AdminPage permission="vehicle.view"><BusManagement /></AdminPage>} />
        <Route path="ev-sewa-management" element={<AdminPage permission="vehicle.view"><EvSewaManagement /></AdminPage>} />
        <Route path="car-management" element={<AdminPage permission="vehicle.view"><CarManagement /></AdminPage>} />
        <Route path="driver-assignment" element={<AdminPage permission="vehicle.assign_driver"><DriverAssignment /></AdminPage>} />
        <Route path="document-records" element={<AdminPage permission="driver.kyc"><DocumentRecords /></AdminPage>} />
        <Route path="bookings" element={<AdminPage permission="booking.view"><BookingManagement /></AdminPage>} />
        <Route path="payments" element={<AdminPage permission="payment.view"><PaymentManagement /></AdminPage>} />
        <Route path="withdrawals" element={<AdminPage permission="withdrawal.view"><WithdrawalManagement /></AdminPage>} />
        <Route path="cancellations" element={<AdminPage permission="cancellation.view"><CancellationManagement /></AdminPage>} />
        <Route path="banner-management" element={<AdminPage superAdminOnly><BannerManagement /></AdminPage>} />
        <Route path="compensation" element={<AdminPage superAdminOnly><BannerManagement /></AdminPage>} />
        <Route path="insurance" element={<AdminPage superAdminOnly><AccidentInsurance /></AdminPage>} />
        <Route path="notifications" element={<AdminPage permission="notification.view"><Notifications /></AdminPage>} />
        <Route path="support-tickets" element={<AdminPage permission="support.view"><CustomerSupport /></AdminPage>} />
        <Route path="policies" element={<AdminPage superAdminOnly><PoliciesManagement /></AdminPage>} />
        <Route path="reports" element={<AdminPage permission="report.view"><BasicReports /></AdminPage>} />
        <Route path="service-control" element={<AdminPage superAdminOnly><ServiceControl /></AdminPage>} />
        <Route path="subadmin-management" element={<AdminPage permission="admin.view"><SubAdminManagement /></AdminPage>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
