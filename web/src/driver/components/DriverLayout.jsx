import React, { useState } from 'react';
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
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const currentTitle = titlesMap[location.pathname] || 'Driver Panel';

  const handleLogoutConfirm = () => {
    logout();
    setIsLogoutOpen(false);
    navigate('/login');
  };

  return (
    <div className="app-container">
      <DriverSidebar onOpenLogout={() => setIsLogoutOpen(true)} />
      <div className="main-wrapper">
        <DriverHeader title={currentTitle} />
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
