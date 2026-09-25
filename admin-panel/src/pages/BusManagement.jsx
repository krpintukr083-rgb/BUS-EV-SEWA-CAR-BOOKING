import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Bus, MapPin, Users, Check, Clock, Trash2 } from 'lucide-react';

import { getPrimaryVehicleImage } from '../utils/imageUrl';

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
                {getPrimaryVehicleImage(bus.vehicleImages) ? (
                  <img
                    src={getPrimaryVehicleImage(bus.vehicleImages)}
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
