import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Sliders, Bus, Zap, Car, Check, AlertCircle } from 'lucide-react';

const ServiceControl = () => {
  const [controls, setControls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  const fetchServiceControl = async () => {
    try {
      const res = await adminService.getServiceControl();
      if (res.success) {
        setControls(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceControl();
  }, []);

  const handleToggle = async serviceKey => {
    if (!controls) return;
    setUpdating(true);
    setMessage('');

    const newStatus = controls[serviceKey] === 'Active' ? 'Inactive' : 'Active';
    const updated = { ...controls, [serviceKey]: newStatus };

    try {
      const res = await adminService.updateServiceControl(updated);
      if (res.success) {
        setControls(res.data);
        setMessage(res.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleInstantBookingToggle = async () => {
    if (!controls) return;
    setUpdating(true);
    setMessage('');
    try {
      const res = await adminService.updateServiceControl({
        ...controls,
        instantBookingEnabled: controls.instantBookingEnabled !== true
      });
      if (res.success) {
        setControls(res.data);
        setMessage(res.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading service control state...</div>;
  }

  return (
    <div style={{ maxWidth: '840px' }}>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Global Service Control Switches</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Control whether Bus, EV-Sewa, or Car booking channels are active. Inactive services will not accept new bookings.
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 1. Bus Booking Service Toggle */}
        <div className="content-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bus size={28} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Intercity Bus Booking Service</h3>
                  <StatusBadge status={controls?.busService} />
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                  Long distance intercity routes, seat berths, and state luxury coaches.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleToggle('busService')}
              className={`btn ${controls?.busService === 'Active' ? 'btn-outline' : 'btn-success'}`}
              disabled={updating}
            >
              {controls?.busService === 'Active' ? 'Switch to Inactive' : 'Activate Bus Service'}
            </button>
          </div>
        </div>

        {/* 2. EV-Sewa Booking Service Toggle */}
        <div className="content-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '10px',
                  backgroundColor: '#ecfdf5',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Zap size={28} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>EV-Sewa Green Electric Service</h3>
                  <StatusBadge status={controls?.evSewaService} />
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                  City electric shuttles and feeder connectivity routes.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleToggle('evSewaService')}
              className={`btn ${controls?.evSewaService === 'Active' ? 'btn-outline' : 'btn-success'}`}
              disabled={updating}
            >
              {controls?.evSewaService === 'Active' ? 'Switch to Inactive' : 'Activate EV-Sewa'}
            </button>
          </div>
        </div>

        {/* 3. Car Booking Service Toggle */}
        <div className="content-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '10px',
                  backgroundColor: '#eef2ff',
                  color: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Car size={28} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Car & Chauffeur Cab Service</h3>
                  <StatusBadge status={controls?.carService} />
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                  Airport drop, premium sedan, SUV, and outstation chauffeur cabs.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleToggle('carService')}
              className={`btn ${controls?.carService === 'Active' ? 'btn-outline' : 'btn-success'}`}
              disabled={updating}
            >
              {controls?.carService === 'Active' ? 'Switch to Inactive' : 'Activate Car Service'}
            </button>
          </div>
        </div>

        <div className="content-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Optional Instant Booking</h3>
                <StatusBadge status={controls?.instantBookingEnabled ? 'Active' : 'Inactive'} />
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                Allow customers to request immediate assignment for an eligible online driver on the selected route.
              </p>
            </div>
            <button
              onClick={handleInstantBookingToggle}
              className={`btn ${controls?.instantBookingEnabled ? 'btn-outline' : 'btn-success'}`}
              disabled={updating}
            >
              {controls?.instantBookingEnabled ? 'Disable Instant Booking' : 'Enable Instant Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceControl;
