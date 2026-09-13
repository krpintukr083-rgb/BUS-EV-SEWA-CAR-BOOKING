import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { XOctagon, Check, AlertCircle, RefreshCw } from 'lucide-react';

const CancellationManagement = () => {
  const [cancellations, setCancellations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState('');

  const fetchCancellations = async () => {
    try {
      const res = await adminService.getCancellations();
      if (res.success) {
        setCancellations(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancellations();
  }, []);

  const handleProcessRefund = async id => {
    setActionLoading(id);
    setMessage('');
    try {
      const res = await adminService.processCancellationRefund(id);
      if (res.success) {
        setMessage('Cancellation refund processed successfully!');
        await fetchCancellations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading cancellation records...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Cancellation & Refund Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Audit passenger trip cancellations, verify cancellation reasons, and release source payment refunds.
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

      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Trip Amount</th>
                <th>Cancellation Status</th>
                <th>Reason for Cancellation</th>
                <th>Refund Amount</th>
                <th>Refund Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cancellations.length > 0 ? (
                cancellations.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{c.bookingId}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{c.customer?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.customer?.phone}</div>
                    </td>
                    <td style={{ fontWeight: '600' }}>₹{c.bookingAmount}</td>
                    <td>
                      <StatusBadge status={c.cancellationStatus} />
                    </td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '280px', color: '#475569' }}>
                      {c.cancellationReason}
                    </td>
                    <td style={{ fontWeight: '700', color: '#dc2626' }}>₹{c.refundAmount}</td>
                    <td>
                      <StatusBadge status={c.refundStatus} />
                    </td>
                    <td>
                      {c.refundStatus === 'Pending' ? (
                        <button
                          onClick={() => handleProcessRefund(c._id)}
                          className="btn btn-sm btn-primary"
                          disabled={actionLoading === c._id}
                        >
                          <RefreshCw size={13} />
                          <span>{actionLoading === c._id ? 'Processing...' : 'Process Refund'}</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>
                          ✓ Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No cancellation records on file.
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

export default CancellationManagement;
