import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, Truck, LogOut, Globe, AlertTriangle, Radio } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import SafetySOS from './SafetySOS';

const DriverHeader = ({ title, onToggleSidebar, onOpenLogout, isOnline, onToggleOnline }) => {
  const { user } = useAuth();
  const { lang, changeLanguage, t } = useLanguage();
  const [sosOpen, setSosOpen] = useState(false);

  return (
    <>
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

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Online / Offline Quick Toggle if passed */}
          {onToggleOnline && (
            <button
              type="button"
              onClick={onToggleOnline}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                border: isOnline ? '1px solid #10b981' : '1px solid #64748b',
                color: isOnline ? '#10b981' : '#94a3b8',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Radio size={14} />
              <span>{isOnline ? t('online') : t('offline')}</span>
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <Globe size={14} color="#64748b" />
            <select
              value={lang}
              onChange={(e) => changeLanguage(e.target.value)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '12px',
                fontWeight: '700',
                color: '#0f172a',
                cursor: 'pointer',
                outline: 'none'
              }}
              title="Select Driver App Language"
            >
              <option value="en">English</option>
              <option value="ne">नेपाली (Nepali)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          {/* SOS Emergency Button (NO GPS) */}
          <button
            type="button"
            onClick={() => setSosOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)'
            }}
            title="Trigger Emergency SOS Protocol"
          >
            <AlertTriangle size={14} />
            <span>SOS</span>
          </button>

          {/* Profile Pill */}
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
            <span>{t('logout')}</span>
          </button>
        </div>
      </header>

      {/* Safety SOS Modal */}
      <SafetySOS
        isOpen={sosOpen}
        onClose={() => setSosOpen(false)}
        driver={user?.driverInfo}
      />
    </>
  );
};

export default DriverHeader;
