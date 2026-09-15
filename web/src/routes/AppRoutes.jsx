import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Unauthorized from '../components/Unauthorized';
import NotFound from '../components/NotFound';

// Unified Login Page
import Login from '../pages/Login';

// Admin Layout & Pages
import AdminLayout from '../admin/components/AdminLayout';
import AdminDashboard from '../admin/pages/Dashboard';
import CustomerManagement from '../admin/pages/CustomerManagement';
import DriverManagement from '../admin/pages/DriverManagement';
import DriverVerification from '../admin/pages/DriverVerification';
import AddVehicle from '../admin/pages/AddVehicle';
import VehicleManagement from '../admin/pages/VehicleManagement';
import BusManagement from '../admin/pages/BusManagement';
import EvSewaManagement from '../admin/pages/EvSewaManagement';
import CarManagement from '../admin/pages/CarManagement';
import DriverAssignment from '../admin/pages/DriverAssignment';
import DocumentRecords from '../admin/pages/DocumentRecords';
import BookingManagement from '../admin/pages/BookingManagement';
import PaymentManagement from '../admin/pages/PaymentManagement';
import CancellationManagement from '../admin/pages/CancellationManagement';
import CompensationManagement from '../admin/pages/CompensationManagement';
import AccidentInsurance from '../admin/pages/AccidentInsurance';
import Notifications from '../admin/pages/Notifications';
import CustomerSupport from '../admin/pages/CustomerSupport';
import PoliciesManagement from '../admin/pages/PoliciesManagement';
import BasicReports from '../admin/pages/BasicReports';
import ServiceControl from '../admin/pages/ServiceControl';

// Driver Layout & Pages
import DriverLayout from '../driver/components/DriverLayout';
import DriverDashboard from '../driver/pages/Dashboard';
import MyProfile from '../driver/pages/MyProfile';
import AssignedVehicle from '../driver/pages/AssignedVehicle';
import BookingRequests from '../driver/pages/BookingRequests';
import BookingHistory from '../driver/pages/BookingHistory';
import EarningsRecords from '../driver/pages/EarningsRecords';
import DriverDocuments from '../driver/pages/DriverDocuments';
import DriverStatus from '../driver/pages/DriverStatus';
import Support from '../driver/pages/Support';

// Root Path Director
const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#090d16',
          color: '#94a3b8'
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role === 'driver') {
    return <Navigate to="/driver/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root Entry Point */}
      <Route path="/" element={<RootRedirect />} />

      {/* Unified Single Login */}
      <Route path="/login" element={<Login />} />

      {/* Legacy Redirects */}
      <Route path="/admin-login" element={<Navigate to="/login" replace />} />
      <Route path="/driver-login" element={<Navigate to="/login" replace />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Super Admin Protected Workspaces */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
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
        <Route path="compensation" element={<CompensationManagement />} />
        <Route path="insurance" element={<AccidentInsurance />} />
        <Route path="service-control" element={<ServiceControl />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="support-tickets" element={<CustomerSupport />} />
        <Route path="policies" element={<PoliciesManagement />} />
        <Route path="reports" element={<BasicReports />} />
      </Route>

      {/* Driver / Fleet Operator Protected Workspaces */}
      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={['driver']}>
            <DriverLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/driver/dashboard" replace />} />
        <Route path="dashboard" element={<DriverDashboard />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="assigned-vehicle" element={<AssignedVehicle />} />
        <Route path="booking-requests" element={<BookingRequests />} />
        <Route path="booking-history" element={<BookingHistory />} />
        <Route path="earnings" element={<EarningsRecords />} />
        <Route path="documents" element={<DriverDocuments />} />
        <Route path="driver-status" element={<DriverStatus />} />
        <Route path="support" element={<Support />} />
      </Route>

      {/* Fallback 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
