import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import { Users, Search, Check, AlertCircle, Tag, Percent, Save, Sparkles } from 'lucide-react';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState('');

  // Bus Offer State
  const [offerStatus, setOfferStatus] = useState('active');
  const [discountPercentage, setDiscountPercentage] = useState(15);
  const [offerTitle, setOfferTitle] = useState('Intercity Luxury Bus Travel');
  const [offerSubtitle, setOfferSubtitle] = useState('AC Sleeper & Seater coaches with live tracking and instant seat selection.');
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerMsg, setOfferMsg] = useState({ type: '', text: '' });

  const fetchCustomers = async () => {
    try {
      const res = await adminService.getCustomers();
      if (res.success) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusOffer = async () => {
    try {
      const res = await adminService.getBusOffer();
      if (res && res.success && res.data) {
        setOfferStatus(res.data.offerStatus || 'active');
        setDiscountPercentage(res.data.discountPercentage !== undefined ? res.data.discountPercentage : 15);
        setOfferTitle(res.data.offerTitle || 'Intercity Luxury Bus Travel');
        setOfferSubtitle(res.data.offerSubtitle || 'AC Sleeper & Seater coaches with live tracking and instant seat selection.');
      }
    } catch (err) {
      console.error('Error loading bus offer settings:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchBusOffer();
  }, []);

  const handleSaveBusOffer = async (e) => {
    e.preventDefault();
    setOfferSaving(true);
    setOfferMsg({ type: '', text: '' });

    const numPct = Number(discountPercentage);
    if (isNaN(numPct) || numPct < 0 || numPct > 100) {
      setOfferMsg({ type: 'error', text: 'Discount percentage must be a numeric value between 0 and 100.' });
      setOfferSaving(false);
      return;
    }

    try {
      const res = await adminService.updateBusOffer({
        offerStatus,
        discountPercentage: numPct,
        offerTitle,
        offerSubtitle
      });

      if (res && res.success) {
        setOfferMsg({ type: 'success', text: 'Bus Discount Offer updated successfully! Customer App will reflect changes immediately.' });
        if (res.data) {
          setOfferStatus(res.data.offerStatus);
          setDiscountPercentage(res.data.discountPercentage);
          setOfferTitle(res.data.offerTitle);
          setOfferSubtitle(res.data.offerSubtitle);
        }
      } else {
        setOfferMsg({ type: 'error', text: res?.message || 'Failed to update bus offer.' });
      }
    } catch (err) {
      console.error('Save bus offer error:', err);
      setOfferMsg({ type: 'error', text: err.response?.data?.message || err.message || 'Error updating bus offer.' });
    } finally {
      setOfferSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setActionLoading(id);
    setMessage('');
    try {
      const res = await adminService.updateCustomerStatus(id, newStatus);
      if (res.success) {
        setMessage(`Customer status updated to ${newStatus}`);
        await fetchCustomers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading customer accounts...</div>;
  }

  const filteredCustomers = customers.filter(c => {
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobileNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Customer Accounts Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            View passenger booking history, lifetime spends, account controls, and manage promotional Bus Discounts.
          </p>
        </div>
        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1d4ed8' }}>
          Total Customers: {customers.length}
        </div>
      </div>

      {/* BUS DISCOUNT / OFFER CONTROL CARD */}
      <div
        className="content-card"
        style={{
          padding: '20px',
          marginBottom: '24px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                BUS DISCOUNT / OFFER CONTROL
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Configure dynamic percentage discount for Bus bookings. Applied strictly by backend server.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '700',
              backgroundColor: offerStatus === 'active' ? '#ecfdf5' : '#f1f5f9',
              color: offerStatus === 'active' ? '#059669' : '#64748b',
              border: `1px solid ${offerStatus === 'active' ? '#a7f3d0' : '#cbd5e1'}`
            }}
          >
            {offerStatus === 'active' ? `Flat ${discountPercentage}% OFF (Active Banner)` : 'Offer Inactive'}
          </div>
        </div>

        {offerMsg.text && (
          <div
            style={{
              backgroundColor: offerMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${offerMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              color: offerMsg.type === 'success' ? '#059669' : '#dc2626',
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {offerMsg.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{offerMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveBusOffer}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Discount Status
              </label>
              <select
                className="form-control"
                value={offerStatus}
                onChange={(e) => setOfferStatus(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="active">Active (Show Banner & Apply Discount)</option>
                <option value="inactive">Inactive (Hide Banner & No Discount)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Discount Percentage (%)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  className="form-control"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  placeholder="15"
                  style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  required
                />
                <Percent size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Offer Title
              </label>
              <input
                type="text"
                className="form-control"
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                placeholder="Intercity Luxury Bus Travel"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Offer Subtitle
            </label>
            <input
              type="text"
              className="form-control"
              value={offerSubtitle}
              onChange={(e) => setOfferSubtitle(e.target.value)}
              placeholder="AC Sleeper & Seater coaches with live tracking and instant seat selection."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>
              Discount Label Preview:{' '}
              <span style={{ color: '#1d4ed8', fontWeight: '800' }}>
                {offerStatus === 'active' ? `Flat ${discountPercentage}% OFF` : 'Offer Inactive'}
              </span>
            </div>

            <button
              type="submit"
              disabled={offerSaving}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                cursor: offerSaving ? 'not-allowed' : 'pointer'
              }}
            >
              <Save size={16} />
              <span>{offerSaving ? 'Saving Changes...' : 'Save Offer Settings'}</span>
            </button>
          </div>
        </form>
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

      {/* Search Filter */}
      <div className="content-card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by customer name, mobile number, or email address..."
            className="form-control"
            style={{ border: 'none', backgroundColor: '#f8fafc' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Email Address</th>
                <th>Booking Records</th>
                <th>Total Spent</th>
                <th>Account Status</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: '600', color: '#0f172a' }}>{c.name}</td>
                    <td style={{ color: '#475569' }}>{c.mobileNumber}</td>
                    <td style={{ color: '#475569' }}>{c.email}</td>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>
                      {c.bookingRecordsCount} Trips
                    </td>
                    <td style={{ fontWeight: '700' }}>₹{c.totalSpent.toLocaleString('en-IN')}</td>
                    <td>
                      <StatusBadge status={c.accountStatus} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {c.accountStatus !== 'Active' && (
                          <button
                            onClick={() => handleStatusChange(c.id, 'Active')}
                            className="btn btn-sm btn-outline"
                            style={{ color: '#10b981', borderColor: '#a7f3d0' }}
                            disabled={actionLoading === c.id}
                          >
                            Activate
                          </button>
                        )}
                        {c.accountStatus !== 'Inactive' && (
                          <button
                            onClick={() => handleStatusChange(c.id, 'Inactive')}
                            className="btn btn-sm btn-outline"
                            style={{ color: '#f59e0b', borderColor: '#fde68a' }}
                            disabled={actionLoading === c.id}
                          >
                            Deactivate
                          </button>
                        )}
                        {c.accountStatus !== 'Blocked' && (
                          <button
                            onClick={() => handleStatusChange(c.id, 'Blocked')}
                            className="btn btn-sm btn-outline"
                            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                            disabled={actionLoading === c.id}
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No customer records matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;
