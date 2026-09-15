import React, { useState, useEffect } from 'react';
import { driverService } from '../../services/driverService';
import StatusBadge from '../../components/StatusBadge';
import { Check, X, MapPin, Users, Phone, Calendar, AlertCircle } from 'lucide-react';

const BookingRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    try {
      const res = await driverService.getBookingRequests();
      if (res.success) {
        setRequests(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async id => {
    setActionLoading(id);
    setMessage('');
    setError('');
    try {
      const res = await driverService.acceptBookingRequest(id);
      if (res.success) {
        setMessage(`Booking ${res.data.bookingId} accepted successfully!`);
        await fetchRequests();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async id => {
    setActionLoading(id);
    setMessage('');
    setError('');
    try {
      const res = await driverService.rejectBookingRequest(id);
      if (res.success) {
        setMessage(`Booking ${res.data.bookingId} declined.`);
        await fetchRequests();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to decline booking');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading booking requests...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Active Booking Requests</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Review incoming trip requests allocated for your assigned route & vehicle.
          </p>
        </div>
        <button onClick={fetchRequests} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
          Refresh Requests ({requests.length})
        </button>
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
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="content-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>No Pending Requests</h3>
          <p style={{ color: '#64748b' }}>
            There are currently no new booking requests waiting for confirmation. New customer reservations will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.map(req => (
            <div key={req._id} className="content-card" style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '14px',
                  marginBottom: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1d4ed8' }}>{req.bookingId}</span>
                    <span className="badge badge-pending">{req.serviceType}</span>
                    <StatusBadge status={req.bookingStatus} />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                    Vehicle: {req.vehicle?.vehicleName} ({req.vehicle?.vehicleNumber})
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Trip Fare</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>₹{req.fare}</div>
                  <div style={{ marginTop: '2px' }}>
                    <StatusBadge status={req.paymentStatus} />
                  </div>
                </div>
              </div>

              {/* Route & Passenger details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <MapPin size={14} color="#1d4ed8" /> Route Details
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                    <strong>From:</strong> {req.pickupLocation}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', marginTop: '4px' }}>
                    <strong>To:</strong> {req.dropLocation}
                  </div>
                </div>

                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Users size={14} color="#1d4ed8" /> Passenger Details
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                    Customer: {req.customer?.name} ({req.customer?.phone})
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '4px' }}>
                    {req.passengerDetails && req.passengerDetails.length > 0
                      ? req.passengerDetails.map(p => `${p.name} (${p.age}y, ${p.gender})`).join(', ')
                      : '1 Passenger'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => handleReject(req._id)}
                  className="btn btn-outline"
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  disabled={actionLoading === req._id}
                >
                  <X size={16} /> Decline
                </button>
                <button
                  onClick={() => handleAccept(req._id)}
                  className="btn btn-primary"
                  disabled={actionLoading === req._id}
                >
                  <Check size={16} /> {actionLoading === req._id ? 'Accepting...' : 'Accept Booking'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingRequests;
