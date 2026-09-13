import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { driverService } from '../services/driverService';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
  Inbox,
  CheckCircle2,
  IndianRupee,
  FileCheck2,
  Truck,
  ArrowRight,
  MapPin,
  Calendar
} from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await driverService.getDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading dashboard data...</div>;
  }

  const { driver, assignedVehicle, stats, documentSummary, recentBookingRequests, recentHistory, recentPayments } =
    data || {};

  return (
    <div>
      {/* Driver Summary Profile Banner */}
      <div
        className="content-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid var(--primary-blue)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={driver?.profilePhoto || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'}
            alt="Profile"
            style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{driver?.name}</h2>
              <StatusBadge status={driver?.driverStatus} />
            </div>
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px' }}>
              Mobile: {driver?.mobileNumber} | Assigned: {assignedVehicle ? `${assignedVehicle.vehicleName} (${assignedVehicle.vehicleNumber})` : 'No Vehicle Assigned'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/profile" className="btn btn-outline">
            Edit Profile
          </Link>
          <Link to="/driver-status" className="btn btn-primary">
            Change Duty Status
          </Link>
        </div>
      </div>

      {/* Stats Counters */}
      <div className="stats-grid">
        <StatCard
          title="Driver Status"
          value={driver?.driverStatus || 'Active'}
          icon={CheckCircle2}
          color={driver?.driverStatus === 'Active' ? '#10b981' : '#f59e0b'}
        />
        <StatCard
          title="Assigned Vehicle"
          value={assignedVehicle ? assignedVehicle.vehicleNumber : 'None'}
          icon={Truck}
          color="#1d4ed8"
        />
        <StatCard
          title="Booking Requests"
          value={stats?.pendingRequestsCount ?? 0}
          icon={Inbox}
          color="#f59e0b"
        />
        <StatCard
          title="Total Earnings"
          value={`₹${(stats?.totalEarnings || 0).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="#10b981"
        />
        <StatCard
          title="Document Verification"
          value={documentSummary?.overallStatus || 'Approved'}
          icon={FileCheck2}
          color={documentSummary?.overallStatus === 'Approved' ? '#10b981' : '#f59e0b'}
        />
      </div>

      {/* Grid: Pending Booking Requests & Assigned Vehicle */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Recent Booking Requests */}
        <div className="content-card">
          <div className="card-header-flex">
            <h3 className="card-title">Incoming Booking Requests</h3>
            <Link to="/booking-requests" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {recentBookingRequests && recentBookingRequests.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentBookingRequests.map(req => (
                <div
                  key={req._id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    backgroundColor: '#f8fafc'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1d4ed8' }}>
                      {req.bookingId} ({req.serviceType})
                    </span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>₹{req.fare}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>
                    <strong>Customer:</strong> {req.customer?.name} ({req.customer?.phone})
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> {req.pickupLocation} → {req.dropLocation}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No pending booking requests right now.</p>
          )}
        </div>

        {/* Assigned Vehicle Overview */}
        <div className="content-card">
          <div className="card-header-flex">
            <h3 className="card-title">Assigned Vehicle</h3>
            <Link to="/assigned-vehicle" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
              Full Details <ArrowRight size={14} />
            </Link>
          </div>

          {assignedVehicle ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{assignedVehicle.vehicleName}</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{assignedVehicle.vehicleModel}</p>
                </div>
                <StatusBadge status={assignedVehicle.vehicleStatus} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: '#64748b' }}>Vehicle Number</span>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{assignedVehicle.vehicleNumber}</div>
                </div>
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: '#64748b' }}>Service Type</span>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{assignedVehicle.vehicleType}</div>
                </div>
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: '#64748b' }}>Category</span>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{assignedVehicle.vehicleCategory}</div>
                </div>
                <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: '#64748b' }}>Seating Capacity</span>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{assignedVehicle.seatingCapacity} Seats</div>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No vehicle assigned. Contact Super Admin for assignment.</p>
          )}
        </div>
      </div>

      {/* Recent Trips & Recent Earnings */}
      <div className="content-card">
        <div className="card-header-flex">
          <h3 className="card-title">Recent Booking History</h3>
          <Link to="/booking-history" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            View Full History <ArrowRight size={14} />
          </Link>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Route</th>
                <th>Fare</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentHistory && recentHistory.length > 0 ? (
                recentHistory.map(b => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{b.bookingId}</td>
                    <td>
                      <div>{b.customer?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.customer?.phone}</div>
                    </td>
                    <td>{b.serviceType}</td>
                    <td>{b.pickupLocation} → {b.dropLocation}</td>
                    <td style={{ fontWeight: '700' }}>₹{b.fare}</td>
                    <td><StatusBadge status={b.paymentStatus} /></td>
                    <td><StatusBadge status={b.bookingStatus} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#64748b' }}>
                    No recent booking history.
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
