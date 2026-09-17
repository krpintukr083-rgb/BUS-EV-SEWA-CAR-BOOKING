import React, { useState, useEffect } from 'react';
import { driverService } from '../../services/driverService';
import StatusBadge from '../../components/StatusBadge';
import { Check, X, MapPin, Users, Phone, Calendar, AlertCircle, Banknote, ShieldCheck, CheckCircle2 } from 'lucide-react';

const BookingRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Cash collection modal state
  const [collectingBooking, setCollectingBooking] = useState(null);
  const [collectingLoading, setCollectingLoading] = useState(false);

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

  const handleOpenCollectCashModal = req => {
    setCollectingBooking(req);
    setError('');
    setMessage('');
  };

  const handleConfirmCashCollection = async () => {
    if (!collectingBooking) return;
    setCollectingLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await driverService.collectCash(collectingBooking._id);
      if (res.success) {
        setMessage(`Cash collection confirmed! Booking ${collectingBooking.bookingId} is now marked Paid.`);
        setCollectingBooking(null);
        await fetchRequests();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to collect cash');
    } finally {
      setCollectingLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading trips & requests...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Assigned Trips & Booking Requests</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Manage allocated passenger bookings, verify boarding passes, and collect on-spot Offline Cash fares.
          </p>
        </div>
        <button onClick={fetchRequests} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
          Refresh Trips ({requests.length})
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>No Active Trips or Requests</h3>
          <p style={{ color: '#64748b' }}>
            There are currently no trip requests or offline cash passenger collections scheduled for your assigned vehicle.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.map(req => {
            const isOfflineCash = req.paymentMethod === 'Offline Cash' || req.paymentMethod === 'Cash';
            const isCashPending = isOfflineCash && (req.paymentStatus === 'Pending Cash' || !req.cashCollected);

            return (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1d4ed8' }}>{req.bookingId}</span>
                      <span className="badge badge-pending">{req.serviceType}</span>
                      <StatusBadge status={req.bookingStatus} />
                      {isOfflineCash ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: isCashPending ? '#fef3c7' : '#dcfce7',
                            color: isCashPending ? '#b45309' : '#15803d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Banknote size={13} />
                          {isCashPending ? 'Offline Cash: Pending' : 'Offline Cash: Collected'}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1'
                          }}
                        >
                          Online Payment
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                      Vehicle: <strong>{req.vehicle?.vehicleName || 'Fleet Vehicle'}</strong> ({req.vehicle?.vehicleNumber || 'Unassigned'})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Booking Amount</div>
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
                      <strong>Pickup:</strong> {req.pickupLocation}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', marginTop: '4px' }}>
                      <strong>Drop-off:</strong> {req.dropLocation}
                    </div>
                    {req.busSeatNumbers && req.busSeatNumbers.length > 0 && (
                      <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1d4ed8', marginTop: '6px' }}>
                        Selected Seats: {req.busSeatNumbers.join(', ')}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <Users size={14} color="#1d4ed8" /> Customer & Passengers
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>
                      {req.customer?.name} ({req.customer?.phone})
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#475569', marginTop: '4px' }}>
                      {req.passengerDetails && req.passengerDetails.length > 0
                        ? req.passengerDetails.map(p => `${p.name} (${p.age}y, ${p.gender}${p.seatNumber ? ` - Seat ${p.seatNumber}` : ''})`).join(', ')
                        : '1 Passenger'}
                    </div>
                  </div>
                </div>

                {/* Cash collection banner or Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  {isOfflineCash && (
                    <div style={{ fontSize: '0.82rem', color: isCashPending ? '#b45309' : '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isCashPending ? (
                        <>
                          <AlertCircle size={15} />
                          <span>Passenger must pay <strong>₹{req.fare}</strong> in cash upon boarding.</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} color="#16a34a" />
                          <span>Cash fare collected and verified in system.</span>
                        </>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                    {req.bookingStatus === 'Pending' && (
                      <>
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
                          <Check size={16} /> {actionLoading === req._id ? 'Accepting...' : 'Accept Trip'}
                        </button>
                      </>
                    )}

                    {isCashPending && (
                      <button
                        type="button"
                        onClick={() => handleOpenCollectCashModal(req)}
                        className="btn btn-primary"
                        style={{ backgroundColor: '#059669', borderColor: '#059669', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Banknote size={16} /> Collect Cash (₹{req.fare})
                      </button>
                    )}

                    {isOfflineCash && !isCashPending && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          backgroundColor: '#ecfdf5',
                          borderRadius: '6px',
                          color: '#047857',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          border: '1px solid #a7f3d0'
                        }}
                      >
                        <CheckCircle2 size={16} /> Cash Collected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Collect Cash Confirmation Modal */}
      {collectingBooking && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="card-header-flex">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                  <Banknote size={22} />
                </div>
                <div>
                  <h3 className="card-title">Collect Offline Cash</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Booking #{collectingBooking.bookingId}</span>
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setCollectingBooking(null)}>✕</button>
            </div>

            <div style={{ margin: '16px 0', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Customer Name:</span>
                <strong style={{ color: '#0f172a' }}>{collectingBooking.customer?.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Customer Phone:</span>
                <strong style={{ color: '#0f172a' }}>{collectingBooking.customer?.phone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Route:</span>
                <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '0.85rem' }}>
                  {collectingBooking.pickupLocation} → {collectingBooking.dropLocation}
                </span>
              </div>
              {collectingBooking.busSeatNumbers && collectingBooking.busSeatNumbers.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Reserved Seats:</span>
                  <strong style={{ color: '#1d4ed8' }}>{collectingBooking.busSeatNumbers.join(', ')}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                <span style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>Cash Fare Amount:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669' }}>₹{collectingBooking.fare}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '20px' }}>
              By confirming, you certify that the customer has handed over ₹{collectingBooking.fare} in physical cash for their seat reservation.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setCollectingBooking(null)}
                disabled={collectingLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmCashCollection}
                disabled={collectingLoading}
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              >
                <Check size={16} />
                {collectingLoading ? 'Confirming Receipt...' : 'Confirm Cash Received'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingRequests;
