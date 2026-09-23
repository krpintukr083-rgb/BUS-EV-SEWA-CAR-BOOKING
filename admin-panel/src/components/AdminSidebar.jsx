import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
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
  LogOut
} from 'lucide-react';

const AdminSidebar = ({ onOpenLogout }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div className="sidebar-brand-title">Fleet Command</div>
          <span className="sidebar-brand-badge">Super Admin</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </NavLink>

        <div className="nav-section-title">User & Driver Management</div>
        <NavLink to="/customers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Users size={17} />
          <span>Customer Management</span>
        </NavLink>
        <NavLink to="/drivers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <UserCheck size={17} />
          <span>Driver Management</span>
        </NavLink>
        <NavLink to="/driver-verification" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileCheck2 size={17} />
          <span>Driver Verification</span>
        </NavLink>

        <div className="nav-section-title">Fleet & Services</div>
        <NavLink to="/add-vehicle" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <PlusCircle size={17} />
          <span>Add Vehicle</span>
        </NavLink>
        <NavLink to="/vehicles" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Truck size={17} />
          <span>Vehicle Management</span>
        </NavLink>
        <NavLink to="/vehicle-approval" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileCheck2 size={17} />
          <span>Vehicle Approval</span>
        </NavLink>
        <NavLink to="/schedule-approval" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <CalendarCheck size={17} />
          <span>Schedule Approval</span>
        </NavLink>
        <NavLink to="/bus-management" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Bus size={17} />
          <span>Bus Management</span>
        </NavLink>
        <NavLink to="/ev-sewa-management" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Zap size={17} />
          <span>EV-Sewa Management</span>
        </NavLink>
        <NavLink to="/car-management" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Car size={17} />
          <span>Car Management</span>
        </NavLink>
        <NavLink to="/driver-assignment" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <GitPullRequest size={17} />
          <span>Driver Assignment</span>
        </NavLink>
        <NavLink to="/document-records" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileCheck2 size={17} />
          <span>Compliance & Records</span>
        </NavLink>

        <div className="nav-section-title">Bookings & Financials</div>
        <NavLink to="/bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <CalendarCheck size={17} />
          <span>Booking Management</span>
        </NavLink>
        <NavLink to="/payments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <CreditCard size={17} />
          <span>Payment Management</span>
        </NavLink>
        <NavLink to="/cancellations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <XOctagon size={17} />
          <span>Cancellation Records</span>
        </NavLink>
        <NavLink to="/banner-management" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <ImageIcon size={17} />
          <span>Banner & Bus Discount</span>
        </NavLink>
        <NavLink to="/insurance" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <ShieldAlert size={17} />
          <span>Accident Insurance</span>
        </NavLink>

        <div className="nav-section-title">System & Governance</div>
        <NavLink to="/service-control" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Sliders size={17} />
          <span>Service Control</span>
        </NavLink>
        <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Bell size={17} />
          <span>Notifications</span>
        </NavLink>
        <NavLink to="/support-tickets" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Headphones size={17} />
          <span>Customer Support</span>
        </NavLink>
        <NavLink to="/policies" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileText size={17} />
          <span>Terms & Policies</span>
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <BarChart3 size={17} />
          <span>Basic Reports</span>
        </NavLink>

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
  );
};

export default AdminSidebar;
