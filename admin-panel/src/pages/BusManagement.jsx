import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Bus, MapPin, Users, Check, Clock, Edit2, X } from 'lucide-react';

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

  // Edit Timing & Route Modal
  const [editingBus, setEditingBus] = useState(null);
  const [departureTime, setDepartureTime] = useState('06:00 AM');
  const [arrivalTime, setArrivalTime] = useState('11:30 AM');
  const [duration, setDuration] = useState('5h 30m');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [boardingPoints, setBoardingPoints] = useState('');
  const [droppingPoints, setDroppingPoints] = useState('');
  const [fareRate, setFareRate] = useState(500);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    fetchBuses();
  }, []);

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

  const handleOpenEditModal = (bus) => {
    setEditingBus(bus);
    setDepartureTime(bus.route?.departureTime || '06:00 AM');
    setArrivalTime(bus.route?.arrivalTime || '11:30 AM');
    setDuration(bus.route?.duration || '5h 30m');
    setOrigin(bus.route?.origin || 'Delhi (Kashmere Gate ISBT)');
    setDestination(bus.route?.destination || 'Jaipur (Sindhi Camp)');
    setBoardingPoints(bus.route?.boardingPoints?.join(', ') || 'ISBT Kashmere Gate, Dhaula Kuan, IFFCO Chowk');
    setDroppingPoints(bus.route?.droppingPoints?.join(', ') || 'Kotputli Bypass, Amer Road, Sindhi Camp');
    setFareRate(bus.fareRate || 500);
    setError('');
  };

  const handleSaveTimings = async (e) => {
    e.preventDefault();
    if (!editingBus) return;
    setSaving(true);
    setError('');

    try {
      const payload = {
        fareRate: Number(fareRate) || 500,
        route: {
          origin: origin.trim(),
          destination: destination.trim(),
          departureTime: departureTime.trim(),
          arrivalTime: arrivalTime.trim(),
          duration: duration.trim(),
          boardingPoints: boardingPoints ? boardingPoints.split(',').map(s => s.trim()).filter(Boolean) : [],
          droppingPoints: droppingPoints ? droppingPoints.split(',').map(s => s.trim()).filter(Boolean) : []
        },
        pickupDropDetails: {
          pickupLocation: origin.trim(),
          dropLocation: destination.trim()
        }
      };

      const res = await adminService.updateVehicle(editingBus._id, payload);
      if (res.success) {
        setMessage(`Bus timing & route updated for ${editingBus.vehicleName}`);
        setEditingBus(null);
        await fetchBuses();
      } else {
        setError(res.message || 'Failed to update bus timing');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update timing & route');
    } finally {
      setSaving(false);
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
                <button
                  onClick={() => handleOpenEditModal(bus)}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Edit2 size={15} /> Edit Timing & Route
                </button>

                <StatusBadge status={bus.vehicleStatus} />

                <button
                  onClick={() => handleStatusToggle(bus._id, bus.vehicleStatus)}
                  className={`btn btn-sm ${bus.vehicleStatus === 'Active' ? 'btn-outline' : 'btn-success'}`}
                >
                  {bus.vehicleStatus === 'Active' ? 'Set Inactive' : 'Set Active'}
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

      {/* Edit Bus Timing & Schedule Modal */}
      {editingBus && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                  Set Bus Timing & Route Schedule
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  {editingBus.vehicleName} ({editingBus.vehicleNumber})
                </p>
              </div>
              <button
                onClick={() => setEditingBus(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSaveTimings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Departure Time (e.g. 06:00 AM)
                  </label>
                  <input
                    type="text"
                    value={departureTime}
                    onChange={e => setDepartureTime(e.target.value)}
                    placeholder="06:00 AM"
                    required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Arrival Time (e.g. 11:30 AM)
                  </label>
                  <input
                    type="text"
                    value={arrivalTime}
                    onChange={e => setArrivalTime(e.target.value)}
                    placeholder="11:30 AM"
                    required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Trip Duration (e.g. 5h 30m)
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="5h 30m"
                    required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Ticket Fare per Seat (₹)
                  </label>
                  <input
                    type="number"
                    value={fareRate}
                    onChange={e => setFareRate(e.target.value)}
                    placeholder="850"
                    required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Origin (Start City)
                  </label>
                  <input
                    type="text"
                    value={origin}
                    onChange={e => setOrigin(e.target.value)}
                    placeholder="Delhi (Kashmere Gate ISBT)"
                    required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Destination (End City)
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    placeholder="Jaipur (Sindhi Camp)"
                    required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Boarding Points (Comma separated)
                </label>
                <input
                  type="text"
                  value={boardingPoints}
                  onChange={e => setBoardingPoints(e.target.value)}
                  placeholder="ISBT Kashmere Gate, Dhaula Kuan, IFFCO Chowk"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Dropping Points (Comma separated)
                </label>
                <input
                  type="text"
                  value={droppingPoints}
                  onChange={e => setDroppingPoints(e.target.value)}
                  placeholder="Kotputli Bypass, Amer Road, Sindhi Camp"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingBus(null)}
                  style={{ padding: '9px 16px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#ffffff', color: '#475569', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '9px 18px', border: 'none', borderRadius: '6px', backgroundColor: '#1d4ed8', color: '#ffffff', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save Bus Timing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusManagement;
