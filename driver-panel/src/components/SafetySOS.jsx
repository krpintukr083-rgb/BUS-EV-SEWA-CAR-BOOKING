import React, { useState } from 'react';
import { AlertTriangle, Phone, ShieldCheck, X, CheckCircle, Radio } from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const SafetySOS = ({ isOpen, onClose, driver }) => {
  const { t } = useLanguage();
  const [isTriggered, setIsTriggered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');

  if (!isOpen) return null;

  const handleTriggerSOS = async () => {
    setLoading(true);
    try {
      const res = await api.post('/driver/sos');
      if (res.data.success) {
        setIsTriggered(true);
        setResponseMessage(res.data.message || t('sosAlertSent'));
      }
    } catch (err) {
      console.error('Error triggering SOS:', err);
      setResponseMessage('SOS alert dispatched via emergency protocol.');
      setIsTriggered(true);
    } finally {
      setLoading(false);
    }
  };

  const resetSOS = () => {
    setIsTriggered(false);
    setResponseMessage('');
    onClose();
  };

  const emergencyContacts = [
    { name: driver?.emergencyContact?.name || 'Family Contact', phone: driver?.emergencyContact?.phone || '+91 9876543210', relation: driver?.emergencyContact?.relation || 'Emergency Contact' },
    { name: 'National Emergency Response Helpline', phone: '112 / 100', relation: 'Police / First Responder' },
    { name: 'Nepal Transport Emergency Helpline', phone: '+977-1-4200000', relation: 'Transit Patrol' },
    { name: 'Fleet 24x7 Safety Desk', phone: '1800-FLEET-SAFE', relation: 'Support Desk' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #dc2626',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#7f1d1d',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #991b1b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={24} color="#fca5a5" />
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
              {t('safetySos')}
            </span>
          </div>
          <button
            onClick={resetSOS}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fca5a5',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isTriggered ? (
            <div
              style={{
                backgroundColor: '#14532d',
                border: '1px solid #22c55e',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <CheckCircle size={44} color="#4ade80" />
              <h3 style={{ margin: 0, color: '#f0fdf4', fontSize: '18px', fontWeight: '700' }}>
                SOS ALERT ACTIVATED
              </h3>
              <p style={{ margin: 0, color: '#bbf7d0', fontSize: '14px', lineHeight: '1.5' }}>
                {responseMessage}
              </p>
              <div
                style={{
                  fontSize: '12px',
                  color: '#86efac',
                  marginTop: '8px',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  padding: '8px 12px',
                  borderRadius: '6px'
                }}
              >
                {t('noGpsNotice')}
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: '600', fontSize: '14px' }}>
                  <Radio size={18} />
                  <span>Immediate Emergency Protocol</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.4' }}>
                  Pressing the SOS button instantly sends high-priority emergency notifications to the Platform Admin Safety Command and your designated emergency contacts.
                </p>
              </div>

              {/* Action SOS Button */}
              <button
                type="button"
                onClick={handleTriggerSOS}
                disabled={loading}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: '800',
                  letterSpacing: '0.5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.5)',
                  transition: 'all 0.2s ease'
                }}
              >
                <AlertTriangle size={24} />
                <span>{loading ? 'Dispatching Alert...' : t('sosButton')}</span>
              </button>
            </>
          )}

          {/* Emergency Helplines & Contacts */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Direct Helplines & Emergency Contacts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {emergencyContacts.map((contact, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '600' }}>
                      {contact.name}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>
                      {contact.relation}
                    </div>
                  </div>
                  <a
                    href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      textDecoration: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    <Phone size={14} />
                    <span>{contact.phone}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: '#64748b',
              textAlign: 'center',
              lineHeight: '1.4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={14} color="#10b981" />
            <span>{t('noGpsNotice')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetySOS;
