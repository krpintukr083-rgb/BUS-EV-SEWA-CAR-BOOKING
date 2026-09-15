import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import { Users, Search, Check, AlertCircle } from 'lucide-react';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState('');

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

  useEffect(() => {
    fetchCustomers();
  }, []);

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
            View passenger booking history, lifetime spends, and account status controls.
          </p>
        </div>
        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1d4ed8' }}>
          Total Customers: {customers.length}
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
