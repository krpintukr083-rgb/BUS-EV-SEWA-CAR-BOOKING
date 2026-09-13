import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DriverLayout from './layouts/DriverLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyProfile from './pages/MyProfile';
import AssignedVehicle from './pages/AssignedVehicle';
import BookingRequests from './pages/BookingRequests';
import BookingHistory from './pages/BookingHistory';
import EarningsRecords from './pages/EarningsRecords';
import DriverDocuments from './pages/DriverDocuments';
import DriverStatus from './pages/DriverStatus';
import Support from './pages/Support';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Checking driver session...</div>;
  }
  if (!user || user.role !== 'driver') {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DriverLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="assigned-vehicle" element={<AssignedVehicle />} />
        <Route path="booking-requests" element={<BookingRequests />} />
        <Route path="booking-history" element={<BookingHistory />} />
        <Route path="earnings" element={<EarningsRecords />} />
        <Route path="documents" element={<DriverDocuments />} />
        <Route path="driver-status" element={<DriverStatus />} />
        <Route path="support" element={<Support />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
