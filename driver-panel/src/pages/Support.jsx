import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import {
  LifeBuoy,
  Phone,
  Mail,
  HelpCircle,
  Shield,
  AlertCircle,
  CheckCircle,
  PlusCircle,
  MessageSquare,
  RefreshCw
} from 'lucide-react';

const Support = () => {
  const { t } = useLanguage();
  const [supportData, setSupportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [category, setCategory] = useState('Payment Issue');
  const [supportIssue, setSupportIssue] = useState('');
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSupport = async () => {
    try {
      setLoading(true);
      const res = await api.get('/driver/support');
      if (res.data.success) {
        setSupportData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error loading support desk information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupport();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!supportIssue.trim()) {
      setErrorMsg('Issue description is required.');
      return;
    }

    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.post('/driver/support/ticket', {
        category,
        supportIssue,
        bookingId: bookingIdInput
      });

      if (res.data.success) {
        setSuccessMsg(`Support ticket #${res.data.data.ticketId} created successfully.`);
        setSupportIssue('');
        setBookingIdInput('');
        setIsTicketModalOpen(false);
        fetchSupport();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error submitting support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        {t('loading')}
      </div>
    );
  }

  const { helpline, email, faqList, tickets } = supportData || {};

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '24px', fontWeight: '800' }}>
            {t('support')}
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Official platform contacts, 24x7 driver assistance, and dispute resolution tickets.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsTicketModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '14px'
            }}
          >
            <PlusCircle size={16} />
            <span>Create Support Ticket</span>
          </button>
        </div>
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

      {/* Contact Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={20} color="#5eead4" />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}>24x7 Driver Helpline</div>
              <div style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: '700' }}>{helpline || '1800-PLATFORM'}</div>
            </div>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Direct priority telephonic assistance for active trips and on-road support.
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={20} color="#93c5fd" />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}>Support Email</div>
              <div style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: '700' }}>{email || 'driver-support@platform.com'}</div>
            </div>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Guaranteed response within 2-4 working hours for document and payout queries.
          </p>
        </div>
      </div>

      {/* Driver Logged Tickets */}
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
        <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: '700' }}>
          My Support Tickets
        </h2>

        {tickets && tickets.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tickets.map((tkt) => (
              <div
                key={tkt._id}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '14px' }}>
                      #{tkt.ticketId}
                    </span>
                    <span style={{ backgroundColor: '#1e293b', color: '#94a3b8', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                      {tkt.category || 'General'}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0', color: '#f1f5f9', fontSize: '14px' }}>
                    {tkt.supportIssue}
                  </p>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>
                    Booking Ref: {tkt.bookingId || 'N/A'} • Created: {new Date(tkt.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <span
                  style={{
                    backgroundColor: tkt.status === 'Resolved' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                    color: tkt.status === 'Resolved' ? '#34d399' : '#fbbf24',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                >
                  {tkt.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
            No active support tickets. Use the button above to log a complaint or query.
          </div>
        )}
      </div>

      {/* Frequently Asked Questions */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle size={20} color="#38bdf8" />
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: '700' }}>
            Frequently Asked Questions (FAQ)
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqList?.map((faq, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '14px 18px'
              }}
            >
              <div style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '14px' }}>
                {faq.q}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px', lineHeight: '1.4' }}>
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Creation Modal */}
      {isTicketModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>
              Create Support Ticket
            </h3>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Payment Issue">Payment Issue / Fare Discrepancy</option>
                  <option value="Customer Issue">Customer Misconduct / Issue</option>
                  <option value="Vehicle Issue">Vehicle Breakdown / Issue</option>
                  <option value="KYC/Account">KYC & Document Verification</option>
                  <option value="Other">Other Query</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>
                  Booking / Trip ID (Optional)
                </label>
                <input
                  type="text"
                  value={bookingIdInput}
                  onChange={(e) => setBookingIdInput(e.target.value)}
                  placeholder="e.g. BK-12345"
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>
                  Describe the Issue in Detail
                </label>
                <textarea
                  value={supportIssue}
                  onChange={(e) => setSupportIssue(e.target.value)}
                  placeholder="Explain what happened..."
                  rows={4}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  style={{
                    backgroundColor: '#334155',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
