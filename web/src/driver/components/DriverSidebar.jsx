import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Truck,
  Inbox,
  Navigation,
  History,
  CreditCard,
  Wallet,
  Zap,
  FileCheck,
  ToggleLeft,
  LifeBuoy,
  LogOut,
  X
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const DriverSidebar = ({ isCollapsed, isMobileOpen, onCloseMobile, onOpenLogout }) => {
  const { t } = useLanguage();

  const menuItems = [
    { name: t('dashboard'), path: '/driver/dashboard', icon: LayoutDashboard },
    { name: t('myProfile'), path: '/driver/profile', icon: User },
    { name: t('assignedVehicle'), path: '/driver/assigned-vehicle', icon: Truck },
    { name: t('bookingRequests'), path: '/driver/booking-requests', icon: Inbox },
    { name: t('activeRide'), path: '/driver/active-ride', icon: Navigation },
    { name: t('bookingHistory'), path: '/driver/booking-history', icon: History },
    { name: t('earningsRecords'), path: '/driver/earnings', icon: CreditCard },
    { name: t('wallet'), path: '/driver/wallet', icon: Wallet },
    { name: t('evHub'), path: '/driver/ev-hub', icon: Zap },
    { name: t('driverDocuments'), path: '/driver/documents', icon: FileCheck },
    { name: t('driverStatus'), path: '/driver/driver-status', icon: ToggleLeft },
    { name: t('support'), path: '/driver/support', icon: LifeBuoy }
  ];

  const handleNavClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="sidebar-brand-title">{t('brandTitle')}</div>
          <span className="sidebar-brand-badge" style={{ backgroundColor: '#2563eb' }}>
            {t('driverPanel')}
          </span>
        </div>
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={onCloseMobile}
          aria-label="Close menu"
          title="Close Navigation Drawer"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              title={item.name}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}

        <button
          onClick={onOpenLogout}
          className="nav-link nav-link-logout"
          style={{ marginTop: 'auto', paddingTop: '12px' }}
          title={t('logout')}
        >
          <LogOut size={18} />
          <span>{t('logout')}</span>
        </button>
      </nav>
    </aside>
  );
};

export default DriverSidebar;
