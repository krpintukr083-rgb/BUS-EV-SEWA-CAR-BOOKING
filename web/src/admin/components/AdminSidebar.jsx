import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Truck,
  PlusCircle,
  Bus,
  Zap,
  Car,
  GitPullRequest,
  FileCheck2,
  CalendarCheck,
  CreditCard,
  XOctagon,
  Image as ImageIcon,
  Percent,
  ShieldAlert,
  Bell,
  Headphones,
  FileText,
  BarChart3,
  Sliders,
  LogOut,
  X
} from 'lucide-react';

const AdminSidebar = ({ isCollapsed, isMobileOpen, onCloseMobile, onOpenLogout }) => {
  const handleNavClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div className="sidebar-brand-title">Fleet Command</div>
          <span className="sidebar-brand-badge">Super Admin</span>
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
        <NavLink
          to="/admin/dashboard"
          onClick={handleNavClick}
          title="Dashboard"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </NavLink>

        <div className="nav-section-title">User & Driver Management</div>
        <NavLink
          to="/admin/customers"
          onClick={handleNavClick}
          title="Customer Management"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Users size={17} />
          <span>Customer Management</span>
        </NavLink>
        <NavLink
          to="/admin/drivers"
          onClick={handleNavClick}
          title="Driver Management"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <UserCheck size={17} />
          <span>Driver Management</span>
        </NavLink>
        <NavLink
          to="/admin/driver-verification"
          onClick={handleNavClick}
          title="Driver Verification"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FileCheck2 size={17} />
          <span>Driver Verification</span>
        </NavLink>

        <div className="nav-section-title">Fleet & Services</div>
        <NavLink
          to="/admin/add-vehicle"
          onClick={handleNavClick}
          title="Add Vehicle"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <PlusCircle size={17} />
          <span>Add Vehicle</span>
        </NavLink>
        <NavLink
          to="/admin/vehicles"
          onClick={handleNavClick}
          title="Vehicle Management"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Truck size={17} />
          <span>Vehicle Management</span>
        </NavLink>
        <NavLink
          to="/admin/bus-management"
          onClick={handleNavClick}
          title="Bus Management"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Bus size={17} />
          <span>Bus Management</span>
        </NavLink>
        <NavLink
          to="/admin/ev-sewa-management"
          onClick={handleNavClick}
          title="EV-Sewa Management"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Zap size={17} />
          <span>EV-Sewa Management</span>
        </NavLink>
        <NavLink
          to="/admin/car-management"
          onClick={handleNavClick}
          title="Car Management"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Car size={17} />
          <span>Car Management</span>
        </NavLink>
        <NavLink
          to="/admin/driver-assignment"
          onClick={handleNavClick}
          title="Driver Assignment"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <GitPullRequest size={17} />
          <span>Driver Assignment</span>
        </NavLink>
        <NavLink
          to="/admin/document-records"
          onClick={handleNavClick}
          title="Compliance & Records"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FileCheck2 size={17} />
          <span>Compliance & Records</span>
        </NavLink>

        <div className="nav-section-title">Bookings & Financials</div>
        <NavLink
          to="/admin/bookings"
          onClick={handleNavClick}
          title="Booking Management"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <CalendarCheck size={17} />
          <span>Booking Management</span>
        </NavLink>
        <NavLink
          to="/admin/payments"
          onClick={handleNavClick}
          title="Payment Management"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <CreditCard size={17} />
          <span>Payment Management</span>
        </NavLink>
        <NavLink
          to="/admin/cancellations"
          onClick={handleNavClick}
          title="Cancellation Records"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <XOctagon size={17} />
          <span>Cancellation Records</span>
        </NavLink>
        <NavLink
          to="/admin/banner-management"
          onClick={handleNavClick}
          title="Banner & Bus Discount"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <ImageIcon size={17} />
          <span>Banner & Bus Discount</span>
        </NavLink>
        <NavLink
          to="/admin/insurance"
          onClick={handleNavClick}
          title="Accident Insurance"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <ShieldAlert size={17} />
          <span>Accident Insurance</span>
        </NavLink>

        <div className="nav-section-title">System & Governance</div>
        <NavLink
          to="/admin/service-control"
          onClick={handleNavClick}
          title="Service Control"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Sliders size={17} />
          <span>Service Control</span>
        </NavLink>
        <NavLink
          to="/admin/notifications"
          onClick={handleNavClick}
          title="Notifications"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Bell size={17} />
          <span>Notifications</span>
        </NavLink>
        <NavLink
          to="/admin/support-tickets"
          onClick={handleNavClick}
          title="Customer Support"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Headphones size={17} />
          <span>Customer Support</span>
        </NavLink>
        <NavLink
          to="/admin/policies"
          onClick={handleNavClick}
          title="Terms & Policies"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FileText size={17} />
          <span>Terms & Policies</span>
        </NavLink>
        <NavLink
          to="/admin/reports"
          onClick={handleNavClick}
          title="Basic Reports"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <BarChart3 size={17} />
          <span>Basic Reports</span>
        </NavLink>

        <button
          onClick={onOpenLogout}
          className="nav-link nav-link-logout"
          style={{ marginTop: '16px', marginBottom: '8px' }}
          title="Logout"
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
