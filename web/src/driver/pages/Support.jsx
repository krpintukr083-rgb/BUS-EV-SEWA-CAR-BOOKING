import React, { useState, useEffect } from 'react';
import { driverService } from '../../services/driverService';
import { LifeBuoy, Phone, Mail, Clock, HelpCircle, Shield, AlertCircle } from 'lucide-react';

const Support = () => {
  const [supportData, setSupportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupport = async () => {
      try {
        const res = await driverService.getSupport();
        if (res.success) {
          setSupportData(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupport();
  }, []);

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading support desk information...</div>;
  }

  const { supportHelpline, supportEmail, driverAssistanceDesk, emergencyAssistance, helpTopics } =
    supportData || {};

  return (
    <div style={{ maxWidth: '880px' }}>
      <div className="card-header-flex" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Driver Help & Support Desk</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Official platform contacts and assistance guidelines for active fleet drivers.
          </p>
        </div>
      </div>

      {/* Contact Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="content-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Phone size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Toll-Free Helpline</div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>{supportHelpline}</div>
            </div>
          </div>
          <p style={{ fontSize: '0.825rem', color: '#64748b' }}>{driverAssistanceDesk}</p>
        </div>

        <div className="content-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Mail size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Support Email</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>{supportEmail}</div>
            </div>
          </div>
          <p style={{ fontSize: '0.825rem', color: '#64748b' }}>Guaranteed response within 2-4 working hours</p>
        </div>

        <div className="content-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertCircle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Emergency SOS Desk</div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: '#dc2626' }}>{emergencyAssistance}</div>
            </div>
          </div>
          <p style={{ fontSize: '0.825rem', color: '#64748b' }}>Immediate highway safety & accident escalation</p>
        </div>
      </div>

      {/* Help Topics & Standard Operating Procedures */}
      <div className="content-card">
        <div className="card-header-flex">
          <h3 className="card-title">Driver Assistance Guidelines & FAQs</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {helpTopics &&
            helpTopics.map((topic, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <HelpCircle size={18} color="#1d4ed8" />
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{topic.title}</strong>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.5' }}>
                  {topic.description}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Support;
