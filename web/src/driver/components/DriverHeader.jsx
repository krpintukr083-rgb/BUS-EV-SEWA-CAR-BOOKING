import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Menu, Truck, LogOut } from 'lucide-react';

const DriverHeader = ({ title, onToggleSidebar, onOpenLogout }) => {
  const { user } = useAuth();

  return (
    <header className="top-header">
      <div className="header-title-area">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="sidebar-toggle-btn"
          aria-label="Toggle sidebar"
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-right">
        <div className="admin-profile-pill">
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt={user.name}
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div className="admin-avatar" style={{ backgroundColor: '#2563eb' }}>
              <Truck size={16} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', lineHeight: '1.2' }}>
              {user?.name || 'Driver'}
            </span>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
              {user?.phone || 'Fleet Operator'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenLogout}
          className="header-logout-btn"
          aria-label="Logout"
          title="Sign Out Driver"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default DriverHeader;
