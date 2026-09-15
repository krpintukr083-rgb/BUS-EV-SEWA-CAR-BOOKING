import React, { useState, useEffect } from 'react';
import { driverService } from '../../services/driverService';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import { IndianRupee, CreditCard, Receipt, Calendar } from 'lucide-react';

const EarningsRecords = () => {
  const [payments, setPayments] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await driverService.getEarnings();
        if (res.success) {
          setPayments(res.data);
          setTotalEarnings(res.totalEarnings || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, []);

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading payment records...</div>;
  }

  return (
    <div>
      {/* Overview Stat Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Driver Payouts"
          value={`₹${totalEarnings.toLocaleString('en-IN')}`}
          icon={IndianRupee}
          color="#10b981"
        />
        <StatCard
          title="Settled Transactions"
          value={payments.length}
          icon={Receipt}
          color="#1d4ed8"
        />
        <StatCard
          title="Average per Trip"
          value={
            payments.length > 0
              ? `₹${Math.round(totalEarnings / payments.length).toLocaleString('en-IN')}`
              : '₹0'
          }
          icon={CreditCard}
          color="#f59e0b"
        />
      </div>

      {/* Financial Records Table */}
      <div className="content-card">
        <div className="card-header-flex">
          <div>
            <h3 className="card-title">Driver Earnings & Payment Records</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
              Direct trip payment settlements and official transaction references.
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Date</th>
                <th>Gross Fare</th>
                <th>Driver Earnings</th>
                <th>Payment Status</th>
                <th>Transaction Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? (
                payments.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{p.bookingId}</td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td style={{ color: '#64748b' }}>₹{p.bookingAmount}</td>
                    <td style={{ fontWeight: '700', color: '#10b981', fontSize: '0.95rem' }}>
                      ₹{p.driverPayment}
                    </td>
                    <td>
                      <StatusBadge status={p.paymentStatus} />
                    </td>
                    <td>
                      <code
                        style={{
                          backgroundColor: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          color: '#334155'
                        }}
                      >
                        {p.transactionReference}
                      </code>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No payment records logged yet.
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

export default EarningsRecords;
