import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  Percent,
  Coins,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Info,
  Calendar,
  Zap,
  Bus,
  Car
} from 'lucide-react';

const PlatformChargeSettings = () => {
  const { isSuperAdmin } = useAdminAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Form State
  const [isEnabled, setIsEnabled] = useState(false);
  const [chargeType, setChargeType] = useState('PERCENTAGE'); // 'PERCENTAGE' | 'FIXED'
  const [percentageRate, setPercentageRate] = useState('10');
  const [fixedAmount, setFixedAmount] = useState('50');
  const [applyBus, setApplyBus] = useState(true);
  const [applyEvSewa, setApplyEvSewa] = useState(true);
  const [applyCar, setApplyCar] = useState(true);
  const [applyInstant, setApplyInstant] = useState(true);
  const [applyScheduled, setApplyScheduled] = useState(true);
  const [minCharge, setMinCharge] = useState('');
  const [maxCharge, setMaxCharge] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const res = await adminService.getPlatformChargeSettings();
      if (res.success && res.data) {
        const data = res.data;
        setSettings(data);
        setIsEnabled(Boolean(data.isEnabled));
        setChargeType(data.chargeType || 'PERCENTAGE');
        setPercentageRate(data.percentageRate !== undefined ? String(data.percentageRate) : '10');
        setFixedAmount(data.fixedAmount !== undefined ? String(data.fixedAmount) : '50');
        setApplyBus(data.applicableServices?.bus ?? true);
        setApplyEvSewa(data.applicableServices?.evSewa ?? true);
        setApplyCar(data.applicableServices?.car ?? true);
        setApplyInstant(data.applicableBookingModes?.instant ?? true);
        setApplyScheduled(data.applicableBookingModes?.scheduled ?? true);
        setMinCharge(data.minCharge !== null && data.minCharge !== undefined ? String(data.minCharge) : '');
        setMaxCharge(data.maxCharge !== null && data.maxCharge !== undefined ? String(data.maxCharge) : '');
      }
    } catch (err) {
      console.error('Error fetching platform charge settings:', err);
      setMessage({
        text: err.response?.data?.message || 'Failed to fetch platform charge settings.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!isSuperAdmin()) {
      setMessage({ text: 'Only authorized Super Admin can modify platform charge settings.', type: 'error' });
      return;
    }

    // Client-side validations
    if (chargeType === 'PERCENTAGE') {
      const p = parseFloat(percentageRate);
      if (isNaN(p) || p < 0 || p > 100) {
        setMessage({ text: 'Percentage rate must be a valid number between 0% and 100%.', type: 'error' });
        return;
      }
    } else {
      const f = parseFloat(fixedAmount);
      if (isNaN(f) || f < 0) {
        setMessage({ text: 'Fixed charge amount cannot be negative.', type: 'error' });
        return;
      }
    }

    if (minCharge !== '') {
      const min = parseFloat(minCharge);
      if (isNaN(min) || min < 0) {
        setMessage({ text: 'Minimum charge limit cannot be negative.', type: 'error' });
        return;
      }
    }

    if (maxCharge !== '') {
      const max = parseFloat(maxCharge);
      if (isNaN(max) || max < 0) {
        setMessage({ text: 'Maximum charge limit cannot be negative.', type: 'error' });
        return;
      }
    }

    if (minCharge !== '' && maxCharge !== '') {
      if (parseFloat(minCharge) > parseFloat(maxCharge)) {
        setMessage({ text: 'Minimum charge limit cannot exceed Maximum charge limit.', type: 'error' });
        return;
      }
    }

    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const payload = {
        isEnabled,
        chargeType,
        percentageRate: parseFloat(percentageRate),
        fixedAmount: parseFloat(fixedAmount),
        applicableServices: {
          bus: applyBus,
          evSewa: applyEvSewa,
          car: applyCar
        },
        applicableBookingModes: {
          instant: applyInstant,
          scheduled: applyScheduled
        },
        minCharge: minCharge !== '' ? parseFloat(minCharge) : null,
        maxCharge: maxCharge !== '' ? parseFloat(maxCharge) : null
      };

      const res = await adminService.updatePlatformChargeSettings(payload);
      if (res.success) {
        setSettings(res.data);
        setMessage({
          text: 'Platform charge settings updated successfully! New configuration will apply to new bookings only.',
          type: 'success'
        });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({
        text: err.response?.data?.message || 'Failed to update platform charge settings.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
        <p>Loading Platform Charge Configuration...</p>
      </div>
    );
  }

  // Calculate live preview with ₹1,000 example
  const previewGross = 1000;
  let previewCharge = 0;
  if (isEnabled) {
    if (chargeType === 'FIXED') {
      previewCharge = parseFloat(fixedAmount) || 0;
    } else {
      const p = parseFloat(percentageRate) || 0;
      previewCharge = (previewGross * p) / 100;
    }
    if (minCharge !== '' && !isNaN(parseFloat(minCharge))) {
      previewCharge = Math.max(previewCharge, parseFloat(minCharge));
    }
    if (maxCharge !== '' && !isNaN(parseFloat(maxCharge))) {
      previewCharge = Math.min(previewCharge, parseFloat(maxCharge));
    }
    previewCharge = Math.min(previewGross, Math.max(0, previewCharge));
  }
  const previewNet = previewGross - previewCharge;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div className="card-header-flex" style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Coins size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
                Earnings & Platform Charge Settings
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                Admin-controlled commission fee deducted from driver trip earnings. Historical bookings remain immutable.
              </p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchSettings}
            className="btn btn-outline"
            disabled={saving}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.9rem'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Version & Immutability Notice Card */}
      <div style={{
        padding: '14px 18px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={20} color="#059669" />
          <span style={{ fontSize: '0.88rem', color: '#334155' }}>
            <strong>Active Settings Version:</strong> v{settings?.version || 1} &nbsp;·&nbsp;
            <strong>Last Updated By:</strong> {settings?.lastUpdatedByName || 'Super Admin'}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Info size={14} /> Existing completed bookings preserve their snapshot charges.
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* Master Switch Card */}
        <div className="content-card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Platform Charge Status</h3>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  backgroundColor: isEnabled ? '#dcfce7' : '#fee2e2',
                  color: isEnabled ? '#15803d' : '#b91c1c'
                }}>
                  {isEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                When disabled, Platform Charge is ₹0 and driver receives 100% of the gross fare.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className={`btn ${isEnabled ? 'btn-outline' : 'btn-success'}`}
              style={{ minWidth: '150px' }}
            >
              {isEnabled ? 'Disable Platform Charge' : 'Enable Platform Charge'}
            </button>
          </div>
        </div>

        {/* Charge Calculation Mode & Rates */}
        <div className="content-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
            Charge Calculation Model
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {/* Percentage Option */}
            <div
              onClick={() => setChargeType('PERCENTAGE')}
              style={{
                border: `2px solid ${chargeType === 'PERCENTAGE' ? '#2563eb' : '#e2e8f0'}`,
                backgroundColor: chargeType === 'PERCENTAGE' ? '#eff6ff' : '#ffffff',
                borderRadius: '10px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Percent size={18} color={chargeType === 'PERCENTAGE' ? '#2563eb' : '#64748b'} />
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>Percentage Mode (%)</span>
                </div>
                <input
                  type="radio"
                  name="chargeType"
                  checked={chargeType === 'PERCENTAGE'}
                  onChange={() => setChargeType('PERCENTAGE')}
                />
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Charge is calculated as a configurable percentage of the booking gross fare.
              </p>
            </div>

            {/* Fixed Amount Option */}
            <div
              onClick={() => setChargeType('FIXED')}
              style={{
                border: `2px solid ${chargeType === 'FIXED' ? '#2563eb' : '#e2e8f0'}`,
                backgroundColor: chargeType === 'FIXED' ? '#eff6ff' : '#ffffff',
                borderRadius: '10px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Coins size={18} color={chargeType === 'FIXED' ? '#2563eb' : '#64748b'} />
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>Fixed Amount (₹)</span>
                </div>
                <input
                  type="radio"
                  name="chargeType"
                  checked={chargeType === 'FIXED'}
                  onChange={() => setChargeType('FIXED')}
                />
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Fixed fee per completed booking, regardless of trip fare magnitude.
              </p>
            </div>
          </div>

          {/* Rate or Amount Input Field */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {chargeType === 'PERCENTAGE' ? (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600' }}>
                  Platform Percentage Rate (%) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="form-control"
                    value={percentageRate}
                    onChange={(e) => setPercentageRate(e.target.value)}
                    placeholder="e.g. 10"
                    required
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: '600' }}>
                    %
                  </span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Must be between 0% and 100% (e.g., 10% = ₹100 platform fee on ₹1,000 fare).
                </span>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600' }}>
                  Fixed Charge Per Completed Booking (₹) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    placeholder="e.g. 50"
                    required
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: '600' }}>
                    ₹
                  </span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Flat fee deducted from every completed eligible ride.
                </span>
              </div>
            )}

            {/* Optional Min / Max Clamp Limits */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600' }}>
                Minimum Charge Limit (₹) <span style={{ color: '#64748b', fontWeight: '400' }}>(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="form-control"
                value={minCharge}
                onChange={(e) => setMinCharge(e.target.value)}
                placeholder="Leave blank for no minimum floor"
              />
              <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Floor limit. Charge will not fall below this amount.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600' }}>
                Maximum Charge Cap (₹) <span style={{ color: '#64748b', fontWeight: '400' }}>(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="form-control"
                value={maxCharge}
                onChange={(e) => setMaxCharge(e.target.value)}
                placeholder="Leave blank for no upper cap"
              />
              <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Ceiling limit. Charge will never exceed this maximum amount.
              </span>
            </div>
          </div>
        </div>

        {/* Applicability Toggles */}
        <div className="content-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
            Service & Booking Mode Applicability
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Services */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>
                Apply Charge to Services:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={applyBus}
                    onChange={(e) => setApplyBus(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <Bus size={18} color="#2563eb" />
                  <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>Bus Service</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={applyEvSewa}
                    onChange={(e) => setApplyEvSewa(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <Zap size={18} color="#16a34a" />
                  <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>EV-Sewa Green Mobility</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={applyCar}
                    onChange={(e) => setApplyCar(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <Car size={18} color="#6366f1" />
                  <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>Car / Cab Service</span>
                </label>
              </div>
            </div>

            {/* Booking Modes */}
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>
                Apply Charge to Booking Modes:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={applyInstant}
                    onChange={(e) => setApplyInstant(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <Zap size={18} color="#ea580c" />
                  <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>Instant Bookings (Direct Dispatch)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={applyScheduled}
                    onChange={(e) => setApplyScheduled(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <Calendar size={18} color="#0284c7" />
                  <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>Scheduled / Normal Bookings</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Live Calculation Example Preview */}
        <div style={{
          padding: '18px',
          backgroundColor: '#fafafa',
          borderRadius: '10px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
            Live Calculation Example Preview (Gross Fare: ₹{previewGross.toLocaleString()})
          </h4>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Gross Fare:</span>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>₹{previewGross}</div>
            </div>
            <div style={{ fontSize: '1.2rem', color: '#9ca3af' }}>−</div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Platform Charge:</span>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: isEnabled ? '#ea580c' : '#10b981' }}>
                ₹{previewCharge.toFixed(2)} {!isEnabled && '(Disabled: ₹0)'}
              </div>
            </div>
            <div style={{ fontSize: '1.2rem', color: '#9ca3af' }}>=</div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Net Driver Earning:</span>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#059669' }}>
                ₹{previewNet.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Save Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={fetchSettings}
            className="btn btn-outline"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ minWidth: '160px' }}
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={16} /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PlatformChargeSettings;
