import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { CreditCard, IndianRupee, ArrowUpRight, Search, Receipt } from 'lucide-react';

const PaymentManagement = () => {
  const [data, setData] = useState({ summary: {}, data: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await adminService.getPayments();
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading payment records...</div>;
  }

  const { summary, data: payments } = data;

  const filteredPayments = payments.filter(p => {
    return (
      p.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.transactionReference.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Payment & Transaction Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Audited financial transactions, driver payout splits, and direct refund records.
          </p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="stats-grid">
        <StatCard
          title="Total Gross Revenue"
          value={`₹${(summary?.totalRevenue || 0).toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="#10b981"
        />
        <StatCard
          title="Total Driver Payouts"
          value={`₹${(summary?.totalDriverPayouts || 0).toLocaleString('en-IN')}`}
          icon={CreditCard}
          color="#1d4ed8"
        />
        <StatCard
          title="Total Transactions"
          value={summary?.totalTransactions || 0}
          icon={Receipt}
          color="#f59e0b"
        />
      </div>

      {/* Search Bar */}
      <div className="content-card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by transaction reference, Booking ID, or customer name..."
            className="form-control"
            style={{ border: 'none', backgroundColor: '#f8fafc' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Transaction Reference</th>
                <th>Customer</th>
                <th>Booking Amount</th>
                <th>Driver Payout</th>
                <th>Payment Status</th>
                <th>Refund Records</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{p.bookingId}</td>
                    <td>
                      <code>{p.transactionReference}</code>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{p.customer?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.customer?.phone}</div>
                    </td>
                    <td style={{ fontWeight: '700' }}>₹{p.bookingAmount}</td>
                    <td style={{ fontWeight: '700', color: '#10b981' }}>₹{p.driverPayment}</td>
                    <td>
                      <StatusBadge status={p.paymentStatus} />
                    </td>
                    <td>
                      {p.refundStatus !== 'None' ? (
                        <div style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                          Refunded: ₹{p.refundAmount} ({p.refundStatus})
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No payment records found.
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

export default PaymentManagement;
