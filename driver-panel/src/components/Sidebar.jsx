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
  LogOut
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Sidebar = ({ onOpenLogout }) => {
  const { t } = useLanguage();

  const menuItems = [
    { name: t('dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { name: t('myProfile'), path: '/profile', icon: User },
    { name: t('assignedVehicle'), path: '/assigned-vehicle', icon: Truck },
    { name: t('bookingRequests'), path: '/booking-requests', icon: Inbox },
    { name: t('activeRide'), path: '/active-ride', icon: Navigation },
    { name: t('bookingHistory'), path: '/booking-history', icon: History },
    { name: t('earningsRecords'), path: '/earnings', icon: CreditCard },
    { name: t('wallet'), path: '/wallet', icon: Wallet },
    { name: t('evHub'), path: '/ev-hub', icon: Zap },
    { name: t('driverDocuments'), path: '/documents', icon: FileCheck },
    { name: t('driverStatus'), path: '/driver-status', icon: ToggleLeft },
    { name: t('support'), path: '/support', icon: LifeBuoy }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="sidebar-brand-title">{t('brandTitle')}</div>
          <span className="sidebar-brand-badge">{t('driverPanel')}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
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
        >
          <LogOut size={18} />
          <span>{t('logout')}</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
