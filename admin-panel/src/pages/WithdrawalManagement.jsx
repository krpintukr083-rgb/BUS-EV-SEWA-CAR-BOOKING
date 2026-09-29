import React, { useEffect, useState } from 'react';
import { Check, RefreshCw, X } from 'lucide-react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';

const WithdrawalManagement = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [paymentConfirmation, setPaymentConfirmation] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchWithdrawals = async () => {
    try {
      setError('');
      const response = await adminService.getWithdrawals();
      if (response.success) setWithdrawals(response.data || []);
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || 'Unable to load withdrawal requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const approve = async id => {
    setActionLoading(id);
    setError('');
    setMessage('');
    try {
      const response = await adminService.approveWithdrawal(id);
      if (response.success) {
        setMessage('Withdrawal approved and marked for processing.');
        await fetchWithdrawals();
      }
    } catch (actionError) {
      setError(actionError.response?.data?.message || 'Unable to approve withdrawal.');
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async id => {
    const reason = window.prompt('Enter a reason for rejecting this withdrawal:')?.trim();
    if (!reason) return;
    setActionLoading(id);
    setError('');
    setMessage('');
    try {
      const response = await adminService.rejectWithdrawal(id, reason);
      if (response.success) {
        setMessage('Withdrawal rejected and amount returned to the driver wallet.');
        await fetchWithdrawals();
      }
    } catch (actionError) {
      setError(actionError.response?.data?.message || 'Unable to reject withdrawal.');
    } finally {
      setActionLoading(null);
    }
  };

  const markPaymentDone = async () => {
    if (!paymentConfirmation) return;
    const { _id } = paymentConfirmation;
    setActionLoading(_id);
    setError('');
    setMessage('');
    try {
      const response = await adminService.completeWithdrawalPayment(_id);
      if (response.success) {
        setMessage('Withdrawal payment marked as done.');
        setPaymentConfirmation(null);
        await fetchWithdrawals();
      }
    } catch (actionError) {
      setError(actionError.response?.data?.message || 'Unable to mark withdrawal payment as done.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusLabel = status => ['completed', 'successful', 'succeeded', 'paid'].includes(String(status || '').toLowerCase())
    ? 'Payment Done'
    : status;

  if (loading) return <div style={{ padding: '24px', color: '#64748b' }}>Loading withdrawal requests...</div>;

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Driver Withdrawal Requests</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Review pending requests. Approval moves a request to Processing; rejection returns the reserved amount to the driver wallet.
          </p>
        </div>
        <button className="btn btn-sm btn-outline" onClick={fetchWithdrawals}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {message && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', padding: '10px 14px', borderRadius: 6, marginBottom: 16 }}>
          <Check size={15} style={{ verticalAlign: 'middle', marginRight: 8 }} />{message}
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 6, marginBottom: 16 }}>
          <X size={15} style={{ verticalAlign: 'middle', marginRight: 8 }} />{error}
        </div>
      )}

      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Withdrawal Amount</th>
                <th>Available Balance</th>
                <th>Request ID</th>
                <th>Request Date</th>
                <th>Payout</th>
                <th>Status / Rejection Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length ? withdrawals.map(item => (
                <tr key={item._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.driver?.name || item.user?.name || 'Driver Unavailable'}</div>
                    <div style={{ fontSize: '.75rem', color: '#64748b' }}>{item.driver?.mobileNumber || item.user?.phone || '—'}</div>
                  </td>
                  <td style={{ fontWeight: 700 }}>₹{Number(item.amount).toLocaleString('en-IN')}</td>
                  <td>₹{Number(item.driver?.walletBalance || 0).toLocaleString('en-IN')}</td>
                  <td><code>{item.referenceId}</code></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(item.createdAt).toLocaleString('en-IN')}</td>
                  <td>
                    <div>{item.payoutMethod}</div>
                    <div style={{ fontSize: '.75rem', color: '#64748b' }}>
                      {item.payoutDetails?.accountNumber || item.payoutDetails?.esewaId || item.payoutDetails?.khaltiId || '—'}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={getStatusLabel(item.status)} />
                    {item.status === 'Rejected' && item.adminNotes && (
                      <div style={{ maxWidth: 220, marginTop: 6, color: '#b91c1c', fontSize: '.75rem' }}>{item.adminNotes}</div>
                    )}
                  </td>
                  <td>
                    {item.status === 'Pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-success" disabled={actionLoading === item._id} onClick={() => approve(item._id)}>
                          <Check size={13} /> Approve
                        </button>
                        <button className="btn btn-sm btn-danger" disabled={actionLoading === item._id} onClick={() => reject(item._id)}>
                          <X size={13} /> Reject
                        </button>
                      </div>
                    ) : item.status === 'Processing' ? (
                      <button
                        className="btn btn-sm btn-success"
                        disabled={actionLoading === item._id}
                        onClick={() => setPaymentConfirmation(item)}
                      >
                        <Check size={13} /> Mark Payment Done
                      </button>
                    ) : ['Completed', 'Successful', 'Succeeded', 'Paid'].includes(item.status) ? (
                      null
                    ) : item.status === 'Rejected' ? (
                      null
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>No withdrawal requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paymentConfirmation && (
        <div
          role="presentation"
          onClick={() => actionLoading !== paymentConfirmation._id && setPaymentConfirmation(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(15, 23, 42, .5)'
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdrawal-payment-confirmation"
            onClick={event => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              padding: 24,
              borderRadius: 10,
              background: '#fff',
              boxShadow: '0 20px 50px rgba(15, 23, 42, .2)'
            }}
          >
            <h3 id="withdrawal-payment-confirmation" style={{ margin: '0 0 10px', color: '#0f172a' }}>
              Have you completed this payment to the driver?
            </h3>
            <p style={{ margin: '0 0 20px', color: '#64748b' }}>
              Confirm only after the withdrawal amount has actually been transferred.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                className="btn btn-sm btn-outline"
                disabled={actionLoading === paymentConfirmation._id}
                onClick={() => setPaymentConfirmation(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm btn-success"
                disabled={actionLoading === paymentConfirmation._id}
                onClick={markPaymentDone}
              >
                {actionLoading === paymentConfirmation._id ? 'Saving...' : 'Mark Payment Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalManagement;
