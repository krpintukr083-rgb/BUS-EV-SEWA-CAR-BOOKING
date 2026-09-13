import React from 'react';
import { useAuth } from '../context/AuthContext';
import StatusBadge from './StatusBadge';

const Header = ({ title }) => {
  const { user } = useAuth();
  const driver = user?.driverInfo || user;

  return (
    <header className="top-header">
      <div className="header-title-area">
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-right">
        {driver?.driverStatus && <StatusBadge status={driver.driverStatus} />}

        <div className="driver-profile-pill">
          <img
            src={user?.profilePhoto || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'}
            alt="Driver Profile"
            className="driver-avatar"
          />
          <div className="driver-info-text">
            <span className="driver-name">{user?.name || 'Driver'}</span>
            <span className="driver-phone">{user?.phone || ''}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
