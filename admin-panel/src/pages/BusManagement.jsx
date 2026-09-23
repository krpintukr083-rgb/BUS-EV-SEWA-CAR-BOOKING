import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Bus, MapPin, Users, Check, Clock, Tag, Percent, Sparkles, Save, AlertCircle, Eye, EyeOff, Trash2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${SERVER_URL}${url}`;
  return `${SERVER_URL}/${url}`;
};

const BusManagement = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Delete Bus Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setError('');
      setMessage('');
      const res = await adminService.deleteVehicle(deleteTarget._id);
      if (res && res.success) {
        setMessage('Vehicle deleted successfully.');
        setDeleteTarget(null);
        fetchBuses();
        setTimeout(() => setMessage(''), 4000);
      } else {
        setError(res?.message || 'Unable to delete vehicle. Please try again.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Unable to delete vehicle. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Bus Offer / Discount Banner State
  const [offerStatus, setOfferStatus] = useState('active');
  const [discountPercentage, setDiscountPercentage] = useState(15);
  const [offerTitle, setOfferTitle] = useState('Intercity Luxury Bus Travel');
  const [offerSubtitle, setOfferSubtitle] = useState('AC Sleeper & Seater coaches with live tracking and instant seat selection.');
  const [offerLoading, setOfferLoading] = useState(true);
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerMessage, setOfferMessage] = useState('');
  const [offerError, setOfferError] = useState('');

  const fetchBuses = async () => {
    try {
      const res = await adminService.getBuses();
      if (res.success) {
        setBuses(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffer = async () => {
    try {
      setOfferLoading(true);
      const res = await adminService.getBusOffer();
      if (res.success && res.data) {
        setOfferStatus(res.data.offerStatus || 'active');
        setDiscountPercentage(res.data.discountPercentage ?? 15);
        setOfferTitle(res.data.offerTitle || 'Intercity Luxury Bus Travel');
        setOfferSubtitle(res.data.offerSubtitle || 'AC Sleeper & Seater coaches with live tracking and instant seat selection.');
      }
    } catch (err) {
      console.error('Failed to load bus offer config:', err);
    } finally {
      setOfferLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
    fetchOffer();
  }, []);

  const handleSaveOffer = async (e) => {
    e?.preventDefault?.();
    setOfferMessage('');
    setOfferError('');

    // Strict validation
    if (discountPercentage === '' || discountPercentage === null || discountPercentage === undefined) {
      setOfferError('Discount percentage is required.');
      return;
    }

    const val = Number(discountPercentage);
    if (isNaN(val)) {
      setOfferError('Discount percentage must be a valid number.');
      return;
    }

    if (val < 0 || val > 100) {
      setOfferError('Discount percentage must be between 0 and 100.');
      return;
    }

    setOfferSaving(true);
    try {
      const payload = {
        offerStatus,
        discountPercentage: val,
        offerTitle: offerTitle.trim(),
        offerSubtitle: offerSubtitle.trim()
      };
      const res = await adminService.updateBusOffer(payload);
      if (res.success) {
        setOfferMessage(`Bus discount updated to ${val}% (${offerStatus.toUpperCase()}) successfully!`);
        if (res.data) {
          setOfferStatus(res.data.offerStatus);
          setDiscountPercentage(res.data.discountPercentage);
        }
      } else {
        setOfferError(res.message || 'Failed to update bus offer');
      }
    } catch (err) {
      console.error('Error updating bus offer:', err);
      setOfferError(err.response?.data?.message || 'Failed to save bus offer configuration');
    } finally {
      setOfferSaving(false);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await adminService.updateVehicleStatus(id, newStatus);
      if (res.success) {
        setMessage(`Bus status updated to ${newStatus}`);
        await fetchBuses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading bus fleet...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Intercity Bus Fleet & Timing Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Set departure times, arrival schedules, route origins, stopping points, and seat fares for all coach buses.
          </p>
        </div>
      </div>

      {message && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#059669',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Check size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* BUS DISCOUNT & PROMOTIONAL BANNER CONFIGURATION CARD */}
      {/* ======================================================== */}
      <div className="content-card" style={{ marginBottom: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                Bus Discount / Promotional Offer Management
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Configure the top promotional discount banner shown in Customer App. Percentage updates dynamically in real-time.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: offerStatus === 'active' ? '#dcfce7' : '#f1f5f9',
                color: offerStatus === 'active' ? '#15803d' : '#64748b'
              }}
            >
              {offerStatus === 'active' ? <Eye size={13} /> : <EyeOff size={13} />}
              {offerStatus === 'active' ? 'BANNER VISIBLE (ACTIVE)' : 'BANNER HIDDEN (INACTIVE)'}
            </span>
          </div>
        </div>

        {offerMessage && (
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={16} />
            <span>{offerMessage}</span>
          </div>
        )}

        {offerError && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{offerError}</span>
          </div>
        )}

        <form onSubmit={handleSaveOffer}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            {/* Field 1: Offer Status */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Offer Status
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setOfferStatus('active')}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    border: offerStatus === 'active' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    backgroundColor: offerStatus === 'active' ? '#f0fdf4' : '#ffffff',
                    color: offerStatus === 'active' ? '#16a34a' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Active (Show Banner)
                </button>
                <button
                  type="button"
                  onClick={() => setOfferStatus('inactive')}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    border: offerStatus === 'inactive' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: offerStatus === 'inactive' ? '#fef2f2' : '#ffffff',
                    color: offerStatus === 'inactive' ? '#dc2626' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Inactive (Hide Banner)
                </button>
              </div>
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                When Inactive, the banner is completely hidden from the Customer App.
              </small>
            </div>

            {/* Field 2: Discount Percentage */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Discount Percentage (%)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  placeholder="e.g. 20"
                  style={{
                    width: '100%',
                    padding: '9px 36px 9px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                  required
                />
                <Percent size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Allowed range: 0% to 100%. Customer banner updates immediately.
              </small>
            </div>

            {/* Field 3: Automatically Generated Discount Label */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Discount Label (Auto-generated)
              </label>
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #94a3b8',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: '#1d4ed8'
                }}
              >
                Flat {discountPercentage !== '' && !isNaN(Number(discountPercentage)) ? discountPercentage : 0}% OFF
              </div>
              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Automatically derived from percentage input. No manual typing required.
              </small>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginBottom: '18px' }}>
            {/* Field 4: Offer Title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Offer Title
              </label>
              <input
                type="text"
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                placeholder="Intercity Luxury Bus Travel"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            {/* Field 5: Offer Subtitle */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Offer Subtitle
              </label>
              <input
                type="text"
                value={offerSubtitle}
                onChange={(e) => setOfferSubtitle(e.target.value)}
                placeholder="AC Sleeper & Seater coaches with live tracking and instant seat selection."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  color: '#0f172a',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          </div>

          {/* Real-Time Live Preview of Customer App Banner */}
          <div style={{ marginBottom: '18px', padding: '16px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '0.8rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
              <Sparkles size={14} color="#f59e0b" /> Customer App Banner Live Preview
            </div>

            {offerStatus === 'inactive' ? (
              <div style={{ padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '8px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', border: '1px dashed #cbd5e1' }}>
                Banner is currently <strong>HIDDEN</strong> in Customer App (Offer Status: Inactive)
              </div>
            ) : (
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
                }}
              >
                <div style={{ maxWidth: '75%' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '8px', color: '#fef08a' }}>
                    <Sparkles size={11} color="#fef08a" /> EXCLUSIVE BUS OFFER
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '700', lineHeight: 1.3, marginBottom: '4px' }}>
                    {offerTitle || 'Intercity Luxury Bus Travel'}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9, lineHeight: 1.4, marginBottom: '12px' }}>
                    {offerSubtitle || 'AC Sleeper & Seater coaches with live tracking and instant seat selection.'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ backgroundColor: '#ffffff', color: '#1d4ed8', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700' }}>
                      Book Bus Tickets →
                    </div>
                    <div style={{ backgroundColor: '#f59e0b', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800' }}>
                      Flat {discountPercentage !== '' && !isNaN(Number(discountPercentage)) ? discountPercentage : 0}% OFF
                    </div>
                  </div>
                </div>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bus size={32} color="#ffffff" />
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="submit"
              disabled={offerSaving}
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 22px',
                fontSize: '0.9rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: offerSaving ? 'not-allowed' : 'pointer',
                opacity: offerSaving ? 0.7 : 1
              }}
            >
              <Save size={16} />
              {offerSaving ? 'Saving Discount Offer...' : 'Save Bus Offer'}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {buses.map(bus => (
          <div key={bus._id} className="content-card">
            <div className="card-header-flex">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {bus.vehicleImages && bus.vehicleImages.length > 0 ? (
                  <img
                    src={getImageUrl(bus.vehicleImages[0])}
                    alt={bus.vehicleName}
                    style={{
                      width: '64px',
                      height: '48px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid #cbd5e1',
                      flexShrink: 0
                    }}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Bus size={24} />
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{bus.vehicleName}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Registration: <strong style={{ color: '#1d4ed8' }}>{bus.vehicleNumber}</strong> • {bus.vehicleModel}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StatusBadge status={bus.vehicleStatus} />

                <button
                  onClick={() => handleStatusToggle(bus._id, bus.vehicleStatus)}
                  className={`btn btn-sm ${bus.vehicleStatus === 'Active' ? 'btn-outline' : 'btn-success'}`}
                >
                  {bus.vehicleStatus === 'Active' ? 'Set Inactive' : 'Set Active'}
                </button>
                <button
                  onClick={() => setDeleteTarget(bus)}
                  style={{
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer'
                  }}
                  title="Delete Bus"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>

            {/* Specifications, Timings, and Driver Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
                marginBottom: '16px'
              }}
            >
              {/* Bus Departure & Arrival Schedule */}
              <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#166534', fontWeight: '600' }}>
                  <Clock size={14} /> Bus Timings & Schedule
                </div>
                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem', marginTop: '4px' }}>
                  {bus.route?.departureTime || '06:00 AM'} → {bus.route?.arrivalTime || '11:30 AM'}
                </div>
                <div style={{ fontSize: '0.775rem', color: '#15803d', marginTop: '2px' }}>
                  Duration: {bus.route?.duration || '5h 30m'}
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Seat Layout & Capacity</span>
                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>
                  {bus.busDetails?.seatLayout || '2+1 Sleeper'} ({bus.seatingCapacity} Total Seats)
                </div>
                <div style={{ fontSize: '0.775rem', color: '#10b981', marginTop: '2px' }}>
                  Available: {bus.busDetails?.availableSeats ?? bus.seatingCapacity} Seats
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Driver Assignment</span>
                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>
                  {bus.assignedDriver ? bus.assignedDriver.name : 'Unassigned'}
                </div>
                <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '2px' }}>
                  {bus.assignedDriver ? bus.assignedDriver.mobileNumber : 'Assign in Driver Management'}
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Ticket Fare</span>
                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.1rem' }}>₹{bus.fareRate}</div>
                <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '2px' }}>Per Berth / Seat</div>
              </div>
            </div>

            {/* Route & Stop Points */}
            <div style={{ padding: '14px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#1d4ed8', marginBottom: '6px' }}>
                <MapPin size={16} /> Route: {bus.route?.origin || 'Delhi (Kashmere Gate ISBT)'} → {bus.route?.destination || 'Jaipur (Sindhi Camp)'}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#1e3a8a' }}>
                <strong>Boarding Points:</strong> {bus.route?.boardingPoints?.join(' • ') || 'ISBT Kashmere Gate, Dhaula Kuan, IFFCO Chowk'}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#1e3a8a', marginTop: '4px' }}>
                <strong>Dropping Points:</strong> {bus.route?.droppingPoints?.join(' • ') || 'Kotputli Bypass, Amer Road, Sindhi Camp'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '20px',
                backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <AlertCircle size={24} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Delete Vehicle?
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  {deleteTarget.vehicleName} ({deleteTarget.vehicleNumber})
                </p>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5', marginBottom: '24px' }}>
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusManagement;
