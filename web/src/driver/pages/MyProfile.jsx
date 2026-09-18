import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { User, Phone, Truck, Check, AlertCircle, MapPin, Shield, Globe, CreditCard } from 'lucide-react';

const MyProfile = () => {
  const { user, refreshUser } = useAuth();
  const { lang, changeLanguage, t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState({ name: '', phone: '', relation: 'Family' });
  const [payoutMethods, setPayoutMethods] = useState({ bankName: '', accountNumber: '', accountHolderName: '', esewaId: '', khaltiId: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/driver/profile');
        if (res.data.success) {
          const d = res.data.data;
          setProfile(d);
          setName(d.name || '');
          setMobileNumber(d.mobileNumber || '');
          setProfilePhoto(d.profilePhoto || '');
          setAddress(d.address || '');
          if (d.emergencyContact) setEmergencyContact(d.emergencyContact);
          if (d.payoutMethods) setPayoutMethods(d.payoutMethods);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdate = async e => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await api.put('/driver/profile', {
        name,
        mobileNumber,
        profilePhoto,
        address,
        emergencyContact,
        payoutMethods,
        language: lang
      });
      if (res.data.success) {
        setMessage('Profile updated successfully!');
        if (refreshUser) await refreshUser();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>{t('loading')}</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {message && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="content-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', flexWrap: 'wrap' }}>
          <img
            src={profilePhoto || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'}
            alt="Driver Profile"
            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563eb' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                {name || 'Driver'}
              </h2>
              <StatusBadge status={profile?.driverStatus || 'Active'} />
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0' }}>
              Email: {profile?.user?.email || 'N/A'} • Rating: {profile?.rating || 4.8} ★
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Mobile Number
              </label>
              <input
                type="text"
                value={mobileNumber}
                onChange={e => setMobileNumber(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Profile Photo URL
            </label>
            <input
              type="url"
              value={profilePhoto}
              onChange={e => setProfilePhoto(e.target.value)}
              placeholder="https://..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Residential / Official Address
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. Ward No. 4, Thamel, Kathmandu / Sector 15, Noida"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          {/* Emergency Contact */}
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} color="#ef4444" />
              <span>Emergency Contact Details</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <input
                type="text"
                value={emergencyContact.name}
                onChange={e => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                placeholder="Contact Name"
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <input
                type="text"
                value={emergencyContact.phone}
                onChange={e => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                placeholder="Contact Phone"
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <input
                type="text"
                value={emergencyContact.relation}
                onChange={e => setEmergencyContact({ ...emergencyContact, relation: e.target.value })}
                placeholder="Relation (e.g. Spouse/Family)"
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          {/* Language Preference */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Language Preference (भाषा)
            </label>
            <select
              value={lang}
              onChange={e => changeLanguage(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            >
              <option value="en">English (International)</option>
              <option value="ne">नेपाली (Nepali)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '15px',
              alignSelf: 'flex-start'
            }}
          >
            {saving ? 'Saving...' : t('save')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MyProfile;
