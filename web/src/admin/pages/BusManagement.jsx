import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import { Bus, MapPin, Users, XOctagon, Check, AlertCircle } from 'lucide-react';

const BusManagement = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

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
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Intercity Bus Fleet Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Routes, seat layouts, driver assignments, passenger counters, and booking records for coach buses.
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Bus size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{bus.vehicleName}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Registration: <strong style={{ color: '#1d4ed8' }}>{bus.vehicleNumber}</strong> • {bus.vehicleModel}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <StatusBadge status={bus.vehicleStatus} />
                <button
                  onClick={() => handleStatusToggle(bus._id, bus.vehicleStatus)}
                  className={`btn btn-sm ${bus.vehicleStatus === 'Active' ? 'btn-outline' : 'btn-success'}`}
                >
                  {bus.vehicleStatus === 'Active' ? 'Set Inactive' : 'Set Active'}
                </button>
              </div>
            </div>

            {/* Specifications and Route Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
                marginBottom: '16px'
              }}
            >
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Seat Layout & Capacity</span>
                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>
                  {bus.busDetails?.seatLayout || '2+1 Sleeper'} ({bus.seatingCapacity} Total Seats)
                </div>
                <div style={{ fontSize: '0.775rem', color: '#10b981', marginTop: '2px' }}>
                  Available: {bus.availableSeats} Seats
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

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Operational Metrics</span>
                <div style={{ fontWeight: '700', color: '#1d4ed8', fontSize: '0.95rem' }}>
                  {bus.totalBookingsCount} Bookings ({bus.totalPassengersServed} Passengers)
                </div>
                <div style={{ fontSize: '0.775rem', color: '#ef4444', marginTop: '2px' }}>
                  Cancellations: {bus.cancellationsCount}
                </div>
              </div>
            </div>

            {/* Route & Stop Points */}
            <div style={{ padding: '14px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#1d4ed8', marginBottom: '6px' }}>
                <MapPin size={16} /> Route: {bus.route?.origin} → {bus.route?.destination}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#1e3a8a' }}>
                <strong>Boarding Points:</strong> {bus.route?.boardingPoints?.join(' • ') || 'Main Terminal'}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#1e3a8a', marginTop: '4px' }}>
                <strong>Dropping Points:</strong> {bus.route?.droppingPoints?.join(' • ') || 'Destination ISBT'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BusManagement;
