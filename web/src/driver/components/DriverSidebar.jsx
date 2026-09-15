import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Truck,
  Inbox,
  History,
  CreditCard,
  FileCheck,
  ToggleLeft,
  LifeBuoy,
  LogOut
} from 'lucide-react';

const DriverSidebar = ({ onOpenLogout }) => {
  const menuItems = [
    { name: 'Dashboard', path: '/driver/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/driver/profile', icon: User },
    { name: 'Assigned Vehicle', path: '/driver/assigned-vehicle', icon: Truck },
    { name: 'Booking Requests', path: '/driver/booking-requests', icon: Inbox },
    { name: 'Booking History', path: '/driver/booking-history', icon: History },
    { name: 'Earnings Records', path: '/driver/earnings', icon: CreditCard },
    { name: 'Driver Documents', path: '/driver/documents', icon: FileCheck },
    { name: 'Driver Status', path: '/driver/driver-status', icon: ToggleLeft },
    { name: 'Support', path: '/driver/support', icon: LifeBuoy }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="sidebar-brand-title">Transport Fleet</div>
          <span className="sidebar-brand-badge" style={{ backgroundColor: '#2563eb' }}>Driver Panel</span>
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
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default DriverSidebar;
