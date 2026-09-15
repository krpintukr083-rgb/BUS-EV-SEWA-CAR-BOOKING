import React, { useState, useEffect } from 'react';
import { driverService } from '../../services/driverService';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { ToggleLeft, CheckCircle2, AlertTriangle, ShieldAlert, Check } from 'lucide-react';

const DriverStatus = () => {
  const { user, refreshUser } = useAuth();
  const [currentStatus, setCurrentStatus] = useState('Active');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await driverService.getProfile();
        if (res.success) {
          setCurrentStatus(res.data.driverStatus || 'Active');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const handleStatusChange = async newStatus => {
    if (newStatus === currentStatus) return;
    setUpdating(true);
    setMessage('');
    setError('');

    try {
      const res = await driverService.updateStatus(newStatus);
      if (res.success) {
        setCurrentStatus(res.status);
        setMessage(res.message);
        await refreshUser();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update driver status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading status...</div>;
  }

  return (
    <div style={{ maxWidth: '840px' }}>
      <div className="card-header-flex" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Driver Availability Status</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Control whether you are currently on duty and available to receive new passenger bookings.
          </p>
        </div>
      </div>

      {message && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#059669',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Check size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Current Status Banner */}
      <div
        className="content-card"
        style={{
          borderLeft: `4px solid ${
            currentStatus === 'Active' ? '#10b981' : currentStatus === 'Inactive' ? '#f59e0b' : '#ef4444'
          }`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
              Current Status
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px' }}>
              <StatusBadge status={currentStatus} />
            </div>
          </div>

          <div>
            {currentStatus === 'Active' && (
              <button
                onClick={() => handleStatusChange('Inactive')}
                className="btn btn-outline"
                disabled={updating}
                style={{ borderColor: '#f59e0b', color: '#d97706' }}
              >
                Go Off-Duty (Set Inactive)
              </button>
            )}

            {currentStatus === 'Inactive' && (
              <button
                onClick={() => handleStatusChange('Active')}
                className="btn btn-success"
                disabled={updating}
              >
                Go On-Duty (Set Active)
              </button>
            )}

            {currentStatus === 'Blocked' && (
              <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '600' }}>
                Account Blocked by Administrator
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual Explanation of Statuses */}
      <div className="content-card">
        <h3 className="card-title" style={{ marginBottom: '16px' }}>Status Guidelines & Booking Availability</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: currentStatus === 'Active' ? '#ecfdf5' : '#f8fafc',
              border: `1px solid ${currentStatus === 'Active' ? '#a7f3d0' : '#e2e8f0'}`,
              display: 'flex',
              gap: '14px'
            }}
          >
            <div style={{ color: '#10b981', paddingTop: '2px' }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Active Status (Available for Trips)</strong>
                <span className="badge badge-active">Available</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#475569' }}>
                When set to <strong>Active</strong>, the system automatically dispatches new incoming booking requests on your assigned vehicle route to you. You can accept and complete trips.
              </p>
            </div>
          </div>

          {/* Inactive Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: currentStatus === 'Inactive' ? '#fffbeb' : '#f8fafc',
              border: `1px solid ${currentStatus === 'Inactive' ? '#fde68a' : '#e2e8f0'}`,
              display: 'flex',
              gap: '14px'
            }}
          >
            <div style={{ color: '#f59e0b', paddingTop: '2px' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Inactive Status (Unavailable / Off-Duty)</strong>
                <span className="badge badge-pending">Unavailable</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#475569' }}>
                <strong>Inactive drivers are strictly unavailable for new bookings.</strong> Switch to Inactive when taking a rest, off-shift, or when your vehicle is under routine service.
              </p>
            </div>
          </div>

          {/* Blocked Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: currentStatus === 'Blocked' ? '#fef2f2' : '#f8fafc',
              border: `1px solid ${currentStatus === 'Blocked' ? '#fecaca' : '#e2e8f0'}`,
              display: 'flex',
              gap: '14px'
            }}
          >
            <div style={{ color: '#ef4444', paddingTop: '2px' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Blocked Status (Admin Restricted)</strong>
                <span className="badge badge-blocked">Blocked</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#475569' }}>
                <strong>Blocked drivers cannot receive or accept any new bookings.</strong> This status is set by Super Admin due to expired documents, compliance issues, or safety audits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverStatus;
