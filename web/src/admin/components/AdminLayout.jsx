import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import AdminLogoutModal from './AdminLogoutModal';
import { useAuth } from '../../context/AuthContext';

const titlesMap = {
  '/admin/dashboard': 'Super Admin Platform Dashboard',
  '/admin/customers': 'Customer Accounts Management',
  '/admin/drivers': 'Driver Fleet Management',
  '/admin/driver-verification': 'Driver & Document Verification Desk',
  '/admin/add-vehicle': 'Add New Fleet Vehicle (Bus, EV-Sewa, Car)',
  '/admin/vehicles': 'Unified Vehicle Management',
  '/admin/bus-management': 'Intercity Bus Fleet & Route Management',
  '/admin/ev-sewa-management': 'EV-Sewa Green Mobility Management',
  '/admin/car-management': 'Car & Outstation Chauffeur Management',
  '/admin/driver-assignment': 'Vehicle-to-Driver Assignment Hub',
  '/admin/document-records': 'Official Compliance & Document Records',
  '/admin/bookings': 'Unified Booking Management (Bus, EV, Car)',
  '/admin/payments': 'Financial Records & Payment Transactions',
  '/admin/cancellations': 'Cancellation Records & Refund Operations',
  '/admin/insurance': 'Transit Accident Insurance Records (Max ₹5,00,000 Disclaimer)',
  '/admin/service-control': 'Global Service Control Toggles (Bus, EV-Sewa, Car)',
  '/admin/notifications': 'Platform Broadcast & Notifications',
  '/admin/support-tickets': 'Customer & Driver Support Center',
  '/admin/policies': 'Terms & Privacy Policies',
  '/admin/reports': 'Basic Operational & Financial Reports'
};

const AdminLayout = () => {
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const currentTitle = titlesMap[location.pathname] || 'Super Admin Panel';

  // Automatically close mobile drawer upon navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Lock background scrolling when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  const handleLogoutConfirm = () => {
    logout();
    setIsLogoutOpen(false);
    navigate('/login');
  };

  return (
    <div className={`app-container ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`sidebar-backdrop ${isMobileOpen ? 'mobile-open' : ''}`}
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Responsive Super Admin Sidebar */}
      <AdminSidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onOpenLogout={() => setIsLogoutOpen(true)}
      />

      <div className="main-wrapper">
        <AdminHeader
          title={currentTitle}
          onToggleSidebar={handleToggleSidebar}
          onOpenLogout={() => setIsLogoutOpen(true)}
        />
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
