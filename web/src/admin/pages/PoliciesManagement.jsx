import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { FileText, Save, Check, AlertCircle } from 'lucide-react';

const PoliciesManagement = () => {
  const [policies, setPolicies] = useState([]);
  const [selectedType, setSelectedType] = useState('terms_and_conditions');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchPolicies = async () => {
    try {
      const res = await adminService.getPolicies();
      if (res.success) {
        setPolicies(res.data);
        const cur = res.data.find(p => p.policyType === selectedType);
        if (cur) {
          setTitle(cur.title);
          setContent(cur.content);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSelectPolicy = type => {
    setSelectedType(type);
    const cur = policies.find(p => p.policyType === type);
    if (cur) {
      setTitle(cur.title);
      setContent(cur.content);
    } else {
      setTitle('');
      setContent('');
    }
    setMessage('');
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await adminService.updatePolicy(selectedType, { title, content });
      if (res.success) {
        setMessage('Policy terms updated successfully!');
        await fetchPolicies();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading policies...</div>;
  }

  const policyTypesList = [
    { type: 'terms_and_conditions', name: 'Platform Terms & Conditions' },
    { type: 'privacy_policy', name: 'Privacy Policy & Data Protection' },
    { type: 'customer_terms', name: 'Customer Terms of Service' },
    { type: 'driver_terms', name: 'Driver Code of Conduct & Vehicle Standards' },
    { type: 'cancellation_policy', name: 'Booking Cancellation Policy' },
    { type: 'refund_policy', name: 'Payment Refund Policy' },
    { type: 'compensation_policy', name: '3% Platform Glitch Compensation Policy' },
    { type: 'accident_insurance_terms', name: 'Accident Insurance Terms' },
    { type: 'insurance_disclaimer', name: 'Insurance Disclaimer Notice' }
  ];

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Terms & Policies Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Maintain platform terms, driver & customer policies, cancellation rules, and statutory disclaimers.
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

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
        {/* Policy Selector */}
        <div className="content-card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '12px' }}>Policy Documents</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {policyTypesList.map(item => {
              const isSelected = selectedType === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => handleSelectPolicy(item.type)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#1d4ed8' : 'transparent',
                    color: isSelected ? '#ffffff' : '#475569',
                    fontWeight: isSelected ? '700' : '500',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Policy Editor */}
        <div className="content-card">
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Policy Title</label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Policy Legal Text & Terms</label>
              <textarea
                className="form-control"
                rows="14"
                value={content}
                onChange={e => setContent(e.target.value)}
                required
                style={{ fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.6' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} /> {saving ? 'Updating Policy...' : 'Save & Publish Policy Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PoliciesManagement;
