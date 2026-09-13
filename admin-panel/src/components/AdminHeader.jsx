import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Shield } from 'lucide-react';

const AdminHeader = ({ title }) => {
  const { adminUser } = useAdminAuth();

  return (
    <header className="top-header">
      <div className="header-title-area">
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-right">
        <div className="admin-profile-pill">
          <div className="admin-avatar">SA</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', lineHeight: '1.2' }}>
              {adminUser?.name || 'Super Admin'}
            </span>
            <span style={{ fontSize: '0.725rem', color: '#64748b' }}>Platform Root Authority</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
