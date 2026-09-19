import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import {
  Inbox,
  CheckCircle2,
  IndianRupee,
  FileCheck2,
  Truck,
  ArrowRight,
  MapPin,
  Calendar,
  AlertTriangle,
  RotateCw,
  Radio,
  Zap,
  Navigation,
  Wallet,
  Star,
  Award
} from 'lucide-react';

const Dashboard = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/driver/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.message || 'Failed to load driver dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Network error while fetching driver dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggleOnline = async () => {
    if (!data?.driver) return;
    setTogglingStatus(true);
    try {
      const newStatus = !data.driver.isOnline;
      const res = await api.put('/driver/status', { isOnline: newStatus });
      if (res.data.success) {
        setData(prev => ({
          ...prev,
          driver: {
            ...prev.driver,
            isOnline: res.data.data.isOnline,
            driverStatus: res.data.data.driverStatus
          },
          stats: {
            ...prev.stats,
            isOnline: res.data.data.isOnline,
            driverStatus: res.data.data.driverStatus
          }
        }));
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        {t('loading')}
      </div>
    );
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
          Unable to Load Driver Dashboard
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

  const { driver, assignedVehicle, stats, documentSummary, bookingRequests, activeRide, recentHistory, evDetails, activeIncentives } =
    data || {};

  const isOnline = driver?.isOnline ?? true;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
            alt={driver?.name}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #2563eb'
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {driver?.name}
              </h2>
              <StatusBadge status={driver?.driverStatus || 'Active'} />
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              {driver?.mobileNumber} • {assignedVehicle ? `${assignedVehicle.vehicleName} (${assignedVehicle.vehicleNumber})` : 'No Vehicle Assigned'}
            </p>
          </div>
        </div>

        {/* Online / Offline Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={handleToggleOnline}
            disabled={togglingStatus}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: isOnline ? '#10b981' : '#64748b',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '30px',
              fontWeight: '800',
              fontSize: '14px',
              cursor: togglingStatus ? 'not-allowed' : 'pointer',
              boxShadow: isOnline ? '0 4px 12px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Radio size={18} />
            <span>{isOnline ? t('online') : t('offline')}</span>
          </button>
        </div>
      </div>

      {/* Online/Offline Notice */}
      {!isOnline && (
        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid #f59e0b',
            color: '#b45309',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <AlertTriangle size={18} />
          <span>{t('offlineNotice')}</span>
        </div>
      )}

      {/* Active Ongoing Ride Card if available */}
      {activeRide && (
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '2px solid #3b82f6',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Navigation size={24} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ backgroundColor: '#10b981', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>
                  ACTIVE RIDE ({activeRide.rideStatus || 'In Progress'})
                </span>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>#{activeRide.bookingId}</span>
              </div>
              <div style={{ color: '#f8fafc', fontWeight: '700', fontSize: '16px', marginTop: '4px' }}>
                {activeRide.pickupLocation} → {activeRide.dropLocation}
              </div>
            </div>
          </div>

          <Link
            to="/driver/active-ride"
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>Open Active Trip Management</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Key Metric Stat Cards */}
      <div className="stats-grid">
        <StatCard
          icon={IndianRupee}
          iconColor="#10b981"
          title={t('todayEarnings')}
          value={`₹${stats?.totalEarnings || 0}`}
          trend="Today's Authoritative Share"
        />
        <StatCard
          icon={Wallet}
          iconColor="#3b82f6"
          title={t('walletBalance')}
          value={`₹${stats?.walletBalance || 0}`}
          trend="Available Payout Balance"
        />
        <StatCard
          icon={CheckCircle2}
          iconColor="#6366f1"
          title={t('completedRides')}
          value={stats?.completedTripsCount || 0}
          trend="Lifetime Completed"
        />
        <StatCard
          icon={Inbox}
          iconColor="#f59e0b"
          title={t('pendingRequests')}
          value={stats?.pendingRequestsCount || 0}
          trend={isOnline ? 'Active on Route' : 'Offline'}
        />
      </div>

      {/* EV Summary Card (if EV vehicle) */}
      {evDetails && (
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #38bdf8',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={24} color="#fff" />
            </div>
            <div>
              <div style={{ color: '#38bdf8', fontWeight: '700', fontSize: '15px' }}>
                Electric Vehicle (EV) Power Status
              </div>
              <div style={{ color: '#f1f5f9', fontWeight: '800', fontSize: '18px', marginTop: '2px' }}>
                Battery: {evDetails.batteryPercentage}% • Range: ~{evDetails.estimatedRangeKm} km
              </div>
            </div>
          </div>

          <Link
            to="/driver/ev-hub"
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              textDecoration: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '13px'
            }}
          >
            Manage EV & Charging Stations
          </Link>
        </div>
      )}

      {/* Main Grid: Pending Requests & Recent History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Pending Booking Requests */}
        <div className="content-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {t('bookingRequests')}
            </h3>
            <Link
              to="/driver/booking-requests"
              style={{
                fontSize: '0.85rem',
                color: 'var(--primary-blue)',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {bookingRequests && bookingRequests.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bookingRequests.map(req => (
                <div
                  key={req._id}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                      #{req.bookingId}
                    </span>
                    <span style={{ fontWeight: '700', color: '#10b981', fontSize: '0.95rem' }}>
                      ₹{req.fare}
                    </span>
                  </div>

                  <div style={{ color: '#64748b', fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={12} color="#10b981" /> {req.pickupLocation}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={12} color="#ef4444" /> {req.dropLocation}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <StatusBadge status={req.bookingStatus} />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {req.paymentMethod} • {req.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              {isOnline ? 'No pending requests for your assigned vehicle.' : 'Turn Online to receive ride requests.'}
            </div>
          )}
        </div>

        {/* Recent Ride History */}
        <div className="content-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              {t('bookingHistory')}
            </h3>
            <Link
              to="/driver/booking-history"
              style={{
                fontSize: '0.85rem',
                color: 'var(--primary-blue)',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View History <ArrowRight size={14} />
            </Link>
          </div>

          {recentHistory && recentHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentHistory.map(trip => (
                <div
                  key={trip._id}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                      #{trip.bookingId}
                    </span>
                    <StatusBadge status={trip.bookingStatus} />
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.825rem' }}>
                    {trip.pickupLocation} → {trip.dropLocation}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.775rem' }}>
                    <span>{new Date(trip.createdAt).toLocaleDateString()}</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>Earned: ₹{trip.driverPaymentAmount || Math.round(trip.fare * 0.8)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              No completed rides recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
