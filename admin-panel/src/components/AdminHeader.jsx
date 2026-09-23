import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Bell, Menu, LogOut, Shield } from 'lucide-react';

const AdminHeader = ({ title, onMenuClick, onOpenLogout }) => {
  const { adminUser } = useAdminAuth();

  return (
    <header className="top-header">
      <button className="mobile-menu-button" onClick={onMenuClick} aria-label="Open navigation"><Menu size={20} /></button>
      <div className="header-title-area">
        <div>
          <div className="header-eyebrow">Operations workspace</div>
          <h1 className="header-title">{title}</h1>
        </div>
      </div>

      <div className="header-right">
        <button className="header-icon-button" aria-label="Notifications"><Bell size={18} /></button>
        <div className="admin-profile-pill">
          <div className="admin-avatar">{(adminUser?.name || 'Super Admin').slice(0, 2).toUpperCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', lineHeight: '1.2' }}>
              {adminUser?.name || 'Super Admin'}
            </span>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Platform Root Authority</span>
          </div>
        </div>
        <button className="header-logout-button" onClick={onOpenLogout}><LogOut size={17} /><span>Log out</span></button>
      </div>
    </header>
  );
};

export default AdminHeader;
