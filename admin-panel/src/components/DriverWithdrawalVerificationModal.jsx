import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Wallet,
  User,
  Car,
  Clock,
  Search,
  Eye,
  EyeOff,
  Building,
  ExternalLink,
  RefreshCw,
  FileText,
  Smartphone
} from 'lucide-react';
import { adminService } from '../services/adminService';
import StatusBadge from './StatusBadge';

const DriverWithdrawalVerificationModal = ({
  withdrawalId,
  onClose,
  onActionSuccess
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'bank' | 'kyc' | 'history' | 'ledger'

  // History filtering state
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState('All');
  const [historyMethod, setHistoryMethod] = useState('All');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Sub-action dialogs
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchDetails = async (page = historyPage) => {
    try {
      if (!data) setLoading(true);
      else setHistoryLoading(true);
      setError('');

      const params = {
        historyPage: page,
        historyLimit: 6,
        historyStatus: historyStatus !== 'All' ? historyStatus : undefined,
        historyMethod: historyMethod !== 'All' ? historyMethod : undefined,
        historySearch: historySearch.trim() || undefined
      };

      const res = await adminService.getWithdrawalVerificationDetails(withdrawalId, params);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load driver financial profile.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load financial details.');
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (withdrawalId) {
      fetchDetails(1);
    }
  }, [withdrawalId]);

  const handleFilterHistory = (e) => {
    e.preventDefault();
    setHistoryPage(1);
    fetchDetails(1);
  };

  const handlePageChange = (newPage) => {
    setHistoryPage(newPage);
    fetchDetails(newPage);
  };

  const handleApprove = async () => {
    setActionSubmitting(true);
    setActionError('');
    try {
      const res = await adminService.approveWithdrawal(withdrawalId, { notes: actionNotes.trim() });
      if (res.success) {
        setConfirmApprove(false);
        setActionNotes('');
        await fetchDetails(historyPage);
        if (onActionSuccess) onActionSuccess('Withdrawal approved and marked for processing.');
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to approve withdrawal.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setActionError('Rejection reason is mandatory.');
      return;
    }
    setActionSubmitting(true);
    setActionError('');
    try {
      const res = await adminService.rejectWithdrawal(withdrawalId, rejectionReason.trim());
      if (res.success) {
        setConfirmReject(false);
        setRejectionReason('');
        await fetchDetails(historyPage);
        if (onActionSuccess) onActionSuccess('Withdrawal rejected and amount returned to driver wallet.');
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reject withdrawal.');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleCompletePayment = async () => {
    setActionSubmitting(true);
    setActionError('');
    try {
      const res = await adminService.completeWithdrawalPayment(withdrawalId, {
        utrNumber: utrNumber.trim(),
        notes: actionNotes.trim()
      });
      if (res.success) {
        setConfirmPayment(false);
        setUtrNumber('');
        setActionNotes('');
        await fetchDetails(historyPage);
        if (onActionSuccess) onActionSuccess('Withdrawal marked as Payment Done.');
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to complete payment.');
    } finally {
      setActionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" style={{ zIndex: 1200 }}>
        <div className="modal-content" style={{ maxWidth: '700px', padding: '36px', textAlign: 'center' }}>
          <RefreshCw className="spin" size={32} style={{ color: '#3b82f6', marginBottom: 12 }} />
          <h3 style={{ margin: 0, color: '#0f172a' }}>Loading Driver Financial Profile...</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 8 }}>
            Aggregating driver KYC, wallet ledger, IFSC verification, and withdrawal history.
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="modal-overlay" style={{ zIndex: 1200 }}>
        <div className="modal-content" style={{ maxWidth: '520px', padding: '28px', textAlign: 'center' }}>
          <AlertTriangle size={36} style={{ color: '#ef4444', marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Verification Profile Unavailable</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 20px' }}>
            {error || 'Unable to retrieve financial details for this driver.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button className="btn btn-sm btn-outline" onClick={onClose}>Close</button>
            <button className="btn btn-sm btn-primary" onClick={() => fetchDetails(1)}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const { withdrawal, driver, walletSummary, bankAndPayout, warnings, withdrawalHistory } = data;

  return (
    <div className="modal-overlay" style={{ zIndex: 1200, padding: '16px' }} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
          background: '#ffffff'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                Driver Financial Profile & Verification
              </h2>
              <span
                style={{
                  background: '#e0e7ff',
                  color: '#4338ca',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                ID: {withdrawal.referenceId}
              </span>
              <StatusBadge status={withdrawal.status} />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Requested ₹{Number(withdrawal.amount).toLocaleString('en-IN')} on{' '}
              {new Date(withdrawal.createdAt).toLocaleString('en-IN')} via {withdrawal.payoutMethod}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>



        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            padding: '0 24px',
            gap: 12,
            overflowX: 'auto'
          }}
        >
          {[
            { id: 'overview', label: 'Financial Overview', icon: Wallet },
            { id: 'bank', label: 'Bank & Payout Details', icon: CreditCard },
            { id: 'kyc', label: 'Driver KYC & Vehicle', icon: ShieldCheck },
            { id: 'history', label: `Withdrawal History (${withdrawalHistory.pagination.total})`, icon: Clock },
            { id: 'ledger', label: 'Earnings Ledger', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 10px',
                  border: 'none',
                  background: 'none',
                  borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  color: isActive ? '#1d4ed8' : '#64748b',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc' }}>
          {/* TAB 1: OVERVIEW & FINANCIAL STATS */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Driver Summary Profile Card */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img
                    src={driver.profilePhoto}
                    alt={driver.name}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #e2e8f0'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80';
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>{driver.name}</h3>
                      <StatusBadge status={driver.driverStatus} />
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: driver.isOnline ? '#ecfdf5' : '#f1f5f9',
                          color: driver.isOnline ? '#059669' : '#64748b',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 600
                        }}
                      >
                        {driver.isOnline ? '● Online' : '○ Offline'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                      <span>Phone: <strong>{driver.mobileNumber}</strong></span>
                      {driver.email ? <span> • Email: <strong>{driver.email}</strong></span> : null}
                      <span> • Registered: <strong>{new Date(driver.registeredDate).toLocaleDateString('en-IN')}</strong></span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Current Request</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{Number(withdrawal.amount).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                    Method: {withdrawal.payoutMethod}
                  </div>
                </div>
              </div>

              {/* Financial Summary Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: 14
                }}
              >
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    Available Wallet Balance
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                    ₹{Number(walletSummary.availableBalance).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                    Net usable balance in driver account
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    Reserved / In-Flight Amount
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', marginTop: 4 }}>
                    ₹{Number(walletSummary.reservedAmount).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                    Pending + Processing payouts
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    Total Successfully Paid
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7', marginTop: 4 }}>
                    ₹{Number(walletSummary.totalCompletedAmount).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                    Across {walletSummary.totalCompletedCount} completed withdrawals
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    Total Rejected Requests
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                    {walletSummary.totalRejectedCount} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>(₹{Number(walletSummary.totalRejectedAmount).toLocaleString('en-IN')})</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                    Amounts restored to driver wallet
                  </div>
                </div>
              </div>

              {/* Financial Consistency Alert Box */}
              <div
                style={{
                  background: walletSummary.isConsistent ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${walletSummary.isConsistent ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: 8,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {walletSummary.isConsistent ? (
                    <ShieldCheck size={20} style={{ color: '#16a34a' }} />
                  ) : (
                    <ShieldAlert size={20} style={{ color: '#dc2626' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: walletSummary.isConsistent ? '#15803d' : '#991b1b' }}>
                      {walletSummary.isConsistent
                        ? 'Wallet Accounting & Reservation Consistency: Verified'
                        : 'Wallet Accounting Inconsistency Detected'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: walletSummary.isConsistent ? '#166534' : '#b91c1c' }}>
                      {walletSummary.isConsistent
                        ? 'Available balance, reserved requests, and previous payouts reconcile cleanly with database ledgers.'
                        : walletSummary.inconsistencies.join(', ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Payout Mini Summary */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  Target Beneficiary & Payout Route
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Payout Channel</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{bankAndPayout.payoutMethod}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Account / Wallet Holder</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{bankAndPayout.beneficiaryName || '—'}</div>
                  </div>
                  {bankAndPayout.payoutMethod === 'Bank' ? (
                    <>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Bank Name</span>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{bankAndPayout.bankName || '—'}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>IFSC Code</span>
                        <div style={{ fontWeight: 700, color: bankAndPayout.isIfscProvided ? '#0f172a' : '#64748b' }}>
                          {bankAndPayout.isIfscProvided ? (bankAndPayout.ifscCode || bankAndPayout.ifsc || bankAndPayout.bankIfsc) : 'Not provided'}
                        </div>
                      </div>
                    </>
                  ) : bankAndPayout.payoutMethod === 'eSewa' ? (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>eSewa ID</span>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{bankAndPayout.esewaId || '—'}</div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Khalti ID</span>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{bankAndPayout.khaltiId || '—'}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPLETE BANK AND PAYOUT DETAILS */}
          {activeTab === 'bank' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                      Complete Bank & Payout Information
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                      Strict verification of beneficiary credentials before dispatching funds.
                    </p>
                  </div>
                  <span
                    style={{
                      background: bankAndPayout.payoutMethod === 'Bank' ? '#e0f2fe' : '#ecfdf5',
                      color: bankAndPayout.payoutMethod === 'Bank' ? '#0369a1' : '#047857',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      fontWeight: 600
                    }}
                  >
                    Method: {bankAndPayout.payoutMethod}
                  </span>
                </div>

                {/* BANK TRANSFER VIEW */}
                {bankAndPayout.payoutMethod === 'Bank' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        Account Holder Name
                      </span>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginTop: 2 }}>
                        {bankAndPayout.accountHolderName || '—'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        Bank Name
                      </span>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginTop: 2 }}>
                        {bankAndPayout.bankName || '—'}
                      </div>
                    </div>

                    {/* IFSC SECTION */}
                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        IFSC Code
                      </span>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: bankAndPayout.isIfscProvided ? '#0f172a' : '#64748b',
                          marginTop: 4,
                          letterSpacing: '0.05em',
                          fontFamily: 'monospace'
                        }}
                      >
                        {bankAndPayout.isIfscProvided ? (bankAndPayout.ifscCode || bankAndPayout.ifsc || bankAndPayout.bankIfsc) : 'Not provided'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        Bank Branch
                      </span>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a', marginTop: 2 }}>
                        {bankAndPayout.branch || 'Head Office / Standard Branch'}
                      </div>
                    </div>

                    {/* MASKED BANK ACCOUNT NUMBER BY DEFAULT */}
                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                          Bank Account Number
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowFullAccount(!showFullAccount)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          {showFullAccount ? <EyeOff size={13} /> : <Eye size={13} />}
                          {showFullAccount ? 'Mask' : 'Reveal'}
                        </button>
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          color: '#0f172a',
                          marginTop: 4,
                          fontFamily: 'monospace'
                        }}
                      >
                        {showFullAccount
                          ? bankAndPayout.rawAccountNumber || '—'
                          : bankAndPayout.maskedAccountNumber || '—'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        Bank Verification Status
                      </span>
                      <div style={{ marginTop: 4 }}>
                        <span
                          style={{
                            background:
                              bankAndPayout.bankVerificationStatus === 'Verified'
                                ? '#ecfdf5'
                                : bankAndPayout.bankVerificationStatus === 'Rejected'
                                ? '#fef2f2'
                                : '#fffbeb',
                            color:
                              bankAndPayout.bankVerificationStatus === 'Verified'
                                ? '#047857'
                                : bankAndPayout.bankVerificationStatus === 'Rejected'
                                ? '#dc2626'
                                : '#b45309',
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}
                        >
                          {bankAndPayout.bankVerificationStatus || 'Pending Verification'}
                        </span>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        UTR / Transaction Reference
                      </span>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a', marginTop: 4, fontFamily: 'monospace' }}>
                        {withdrawal.utrNumber || withdrawal.referenceId || 'Pending transfer'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        Processing Timestamp
                      </span>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', marginTop: 4 }}>
                        {withdrawal.processedAt ? new Date(withdrawal.processedAt).toLocaleString('en-IN') : 'Not yet processed'}
                      </div>
                    </div>
                  </div>
                ) : bankAndPayout.payoutMethod === 'eSewa' ? (
                  /* STRICT eSEWA VIEW - NO BANK FIELDS */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>
                        Registered eSewa Wallet ID
                      </span>
                      <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', marginTop: 4, fontFamily: 'monospace' }}>
                        {bankAndPayout.esewaId || '—'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        Beneficiary / Account Name
                      </span>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginTop: 4 }}>
                        {bankAndPayout.accountHolderName || '—'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        Transaction / Payout Reference
                      </span>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a', marginTop: 4, fontFamily: 'monospace' }}>
                        {withdrawal.referenceId}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        Processing Status
                      </span>
                      <div style={{ marginTop: 4 }}>
                        <StatusBadge status={withdrawal.status} />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* STRICT KHALTI VIEW */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <div style={{ background: '#faf5ff', padding: 16, borderRadius: 8, border: '1px solid #e9d5ff' }}>
                      <span style={{ fontSize: '0.75rem', color: '#7e22ce', fontWeight: 600, textTransform: 'uppercase' }}>
                        Registered Khalti ID
                      </span>
                      <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a', marginTop: 4, fontFamily: 'monospace' }}>
                        {bankAndPayout.khaltiId || '—'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        Beneficiary / Account Name
                      </span>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginTop: 4 }}>
                        {bankAndPayout.accountHolderName || '—'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                        Transaction / Payout Reference
                      </span>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a', marginTop: 4, fontFamily: 'monospace' }}>
                        {withdrawal.referenceId}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DRIVER KYC & REGISTERED VEHICLE */}
          {activeTab === 'kyc' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* KYC Documents Grid */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Compliance & Verification Documents
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  {/* Driving Licence */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Driving Licence</span>
                      <StatusBadge status={driver.kycDocuments.drivingLicence.status} />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>
                      Number: <strong>{driver.kycDocuments.drivingLicence.number || 'Not provided'}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Expiry: {driver.kycDocuments.drivingLicence.expiry || '—'}
                    </div>
                    {driver.kycDocuments.drivingLicence.doc && (
                      <a
                        href={driver.kycDocuments.drivingLicence.doc}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.75rem', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}
                      >
                        <ExternalLink size={12} /> View Licence Document
                      </a>
                    )}
                  </div>

                  {/* Citizenship / National ID */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Citizenship / ID</span>
                      <StatusBadge status={driver.kycDocuments.citizenship.status} />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>
                      Number: <strong>{driver.kycDocuments.citizenship.number || 'Not provided'}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Issue Date: {driver.kycDocuments.citizenship.issueDate || '—'}
                    </div>
                    {driver.kycDocuments.citizenship.docFront && (
                      <a
                        href={driver.kycDocuments.citizenship.docFront}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.75rem', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}
                      >
                        <ExternalLink size={12} /> View Citizenship Card
                      </a>
                    )}
                  </div>

                  {/* Vehicle RC */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Registration Certificate (RC)</span>
                      <StatusBadge status={driver.kycDocuments.rc.status} />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>
                      Reg No: <strong>{driver.kycDocuments.rc.number || '—'}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Expiry: {driver.kycDocuments.rc.expiry || '—'}
                    </div>
                  </div>

                  {/* Insurance */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Vehicle Insurance</span>
                      <StatusBadge status={driver.kycDocuments.insurance.status} />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>
                      Policy: <strong>{driver.kycDocuments.insurance.policyNumber || 'Commercial Fleet'}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Expiry: {driver.kycDocuments.insurance.expiry || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Registered / Assigned Vehicle Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                  Assigned Vehicle Information
                </h4>
                {driver.assignedVehicle ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Vehicle Plate Number</span>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                        {driver.assignedVehicle.vehicleNumber}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Vehicle Type / Category</span>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {driver.assignedVehicle.vehicleType} — {driver.assignedVehicle.vehicleCategory}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Make / Model</span>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {driver.assignedVehicle.vehicleModel || driver.assignedVehicle.vehicleName}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Capacity</span>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {driver.assignedVehicle.seatingCapacity || 4} Passengers
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#64748b', fontSize: '0.88rem' }}>
                    No vehicle currently linked directly. Driver uses independently registered vehicle or platform dispatch.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: COMPLETE WITHDRAWAL HISTORY FOR SELECTED DRIVER */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Search & Filter Controls */}
              <form
                onSubmit={handleFilterHistory}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  background: '#ffffff',
                  padding: 14,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search ID, Bank, IFSC..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <select
                  value={historyStatus}
                  onChange={(e) => setHistoryStatus(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <select
                  value={historyMethod}
                  onChange={(e) => setHistoryMethod(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                >
                  <option value="All">All Methods</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="eSewa">eSewa</option>
                  <option value="Khalti">Khalti</option>
                </select>

                <button type="submit" className="btn btn-sm btn-primary">
                  Filter
                </button>
              </form>

              {/* History Table */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <div className="table-responsive">
                  <table className="data-table" style={{ fontSize: '0.8rem', width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Request ID</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Bank / IFSC</th>
                        <th>Account / ID</th>
                        <th>Status</th>
                        <th>Paid Amt</th>
                        <th>UTR / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalHistory.items && withdrawalHistory.items.length > 0 ? (
                        withdrawalHistory.items.map((item) => (
                          <tr key={item._id} style={item._id === withdrawal._id ? { background: '#f0fdf4' } : {}}>
                            <td>
                              <code>{item.referenceId}</code>
                              {item._id === withdrawal._id && (
                                <span style={{ marginLeft: 4, color: '#16a34a', fontWeight: 700 }}>(Selected)</span>
                              )}
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {new Date(item.createdAt).toLocaleDateString('en-IN')}
                            </td>
                            <td style={{ fontWeight: 700 }}>₹{Number(item.amount).toLocaleString('en-IN')}</td>
                            <td>{item.payoutMethod}</td>
                            <td>
                              <div>{item.bankName}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                                {item.ifscCode}
                              </div>
                            </td>
                            <td><code>{item.maskedAccount}</code></td>
                            <td>
                              <StatusBadge status={item.status} />
                            </td>
                            <td style={{ fontWeight: 600, color: item.actualPaidAmount ? '#15803d' : '#64748b' }}>
                              ₹{Number(item.actualPaidAmount).toLocaleString('en-IN')}
                            </td>
                            <td>
                              <div style={{ fontSize: '0.72rem', maxWidth: 160, wordBreak: 'break-word' }}>
                                {item.rejectionReason ? (
                                  <span style={{ color: '#b91c1c' }}>{item.rejectionReason}</span>
                                ) : (
                                  item.utrNumber || '—'
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                            {historyLoading ? 'Loading history...' : 'No previous withdrawals match this filter.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {withdrawalHistory.pagination.totalPages > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      borderTop: '1px solid #e2e8f0',
                      fontSize: '0.82rem'
                    }}
                  >
                    <span>
                      Page {withdrawalHistory.pagination.page} of {withdrawalHistory.pagination.totalPages} (Total:{' '}
                      {withdrawalHistory.pagination.total})
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={withdrawalHistory.pagination.page <= 1 || historyLoading}
                        onClick={() => handlePageChange(withdrawalHistory.pagination.page - 1)}
                      >
                        Previous
                      </button>
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={withdrawalHistory.pagination.page >= withdrawalHistory.pagination.totalPages || historyLoading}
                        onClick={() => handlePageChange(withdrawalHistory.pagination.page + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: RECENT RIDE EARNINGS & DEDUCTIONS LEDGER */}
          {activeTab === 'ledger' && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  Authoritative Ride Earnings Ledger & Deductions
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Recent completed booking payments and platform charges credited to driver wallet.
                </p>
              </div>
              <div className="table-responsive">
                <table className="data-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Transaction Type</th>
                      <th>Description / Booking</th>
                      <th>Gross Ride Credited</th>
                      <th>Platform Charge</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletSummary.ledger && walletSummary.ledger.length > 0 ? (
                      walletSummary.ledger.map((entry) => (
                        <tr key={entry._id}>
                          <td>{new Date(entry.date).toLocaleString('en-IN')}</td>
                          <td><strong>{entry.type}</strong></td>
                          <td>{entry.description}</td>
                          <td style={{ fontWeight: 700, color: '#16a34a' }}>
                            +₹{Number(entry.amount).toLocaleString('en-IN')}
                          </td>
                          <td style={{ color: '#d97706' }}>
                            {entry.platformCharge ? `₹${Number(entry.platformCharge).toLocaleString('en-IN')}` : '₹0'}
                          </td>
                          <td>
                            <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                              {entry.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                          No recent ride ledger entries recorded for this driver.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Current Status:{' '}
            <strong style={{ color: '#0f172a' }}>{withdrawal.status}</strong>
            {withdrawal.adminNotes ? ` — ${withdrawal.adminNotes}` : ''}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-sm btn-outline" onClick={onClose}>
              Close
            </button>

            {withdrawal.status === 'Pending' && (
              <>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => setConfirmApprove(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Check size={14} /> Approve Request
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => setConfirmReject(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <X size={14} /> Reject Request
                </button>
              </>
            )}

            {withdrawal.status === 'Processing' && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setConfirmPayment(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Check size={14} /> Mark Payment Done
              </button>
            )}
          </div>
        </div>

        {/* Sub-modal: Confirm Approval */}
        {confirmApprove && (
          <div className="modal-overlay" style={{ zIndex: 1300 }}>
            <div className="modal-content" style={{ maxWidth: '440px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#0f172a' }}>Approve Driver Withdrawal?</h3>
              <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem' }}>
                This moves request <strong>{withdrawal.referenceId}</strong> (₹{Number(withdrawal.amount).toLocaleString('en-IN')})
                to <strong>Processing</strong> status. The reserved funds remain deducted while payout is dispatched.
              </p>

              {actionError && (
                <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem', marginBottom: 12 }}>
                  {actionError}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', marginBottom: 4 }}>
                  Admin Notes (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified bank details and identity"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={actionSubmitting}
                  onClick={() => setConfirmApprove(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-success"
                  disabled={actionSubmitting}
                  onClick={handleApprove}
                >
                  {actionSubmitting ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-modal: Confirm Rejection with MANDATORY Reason */}
        {confirmReject && (
          <div className="modal-overlay" style={{ zIndex: 1300 }}>
            <div className="modal-content" style={{ maxWidth: '460px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#dc2626' }}>Reject Driver Withdrawal</h3>
              <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem' }}>
                Rejecting returns <strong>₹{Number(withdrawal.amount).toLocaleString('en-IN')}</strong> back into the driver available
                wallet balance. A clear rejection reason is mandatory.
              </p>

              {actionError && (
                <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem', marginBottom: 12 }}>
                  {actionError}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Bank IFSC code mismatch or invalid account number provided."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={actionSubmitting}
                  onClick={() => setConfirmReject(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  disabled={actionSubmitting || !rejectionReason.trim()}
                  onClick={handleReject}
                >
                  {actionSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-modal: Confirm Payment Done with UTR Entry */}
        {confirmPayment && (
          <div className="modal-overlay" style={{ zIndex: 1300 }}>
            <div className="modal-content" style={{ maxWidth: '460px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#0f172a' }}>Mark Withdrawal Payment Done</h3>
              <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem' }}>
                Confirm only after the funds have actually been transferred via bank or digital wallet.
              </p>

              {actionError && (
                <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem', marginBottom: 12 }}>
                  {actionError}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', marginBottom: 4 }}>
                  Transaction UTR / Reference Number:
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-982348234 or bank transaction ID"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', marginBottom: 4 }}>
                  Admin Notes (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Transferred via corporate net banking"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={actionSubmitting}
                  onClick={() => setConfirmPayment(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-success"
                  disabled={actionSubmitting}
                  onClick={handleCompletePayment}
                >
                  {actionSubmitting ? 'Saving...' : 'Mark Payment Done'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverWithdrawalVerificationModal;
