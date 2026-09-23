import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminHeader from '../components/AdminHeader';
import AdminLogoutModal from '../components/AdminLogoutModal';
import { useAdminAuth } from '../context/AdminAuthContext';

const titlesMap = {
  '/dashboard': 'Super Admin Platform Dashboard',
  '/customers': 'Customer Accounts Management',
  '/drivers': 'Driver Fleet Management',
  '/driver-verification': 'Driver & Document Verification Desk',
  '/vehicle-approval': 'Vehicle Approval Review',
  '/schedule-approval': 'Schedule Approval Review',
  '/vehicles': 'Unified Vehicle Management',
  '/bus-management': 'Intercity Bus Fleet & Route Management',
  '/ev-sewa-management': 'EV-Sewa Green Mobility Management',
  '/car-management': 'Car & Outstation Chauffeur Management',
  '/driver-assignment': 'Vehicle-to-Driver Assignment Hub',
  '/document-records': 'Official Compliance & Document Records',
  '/bookings': 'Unified Booking Management (Bus, EV, Car)',
  '/payments': 'Financial Records & Payment Transactions',
  '/cancellations': 'Cancellation Records & Refund Operations',
  '/banner-management': 'Promotional Banner & Bus Discount Management',
  '/insurance': 'Transit Accident Insurance Records (Max ₹5,00,000 Disclaimer)',
  '/service-control': 'Global Service Control Toggles (Bus, EV-Sewa, Car)',
  '/notifications': 'Platform Broadcast & Notifications',
  '/support-tickets': 'Customer & Driver Support Center',
  '/policies': 'Terms & Privacy Policies',
  '/reports': 'Basic Operational & Financial Reports'
};

const AdminLayout = () => {
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAdminAuth();

  const currentTitle = titlesMap[location.pathname] || 'Super Admin Panel';

  const handleLogoutConfirm = () => {
    logout();
    setIsLogoutOpen(false);
    navigate('/login');
  };

  return (
    <div className="app-container">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onOpenLogout={() => setIsLogoutOpen(true)} />
      <div className="main-wrapper">
        <AdminHeader title={currentTitle} onMenuClick={() => setIsSidebarOpen(true)} onOpenLogout={() => setIsLogoutOpen(true)} />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
      <AdminLogoutModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};

export default AdminLayout;
