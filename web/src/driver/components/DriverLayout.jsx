import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DriverSidebar from './DriverSidebar';
import DriverHeader from './DriverHeader';
import DriverLogoutModal from './DriverLogoutModal';
import { useAuth } from '../../context/AuthContext';

const titlesMap = {
  '/driver/dashboard': 'Driver Dashboard',
  '/driver/profile': 'Driver Profile',
  '/driver/assigned-vehicle': 'Assigned Vehicle Information',
  '/driver/booking-requests': 'Booking Requests',
  '/driver/booking-history': 'Booking History',
  '/driver/earnings': 'Earnings & Payment Records',
  '/driver/documents': 'Driver Documents & Verification',
  '/driver/driver-status': 'Driver Availability Status',
  '/driver/support': 'Driver Help & Support'
};

const DriverLayout = () => {
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const currentTitle = titlesMap[location.pathname] || 'Driver Panel';

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
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-backdrop ${isMobileOpen ? 'mobile-open' : ''}`}
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Responsive Driver Sidebar */}
      <DriverSidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onOpenLogout={() => setIsLogoutOpen(true)}
      />

      <div className="main-wrapper">
        <DriverHeader
          title={currentTitle}
          onToggleSidebar={handleToggleSidebar}
        />
        <main className="page-container">
          <Outlet />
        </main>
      </div>

      <DriverLogoutModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};

export default DriverLayout;
