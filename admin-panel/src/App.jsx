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
import AddVehicle from './pages/AddVehicle';
import VehicleManagement from './pages/VehicleManagement';
import BusManagement from './pages/BusManagement';
import EvSewaManagement from './pages/EvSewaManagement';
import CarManagement from './pages/CarManagement';
import DriverAssignment from './pages/DriverAssignment';
import DocumentRecords from './pages/DocumentRecords';
import BookingManagement from './pages/BookingManagement';
import PaymentManagement from './pages/PaymentManagement';
import CancellationManagement from './pages/CancellationManagement';
import AccidentInsurance from './pages/AccidentInsurance';
import Notifications from './pages/Notifications';
import CustomerSupport from './pages/CustomerSupport';
import PoliciesManagement from './pages/PoliciesManagement';
import BasicReports from './pages/BasicReports';
import ServiceControl from './pages/ServiceControl';

// Admin Protected Route
const AdminProtectedRoute = ({ children }) => {
  const { adminUser, loading } = useAdminAuth();
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Verifying Super Admin session...</div>;
  }
  if (!adminUser || adminUser.role !== 'admin') {
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
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="customers" element={<CustomerManagement />} />
        <Route path="drivers" element={<DriverManagement />} />
        <Route path="driver-verification" element={<DriverVerification />} />
        <Route path="add-vehicle" element={<AddVehicle />} />
        <Route path="vehicles" element={<VehicleManagement />} />
        <Route path="bus-management" element={<BusManagement />} />
        <Route path="ev-sewa-management" element={<EvSewaManagement />} />
        <Route path="car-management" element={<CarManagement />} />
        <Route path="driver-assignment" element={<DriverAssignment />} />
        <Route path="document-records" element={<DocumentRecords />} />
        <Route path="bookings" element={<BookingManagement />} />
        <Route path="payments" element={<PaymentManagement />} />
        <Route path="cancellations" element={<CancellationManagement />} />
        <Route path="compensation" element={<Navigate to="/dashboard" replace />} />
        <Route path="insurance" element={<AccidentInsurance />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="support-tickets" element={<CustomerSupport />} />
        <Route path="policies" element={<PoliciesManagement />} />
        <Route path="reports" element={<BasicReports />} />
        <Route path="service-control" element={<ServiceControl />} />
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
