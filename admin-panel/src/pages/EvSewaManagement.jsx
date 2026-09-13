import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Zap, MapPin, UserCheck, FileCheck, CheckCircle2, ShieldCheck } from 'lucide-react';

const EvSewaManagement = () => {
  const [evs, setEvs] = useState([]);
  const [loading, setLoading] = useState(true);

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
        await fetchEvs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading EV-Sewa electric fleet...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>EV-Sewa Green Transit Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Zero-emission electric passenger shuttle corridors, charging specs, and compliance verification.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {evs.map(ev => (
          <div key={ev._id} className="content-card">
            <div className="card-header-flex">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    backgroundColor: '#ecfdf5',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Zap size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{ev.vehicleName}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Registration: <strong style={{ color: '#059669' }}>{ev.vehicleNumber}</strong> • {ev.vehicleModel}
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
                  {ev.evDetails?.batteryCapacity || '72 kWh'} ({ev.evDetails?.rangeKm || 280} km Range)
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
                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.05rem' }}>₹{ev.fareRate}</div>
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
                <MapPin size={16} /> EV Shuttle Route: {ev.route?.origin || ev.pickupDropDetails?.pickupLocation} → {ev.route?.destination || ev.pickupDropDetails?.dropLocation}
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
