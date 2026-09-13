import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import LogoutModal from '../components/LogoutModal';
import { useAuth } from '../context/AuthContext';

const titlesMap = {
  '/dashboard': 'Driver Dashboard',
  '/profile': 'Driver Profile',
  '/assigned-vehicle': 'Assigned Vehicle Information',
  '/booking-requests': 'Booking Requests',
  '/booking-history': 'Booking History',
  '/earnings': 'Earnings & Payment Records',
  '/documents': 'Driver Documents & Verification',
  '/driver-status': 'Driver Availability Status',
  '/support': 'Driver Help & Support'
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
      <Sidebar onOpenLogout={() => setIsLogoutOpen(true)} />
      <div className="main-wrapper">
        <Header title={currentTitle} />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
      <LogoutModal
        isOpen={isLogoutOpen}
        onClose={() => setIsLogoutOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};

export default DriverLayout;
