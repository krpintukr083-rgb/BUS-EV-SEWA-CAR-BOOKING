import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { DashboardSkeleton } from '../../components/SkeletonLoader';
import {
  Users,
  UserCheck,
  Truck,
  CalendarCheck,
  CreditCard,
  FileCheck2,
  XOctagon,
  Percent,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  RotateCw
} from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getDashboard();
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load dashboard metrics');
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Network error while fetching dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <DashboardSkeleton role="admin" />;
  }

  if (error) {
    return (
      <div
        className="content-card"
        style={{
          padding: '32px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          borderLeft: '4px solid #ef4444'
        }}
      >
        <AlertTriangle size={36} color="#ef4444" />
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1e293b' }}>
          Unable to Load Dashboard
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px' }}>
          {error}
        </p>
        <button
          onClick={fetchDashboard}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RotateCw size={16} /> Retry Now
        </button>
      </div>
    );
  }

  const { counts, serviceControl, recentBookings } = data || {};

  return (
    <div>
      {/* Service Control Summary Banner */}
      <div
        className="content-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid var(--primary-blue)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sliders size={18} color="#1d4ed8" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Platform Booking Service Status</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Live status of customer booking pipelines across all 3 modes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ padding: '6px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
            Bus Booking: <StatusBadge status={serviceControl?.busService || 'Active'} />
          </div>
          <div style={{ padding: '6px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
            EV-Sewa: <StatusBadge status={serviceControl?.evSewaService || 'Active'} />
          </div>
          <div style={{ padding: '6px 14px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
            Car Booking: <StatusBadge status={serviceControl?.carService || 'Active'} />
          </div>
          <Link to="/admin/service-control" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            Manage Toggles
          </Link>
        </div>
      </div>

      {/* 13 Key Platform Counters Grid */}
      <div className="stats-grid">
        <StatCard title="Total Customers" value={counts?.customers ?? 0} icon={Users} color="#1d4ed8" />
        <StatCard title="Total Drivers" value={counts?.drivers ?? 0} icon={UserCheck} color="#059669" />
        <StatCard title="Total Vehicles" value={counts?.vehicles ?? 0} icon={Truck} color="#475569" />
        <StatCard title="Active Vehicles" value={counts?.activeVehicles ?? 0} icon={CheckCircle2} color="#10b981" />
        <StatCard title="Inactive Vehicles" value={counts?.inactiveVehicles ?? 0} icon={AlertTriangle} color="#f59e0b" />
        <StatCard title="Blocked Vehicles" value={counts?.blockedVehicles ?? 0} icon={XCircle} color="#ef4444" />
        <StatCard title="Total Bookings" value={counts?.bookings ?? 0} icon={CalendarCheck} color="#2563eb" />
        <StatCard
          title="Total Payments (₹)"
          value={`₹${(counts?.totalPaymentsAmount || 0).toLocaleString('en-IN')}`}
          icon={CreditCard}
          color="#10b981"
        />
        <StatCard
          title="Pending Driver Verification"
          value={counts?.pendingDriverVerification ?? 0}
          icon={FileCheck2}
          color="#f59e0b"
        />
        <StatCard
          title="Pending Documents"
          value={counts?.pendingDocuments ?? 0}
          icon={FileCheck2}
          color="#d97706"
        />
        <StatCard title="Cancellation Records" value={counts?.cancellationRecords ?? 0} icon={XOctagon} color="#ef4444" />
        <StatCard title="3% Glitch Compensations" value={counts?.compensationRecords ?? 0} icon={Percent} color="#8b5cf6" />
        <StatCard
          title="Accident Insurance Policies"
          value={counts?.accidentInsuranceRecords ?? 0}
          icon={ShieldAlert}
          color="#0284c7"
        />
      </div>

      {/* Recent Bookings Feed */}
      <div className="content-card">
        <div className="card-header-flex">
          <div>
            <h3 className="card-title">Recent System Bookings</h3>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '2px' }}>
              Real-time booking streams across Bus, EV-Sewa, and Car services.
            </p>
          </div>
          <Link to="/admin/bookings" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            View All Bookings <ArrowRight size={14} />
          </Link>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Service</th>
                <th>Customer Details</th>
                <th>Vehicle & Driver</th>
                <th>Pickup → Drop Route</th>
                <th>Fare</th>
                <th>Payment</th>
                <th>Booking Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings && recentBookings.length > 0 ? (
                recentBookings.map(b => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{b.bookingId}</td>
                    <td>
                      <span className="badge badge-pending">{b.serviceType}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{b.customer?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.customer?.phone}</div>
                    </td>
                    <td>
                      <div>{b.vehicle?.vehicleName || 'Unassigned'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {b.vehicle?.vehicleNumber} • {b.driver?.name || 'No Driver'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '240px' }}>
                      <div>{b.pickupLocation}</div>
                      <div style={{ color: '#64748b' }}>↓ {b.dropLocation}</div>
                    </td>
                    <td style={{ fontWeight: '700' }}>₹{b.fare}</td>
                    <td>
                      <StatusBadge status={b.paymentStatus} />
                    </td>
                    <td>
                      <StatusBadge status={b.bookingStatus} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No bookings logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
