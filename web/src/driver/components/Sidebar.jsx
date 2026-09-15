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

const Sidebar = ({ onOpenLogout }) => {
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/profile', icon: User },
    { name: 'Assigned Vehicle', path: '/assigned-vehicle', icon: Truck },
    { name: 'Booking Requests', path: '/booking-requests', icon: Inbox },
    { name: 'Booking History', path: '/booking-history', icon: History },
    { name: 'Earnings / Payment Records', path: '/earnings', icon: CreditCard },
    { name: 'Driver Documents', path: '/documents', icon: FileCheck },
    { name: 'Driver Status', path: '/driver-status', icon: ToggleLeft },
    { name: 'Support', path: '/support', icon: LifeBuoy }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="sidebar-brand-title">Transport Fleet</div>
          <span className="sidebar-brand-badge">Driver Panel</span>
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

export default Sidebar;
