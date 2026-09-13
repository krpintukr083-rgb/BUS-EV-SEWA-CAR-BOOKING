import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Percent, Check, X, AlertTriangle, ShieldCheck } from 'lucide-react';

const CompensationManagement = () => {
  const [compensations, setCompensations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState('');

  const fetchCompensations = async () => {
    try {
      const res = await adminService.getCompensations();
      if (res.success) {
        setCompensations(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompensations();
  }, []);

  const handleUpdate = async (id, approvalStatus, refundStatus) => {
    setActionLoading(id);
    setMessage('');
    try {
      const res = await adminService.updateCompensationStatus(id, {
        approvalStatus,
        refundStatus,
        paymentReference: `CMP-3PCT-${Date.now().toString().slice(-4)}`
      });
      if (res.success) {
        setMessage('3% Technical Glitch Compensation record updated successfully!');
        await fetchCompensations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading 3% service compensation records...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
            3% Customer Service Compensation Management
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Applies exclusively when there is a verified platform/service-side technical glitch per official policy.
          </p>
        </div>
      </div>

      {/* Policy Clarification Box */}
      <div className="disclaimer-box" style={{ backgroundColor: '#faf5ff', borderColor: '#e9d5ff', color: '#581c87' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '4px' }}>
          <Percent size={18} />
          <span>Platform Policy Notice: 3% Service Compensation (Not Commission)</span>
        </div>
        <div>
          This 3% compensation is <strong>NOT platform/admin commission</strong>. It represents mandatory service goodwill compensation issued directly to passengers when automated platform errors (e.g. server auto-allocation timeout or payment gateway dispatch sync delays) affect booking fulfillment. (e.g. Booking ₹1,000 → 3% Compensation = ₹30).
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

      {/* Compensations Table */}
      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Trip Amount</th>
                <th>Verified Glitch / Technical Issue Reason</th>
                <th>3% Compensation Amount</th>
                <th>Approval Status</th>
                <th>Refund / Payout Status</th>
                <th>Payment Reference</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {compensations.length > 0 ? (
                compensations.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{c.bookingId}</td>
                    <td>
                      <div style={{ fontWeight: '600' }}>{c.customer?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.customer?.phone}</div>
                    </td>
                    <td style={{ fontWeight: '600' }}>₹{c.bookingAmount}</td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '280px', color: '#475569' }}>
                      {c.issueReason}
                    </td>
                    <td style={{ fontWeight: '800', color: '#7c3aed', fontSize: '1rem' }}>
                      ₹{c.compensationAmount}
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', fontWeight: '500' }}>
                        (3% of ₹{c.bookingAmount})
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={c.approvalStatus} />
                    </td>
                    <td>
                      <StatusBadge status={c.refundStatus} />
                    </td>
                    <td>
                      <code style={{ fontSize: '0.775rem' }}>{c.paymentReference || 'Pending Ref'}</code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {c.approvalStatus === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleUpdate(c._id, 'Approved', 'Pending')}
                              className="btn btn-sm btn-success"
                              disabled={actionLoading === c._id}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdate(c._id, 'Rejected', 'Pending')}
                              className="btn btn-sm btn-danger"
                              disabled={actionLoading === c._id}
                            >
                              <X size={13} /> Reject
                            </button>
                          </>
                        )}
                        {c.approvalStatus === 'Approved' && c.refundStatus === 'Pending' && (
                          <button
                            onClick={() => handleUpdate(c._id, 'Approved', 'Processed')}
                            className="btn btn-sm btn-primary"
                            disabled={actionLoading === c._id}
                          >
                            Mark Paid
                          </button>
                        )}
                        {c.approvalStatus === 'Approved' && c.refundStatus === 'Processed' && (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '700' }}>
                            ✓ Disbursed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No 3% technical glitch compensation claims on file.
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

export default CompensationManagement;
