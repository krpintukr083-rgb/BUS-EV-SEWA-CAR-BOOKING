import React, { useState, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Phone,
  MessageSquare,
  DollarSign,
  Send,
  XCircle,
  Key
} from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const ActiveRide = () => {
  const { t } = useLanguage();
  const [activeRide, setActiveRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer did not arrive');
  const [customCancelText, setCustomCancelText] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatSentNotice, setChatSentNotice] = useState('');

  const fetchActiveRide = async () => {
    try {
      setLoading(true);
      const res = await api.get('/driver/dashboard');
      if (res.data.success && res.data.data.activeRide) {
        setActiveRide(res.data.data.activeRide);
      } else {
        const reqRes = await api.get('/driver/requests');
        if (reqRes.data.success) {
          const ongoing = reqRes.data.data.find(
            r => ['Accepted', 'Arrived', 'Started'].includes(r.rideStatus) ||
                 ['Ongoing', 'Awaiting Cash Collection'].includes(r.bookingStatus)
          );
          setActiveRide(ongoing || null);
        }
      }
    } catch (err) {
      console.error('Error fetching active ride:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRide();
    const interval = setInterval(fetchActiveRide, 10000);
    return () => clearInterval(interval);
  }, []);

  // Clock-based waiting timer after driver arrives (NO GPS)
  useEffect(() => {
    let timer;
    if (activeRide && activeRide.rideStatus === 'Arrived') {
      timer = setInterval(() => {
        setWaitingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setWaitingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activeRide?.rideStatus]);

  const handleArrived = async () => {
    if (!activeRide) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post(`/driver/rides/${activeRide._id}/arrived`);
      if (res.data.success) {
        setSuccessMessage(t('arrived') + ' - Customer has been notified.');
        setActiveRide(prev => ({ ...prev, rideStatus: 'Arrived' }));
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to mark arrival.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartRide = async () => {
    if (!activeRide) return;
    if (!otpInput && !activeRide.otpVerified) {
      setErrorMessage('Please enter the customer 4-digit PIN to start the ride.');
      return;
    }

    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post(`/driver/rides/${activeRide._id}/start`, { otp: otpInput });
      if (res.data.success) {
        setSuccessMessage('Ride started! You may now navigate to the drop destination.');
        setActiveRide(prev => ({ ...prev, rideStatus: 'Started', bookingStatus: 'Ongoing', otpVerified: true }));
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Invalid PIN or error starting ride.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndRide = async () => {
    if (!activeRide) return;
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post(`/driver/rides/${activeRide._id}/end`);
      if (res.data.success) {
        setReceipt(res.data.data.receipt);
        setActiveRide(null);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Error completing ride.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (!activeRide) return;
    setActionLoading(true);
    try {
      const finalReason = cancelReason === 'Other' ? (customCancelText || 'Driver cancelled') : cancelReason;
      const res = await api.post(`/driver/rides/${activeRide._id}/cancel`, { reason: finalReason });
      if (res.data.success) {
        setCancelModalOpen(false);
        setActiveRide(null);
        setSuccessMessage('Ride cancelled.');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Error cancelling ride.');
    } finally {
      setActionLoading(false);
    }
  };

  const sendQuickMessage = (msg) => {
    setChatSentNotice(`Message sent: "${msg}"`);
    setTimeout(() => setChatSentNotice(''), 4000);
  };

  const formatWaitingTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        {t('loading')}
      </div>
    );
  }

  // If ride just completed and receipt is ready
  if (receipt) {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          <CheckCircle size={56} color="#10b981" style={{ margin: '0 auto' }} />
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '24px', fontWeight: '700' }}>
            {t('rideCompleted')}
          </h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Booking #{receipt.tripId} has been successfully settled and credited to your wallet.
          </p>

          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              border: '1px solid #334155'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
              <span>Total Fare</span>
              <span style={{ fontWeight: '700', color: '#fff' }}>₹{receipt.totalFare}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
              <span>{t('commission')}</span>
              <span>-₹{receipt.commission}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid #334155',
                color: '#10b981',
                fontSize: '18px',
                fontWeight: '700'
              }}
            >
              <span>Driver Earnings</span>
              <span>₹{receipt.netEarnings}</span>
            </div>
          </div>

          <button
            onClick={() => setReceipt(null)}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '14px',
              borderRadius: '10px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!activeRide) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '40px 20px',
            maxWidth: '500px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <Navigation size={48} color="#64748b" />
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '20px' }}>No Active Ride In Progress</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
            You are currently not on an ongoing ride. When you accept an incoming booking request, the live trip management interface will appear here.
          </p>
        </div>
      </div>
    );
  }

  const pickupNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeRide.pickupLocation)}`;
  const dropNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeRide.dropLocation)}`;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                backgroundColor: activeRide.rideStatus === 'Started' ? '#10b981' : '#2563eb',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: '20px',
                textTransform: 'uppercase'
              }}
            >
              {activeRide.rideStatus || 'Accepted'}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>
              Booking #{activeRide.bookingId}
            </span>
          </div>
          <h2 style={{ margin: '8px 0 0 0', color: '#f8fafc', fontSize: '22px', fontWeight: '700' }}>
            {activeRide.serviceType || 'Transport'} Journey
          </h2>
        </div>

        <button
          onClick={() => setCancelModalOpen(true)}
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Cancel Ride
        </button>
      </div>

      {errorMessage && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Passenger & Fare Card */}
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={22} color="#94a3b8" />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '12px' }}>{t('customer')}</div>
            <div style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '16px' }}>
              {activeRide.customer?.name || 'Passenger'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>
              {activeRide.customer?.phone || 'Verified'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} color="#5eead4" />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '12px' }}>{t('fare')}</div>
            <div style={{ color: '#10b981', fontWeight: '800', fontSize: '20px' }}>
              ₹{activeRide.fare}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>
              {activeRide.paymentMethod} • {activeRide.paymentStatus}
            </div>
          </div>
        </div>
      </div>

      {/* Route & External Navigation Links (STRICTLY NO GPS TRACKING) */}
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: '700' }}>
          Trip Navigation (External Google Maps)
        </h3>

        {/* Pickup Item */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ marginTop: '3px' }}>
              <MapPin size={20} color="#10b981" />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '700' }}>
                {t('pickup')}
              </div>
              <div style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: '600', marginTop: '2px' }}>
                {activeRide.pickupLocation}
              </div>
            </div>
          </div>

          <a
            href={pickupNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#047857',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px'
            }}
          >
            <Navigation size={16} />
            <span>{t('navigateToPickup')}</span>
          </a>
        </div>

        <div style={{ height: '1px', backgroundColor: '#334155' }} />

        {/* Drop Item */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ marginTop: '3px' }}>
              <MapPin size={20} color="#ef4444" />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', fontWeight: '700' }}>
                {t('drop')}
              </div>
              <div style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: '600', marginTop: '2px' }}>
                {activeRide.dropLocation}
              </div>
            </div>
          </div>

          <a
            href={dropNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#1e40af',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px'
            }}
          >
            <Navigation size={16} />
            <span>{t('navigateToDrop')}</span>
          </a>
        </div>
      </div>

      {/* Step Action Cards */}
      {activeRide.rideStatus === 'Accepted' && (
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #3b82f6',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            textAlign: 'center'
          }}
        >
          <h4 style={{ margin: 0, color: '#93c5fd', fontSize: '16px' }}>
            Step 1: Navigate to passenger pickup point
          </h4>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>
            When you reach the pickup location, press the button below to notify the customer and begin the waiting timer.
          </p>
          <button
            onClick={handleArrived}
            disabled={actionLoading}
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '17px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            {actionLoading ? 'Updating...' : t('arrived')}
          </button>
        </div>
      )}

      {activeRide.rideStatus === 'Arrived' && (
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #10b981',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ color: '#34d399', fontWeight: '700', fontSize: '16px' }}>
              Step 2: Passenger Boarding & PIN Verification
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '15px', fontWeight: '700' }}>
              <Clock size={18} />
              <span>Waiting: {formatWaitingTimer(waitingSeconds)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: '600' }}>
              {t('enterOtp')}
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="4-digit PIN"
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  padding: '14px',
                  color: '#fff',
                  fontSize: '20px',
                  letterSpacing: '4px',
                  fontWeight: '700',
                  width: '180px',
                  textAlign: 'center'
                }}
              />
              <button
                onClick={handleStartRide}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {actionLoading ? 'Verifying...' : t('startRide')}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeRide.rideStatus === 'Started' && (
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #10b981',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ color: '#34d399', fontWeight: '700', fontSize: '18px' }}>
            Ride In Progress — Heading to Destination
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Use the external Google Maps navigation above. Upon safely reaching the destination, tap End Ride to finalize the trip and receive earnings.
          </p>
          <button
            onClick={handleEndRide}
            disabled={actionLoading}
            style={{
              backgroundColor: '#dc2626',
              color: '#fff',
              border: 'none',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '17px',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            {actionLoading ? 'Completing...' : t('endRide')}
          </button>
        </div>
      )}

      {/* Predefined Quick Messages */}
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>
          <MessageSquare size={16} />
          <span>Passenger Quick Communication</span>
        </div>

        {chatSentNotice && (
          <div style={{ color: '#34d399', fontSize: '13px', fontWeight: '600' }}>
            {chatSentNotice}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['I have arrived.', 'Please come to the pickup point.', 'I am waiting at the pickup location.'].map((msg, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendQuickMessage(msg)}
              style={{
                backgroundColor: '#334155',
                color: '#e2e8f0',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              "{msg}"
            </button>
          ))}
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>
              Cancel Active Ride
            </h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
              Please select the reason for ride cancellation:
            </p>

            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '8px',
                padding: '12px',
                color: '#fff',
                fontSize: '14px'
              }}
            >
              <option value="Customer did not arrive">Customer did not arrive</option>
              <option value="Wrong pickup">Wrong pickup</option>
              <option value="Vehicle problem">Vehicle problem</option>
              <option value="Emergency">Emergency</option>
              <option value="Other">Other</option>
            </select>

            {cancelReason === 'Other' && (
              <textarea
                value={customCancelText}
                onChange={(e) => setCustomCancelText(e.target.value)}
                placeholder="Enter cancellation reason..."
                rows={3}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                style={{
                  backgroundColor: '#334155',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleCancelRide}
                disabled={actionLoading}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveRide;
