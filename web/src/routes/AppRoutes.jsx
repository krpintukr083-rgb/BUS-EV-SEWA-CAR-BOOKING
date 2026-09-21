import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Unauthorized from '../components/Unauthorized';
import NotFound from '../components/NotFound';
import { Skeleton } from '../components/SkeletonLoader';

// Loading fallback for chunk transitions
const PageLoader = () => (
  <div
    style={{
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      minHeight: '60vh'
    }}
  >
    <Skeleton width="260px" height="32px" />
    <Skeleton width="100%" height="180px" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      <Skeleton height="100px" />
      <Skeleton height="100px" />
      <Skeleton height="100px" />
    </div>
  </div>
);

// Unified Login Page (Lazy)
const Login = lazy(() => import('../pages/Login'));

// Admin Layout & Pages (Lazy)
const AdminLayout = lazy(() => import('../admin/components/AdminLayout'));
const AdminDashboard = lazy(() => import('../admin/pages/Dashboard'));
const CustomerManagement = lazy(() => import('../admin/pages/CustomerManagement'));
const DriverManagement = lazy(() => import('../admin/pages/DriverManagement'));
const DriverVerification = lazy(() => import('../admin/pages/DriverVerification'));
const AddVehicle = lazy(() => import('../admin/pages/AddVehicle'));
const VehicleManagement = lazy(() => import('../admin/pages/VehicleManagement'));
const BusManagement = lazy(() => import('../admin/pages/BusManagement'));
const EvSewaManagement = lazy(() => import('../admin/pages/EvSewaManagement'));
const CarManagement = lazy(() => import('../admin/pages/CarManagement'));
const DriverAssignment = lazy(() => import('../admin/pages/DriverAssignment'));
const DocumentRecords = lazy(() => import('../admin/pages/DocumentRecords'));
const BookingManagement = lazy(() => import('../admin/pages/BookingManagement'));
const PaymentManagement = lazy(() => import('../admin/pages/PaymentManagement'));
const CancellationManagement = lazy(() => import('../admin/pages/CancellationManagement'));
const AccidentInsurance = lazy(() => import('../admin/pages/AccidentInsurance'));
const Notifications = lazy(() => import('../admin/pages/Notifications'));
const CustomerSupport = lazy(() => import('../admin/pages/CustomerSupport'));
const PoliciesManagement = lazy(() => import('../admin/pages/PoliciesManagement'));
const BasicReports = lazy(() => import('../admin/pages/BasicReports'));
const ServiceControl = lazy(() => import('../admin/pages/ServiceControl'));

// Driver Layout & Pages (Lazy)
const DriverLayout = lazy(() => import('../driver/components/DriverLayout'));
const DriverDashboard = lazy(() => import('../driver/pages/Dashboard'));
const MyProfile = lazy(() => import('../driver/pages/MyProfile'));
const AssignedVehicle = lazy(() => import('../driver/pages/AssignedVehicle'));
const BookingRequests = lazy(() => import('../driver/pages/BookingRequests'));
const ActiveRide = lazy(() => import('../driver/pages/ActiveRide'));
const BookingHistory = lazy(() => import('../driver/pages/BookingHistory'));
const EarningsRecords = lazy(() => import('../driver/pages/EarningsRecords'));
const Wallet = lazy(() => import('../driver/pages/Wallet'));
const EVHub = lazy(() => import('../driver/pages/EVHub'));
const DriverDocuments = lazy(() => import('../driver/pages/DriverDocuments'));
const DriverStatus = lazy(() => import('../driver/pages/DriverStatus'));
const Support = lazy(() => import('../driver/pages/Support'));

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
        Loading session...
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
    <Suspense fallback={<PageLoader />}>
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
          <Route path="compensation" element={<Navigate to="/admin/dashboard" replace />} />
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
          <Route path="active-ride" element={<ActiveRide />} />
          <Route path="booking-history" element={<BookingHistory />} />
          <Route path="earnings" element={<EarningsRecords />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="ev-hub" element={<EVHub />} />
          <Route path="documents" element={<DriverDocuments />} />
          <Route path="driver-status" element={<DriverStatus />} />
          <Route path="support" element={<Support />} />
        </Route>

        {/* Fallback 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
