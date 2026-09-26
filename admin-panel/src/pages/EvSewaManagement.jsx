import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Zap, MapPin, UserCheck, FileCheck, CheckCircle2, ShieldCheck, Check } from 'lucide-react';

import { getPrimaryVehicleImage } from '../utils/imageUrl';

const EvSewaManagement = () => {
  const [evs, setEvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchEvs = async () => {
    try {
      const res = await adminService.getEvSewa();
      if (res.success) {
        setEvs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvs();
  }, []);

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await adminService.updateVehicleStatus(id, newStatus);
      if (res.success) {
        setMessage(`EV-Sewa status updated to ${newStatus}`);
        await fetchEvs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading EV fleet...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>EV-Sewa Fleet Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Zero-emission electric shuttles, battery capacities, certified drivers, and point-to-point urban routes.
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
        {evs.map(ev => (
          <div key={ev._id} className="content-card">
            <div className="card-header-flex">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {getPrimaryVehicleImage(ev.vehicleImages) ? (
                  <img
                    src={getPrimaryVehicleImage(ev.vehicleImages)}
                    alt={ev.vehicleName}
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
                      backgroundColor: '#ecfdf5',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Zap size={24} />
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{ev.vehicleName}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Registration: <strong style={{ color: '#059669' }}>{ev.vehicleNumber}</strong> â€¢ {ev.vehicleModel}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <StatusBadge status={ev.vehicleStatus} />
                <button
                  onClick={() => handleStatusToggle(ev._id, ev.vehicleStatus)}
                  className={`btn btn-sm ${ev.vehicleStatus === 'Active' ? 'btn-outline' : 'btn-success'}`}
                >
                  {ev.vehicleStatus === 'Active' ? 'Set Inactive' : 'Set Active'}
                </button>
              </div>
            </div>

            {/* EV Specs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Battery & Range</span>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>
                  {ev.evDetails?.batteryCapacity || 'Not Available'} ({ev.evDetails?.rangeKm || 280} km Range)
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Driver Assignment</span>
                <div style={{ fontWeight: '700', color: '#0f172a' }}>
                  {ev.assignedDriver ? ev.assignedDriver.name : 'Unassigned'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {ev.assignedDriver ? ev.assignedDriver.mobileNumber : 'No driver linked'}
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Trip Fare Rate</span>
                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.05rem' }}>â‚¹{ev.fareRate}</div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Compliance Verification</span>
                <div style={{ fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                  <ShieldCheck size={14} /> RC & Insurance Verified
                </div>
              </div>
            </div>

            {/* Route & Pickup/Drop */}
            <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.85rem', color: '#166534' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', marginBottom: '4px' }}>
                <MapPin size={16} /> EV Shuttle Route: {ev.route?.origin || ev.pickupDropDetails?.pickupLocation} â†’ {ev.route?.destination || ev.pickupDropDetails?.dropLocation}
              </div>
              <div>
                RC: <code>{ev.rcNumber}</code> | Insurance Policy: <code>{ev.insurancePolicyNumber}</code>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EvSewaManagement;
