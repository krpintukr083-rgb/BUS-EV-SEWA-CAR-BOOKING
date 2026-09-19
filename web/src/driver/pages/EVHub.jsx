import React, { useState, useEffect } from 'react';
import {
  Zap,
  BatteryCharging,
  Navigation,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Sliders,
  ShieldAlert,
  Info
} from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../context/LanguageContext';

const EVHub = () => {
  const { t } = useLanguage();
  const [evData, setEvData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [batteryInput, setBatteryInput] = useState(85);
  const [rangeInput, setRangeInput] = useState(180);
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchEVData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/driver/ev-hub');
      if (res.data.success) {
        setEvData(res.data.data);
        setBatteryInput(res.data.data.batteryPercentage || 85);
        setRangeInput(res.data.data.estimatedRangeKm || 180);
      }
    } catch (err) {
      if (err.response?.status === 400) {
        setEvData({ notEV: true, message: err.response.data.message });
      } else {
        setErrorMsg('Error loading EV hub data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEVData();
  }, []);

  const handleUpdateBattery = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.put('/driver/ev-battery', {
        batteryPercentage: Number(batteryInput),
        estimatedRangeKm: Number(rangeInput)
      });
      if (res.data.success) {
        setSuccessMsg('Battery and estimated range updated successfully.');
        fetchEVData();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error updating EV status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        {t('loading')}
      </div>
    );
  }

  if (evData?.notEV) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '40px 20px',
            maxWidth: '520px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <Zap size={48} color="#64748b" />
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '20px' }}>
            EV Hub Exclusive to Electric Vehicles
          </h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>
            Your currently assigned vehicle is configured as Petrol / Diesel / Conventional. EV charging stations, battery levels, and range metrics are available for Electric Vehicles (EV-Sewa & EV Cars).
          </p>
        </div>
      </div>
    );
  }

  const battery = evData?.batteryPercentage || 85;
  const range = evData?.estimatedRangeKm || 180;
  const isLow = battery < 20;

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '26px', fontWeight: '800' }}>
          {t('evHub')}
        </h1>
        <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
          Real-time battery management, estimated range advisory, and public charging network directory.
        </p>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Battery State Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Battery Level Card */}
        <div
          style={{
            backgroundColor: '#1e293b',
            border: isLow ? '2px solid #ef4444' : '1px solid #10b981',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: isLow ? '0 10px 25px -5px rgba(239, 68, 68, 0.2)' : '0 10px 25px -5px rgba(16, 185, 129, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: isLow ? '#f87171' : '#34d399', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>
              {t('batteryPercentage')}
            </span>
            <BatteryCharging size={24} color={isLow ? '#ef4444' : '#10b981'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ color: '#ffffff', fontSize: '40px', fontWeight: '900' }}>
              {battery}%
            </span>
            <span style={{ color: isLow ? '#fca5a5' : '#86efac', fontSize: '14px', fontWeight: '600' }}>
              {isLow ? 'Low Battery' : 'Optimal'}
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${battery}%`,
                height: '100%',
                backgroundColor: isLow ? '#ef4444' : '#10b981',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>

        {/* Estimated Range Card */}
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>
              {t('estimatedRange')}
            </span>
            <Zap size={24} color="#38bdf8" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ color: '#38bdf8', fontSize: '40px', fontWeight: '900' }}>
              {range}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '16px', fontWeight: '600' }}>
              km remaining
            </span>
          </div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            Calculated based on average 5.2 km/kWh efficiency
          </span>
        </div>
      </div>

      {/* Manual Battery Update (Strictly NO fake live telemetry) */}
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontSize: '18px', fontWeight: '700' }}>
          <Sliders size={20} color="#38bdf8" />
          <span>{t('updateBattery')}</span>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '13px',
            color: '#bae6fd',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <Info size={18} />
          <span>
            Note: Vehicle battery level is recorded manually or via system telemetry. No hardware tracking telemetry is simulated.
          </span>
        </div>

        <form onSubmit={handleUpdateBattery} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              Current Battery Level ({batteryInput}%)
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={batteryInput}
              onChange={(e) => {
                setBatteryInput(e.target.value);
                setRangeInput(Math.round((e.target.value / 100) * 210));
              }}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              Estimated Range (km)
            </label>
            <input
              type="number"
              min="10"
              max="500"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '700',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={updating}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>{updating ? 'Saving...' : 'Update Status'}</span>
          </button>
        </form>
      </div>

      {/* Charging Station Network Directory */}
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: '700' }}>
              {t('chargingStations')}
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
              Fast DC and AC Charging Plazas on Route (External Google Maps Navigation)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {evData?.chargingStations?.map((station, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ marginTop: '3px' }}>
                  <Zap size={20} color="#38bdf8" />
                </div>
                <div>
                  <div style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: '700' }}>
                    {station.name}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '2px' }}>
                    {station.location}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {station.plugTypes?.map((plug, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: '#1e293b',
                          color: '#38bdf8',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #334155'
                        }}
                      >
                        {plug}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <a
                href={station.navigationUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                <Navigation size={15} />
                <span>Navigate</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EVHub;
