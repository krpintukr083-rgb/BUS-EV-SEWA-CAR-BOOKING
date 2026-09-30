import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
  Truck,
  Bus,
  Zap,
  Car,
  GitPullRequest,
  FileCheck2,
  CalendarCheck,
  CreditCard,
  XOctagon,
  Image as ImageIcon,
  ShieldAlert,
  Bell,
  Headphones,
  FileText,
  BarChart3,
  Sliders,
  LogOut,
  ShieldCheck
} from 'lucide-react';

const AdminSidebar = ({ onOpenLogout, isOpen, onClose }) => {
  const { hasPermission, isSuperAdmin } = useAdminAuth();
  const sections = [
    {
      title: 'User & Driver Management',
      items: [
        { to: '/customers', label: 'Customer Management', icon: Users, permission: 'customer.view' },
        { to: '/subadmin-management', label: 'Admin Management', icon: UserPlus, permission: 'admin.view' },
        { to: '/drivers', label: 'Driver Management', icon: UserCheck, permission: 'driver.view' },
        { to: '/driver-verification', label: 'Driver Verification', icon: FileCheck2, permission: 'driver.kyc' }
      ]
    },
    {
      title: 'Fleet & Services',
      items: [
        { to: '/vehicles', label: 'Vehicle Management', icon: Truck, permission: 'vehicle.view' },
        { to: '/vehicle-approval', label: 'Vehicle Approvals', icon: FileCheck2, permission: 'vehicle.approve' },
        { to: '/schedule-approval', label: 'Schedule Approval', icon: CalendarCheck, permission: ['vehicle.view', 'vehicle.approve'] },
        { to: '/bus-management', label: 'Bus Management', icon: Bus, permission: 'vehicle.view' },
        { to: '/ev-sewa-management', label: 'EV-Sewa Management', icon: Zap, permission: 'vehicle.view' },
        { to: '/car-management', label: 'Car Management', icon: Car, permission: 'vehicle.view' },
        { to: '/driver-assignment', label: 'Driver Assignment', icon: GitPullRequest, permission: 'vehicle.assign_driver' },
        { to: '/document-records', label: 'Compliance & Records', icon: FileCheck2, permission: 'driver.kyc' }
      ]
    },
    {
      title: 'Bookings & Financials',
      items: [
        { to: '/bookings', label: 'Booking Management', icon: CalendarCheck, permission: 'booking.view' },
        { to: '/payments', label: 'Payment Management', icon: CreditCard, permission: 'payment.view' },
        { to: '/withdrawals', label: 'Driver Withdrawals', icon: CreditCard, permission: 'withdrawal.view' },
        { to: '/cancellations', label: 'Cancellation Records', icon: XOctagon, permission: 'cancellation.view' },
        { to: '/banner-management', label: 'Banner & Bus Discount', icon: ImageIcon, superAdminOnly: true },
        { to: '/insurance', label: 'Accident Insurance', icon: ShieldAlert, superAdminOnly: true }
      ]
    },
    {
      title: 'System & Governance',
      items: [
        { to: '/service-control', label: 'Service Control', icon: Sliders, superAdminOnly: true },
        { to: '/notifications', label: 'Notifications', icon: Bell, permission: 'notification.view' },
        { to: '/support-tickets', label: 'Customer Support', icon: Headphones, permission: 'support.view' },
        { to: '/policies', label: 'Terms & Policies', icon: FileText, superAdminOnly: true },
        { to: '/reports', label: 'Basic Reports', icon: BarChart3, permission: 'report.view' }
      ]
    }
  ];
  const canAccessItem = item => (
    item.superAdminOnly
      ? isSuperAdmin()
    : isSuperAdmin() || (Array.isArray(item.permission)
      ? item.permission.every(hasPermission)
      : hasPermission(item.permission))
  );

  return (
    <>
    <div className={`sidebar-backdrop ${isOpen ? 'visible' : ''}`} onClick={onClose} />
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div className="brand-mark"><ShieldCheck size={18} /></div>
          <div><div className="sidebar-brand-title">TransitOS</div>
          <span className="sidebar-brand-badge">Admin workspace</span></div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </NavLink>

        {sections.map(section => {
          const visibleItems = section.items.filter(canAccessItem);
          if (!visibleItems.length) return null;
          return (
            <React.Fragment key={section.title}>
              <div className="nav-section-title">{section.title}</div>
              {visibleItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </React.Fragment>
          );
        })}

        <button
          onClick={onOpenLogout}
          className="nav-link nav-link-logout"
          style={{ marginTop: '16px', marginBottom: '8px' }}
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
    </>
  );
};

export default AdminSidebar;
