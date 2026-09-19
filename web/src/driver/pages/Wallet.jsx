import React, { useState, useEffect } from 'react';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Clock,
  Building,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  DollarSign,
  ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../context/LanguageContext';

const Wallet = () => {
  const { t } = useLanguage();
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('Bank');
  const [payoutDetails, setPayoutDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    branch: '',
    esewaId: '',
    khaltiId: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await api.get('/driver/wallet');
      if (res.data.success) {
        setWalletData(res.data.data);
        if (res.data.data.payoutMethods) {
          setPayoutDetails(prev => ({
            ...prev,
            ...res.data.data.payoutMethods
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) < 100) {
      setErrorMessage('Minimum withdrawal amount is ₹100');
      return;
    }

    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.post('/driver/withdraw', {
        amount: Number(withdrawAmount),
        payoutMethod,
        payoutDetails
      });

      if (res.data.success) {
        setSuccessMessage(res.data.message || 'Withdrawal request submitted.');
        setWithdrawAmount('');
        fetchWallet();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Error processing withdrawal request.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        {t('loading')}
      </div>
    );
  }

  const balance = walletData?.walletBalance || 0;
  const earnings = walletData?.totalEarnings || 0;
  const bonus = walletData?.totalBonus || 0;
  const commission = walletData?.totalCommission || 0;
  const withdrawn = walletData?.totalWithdrawn || 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '26px', fontWeight: '800' }}>
            {t('wallet')}
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Authoritative financial balance, earnings breakdown, and withdrawal settlement management.
          </p>
        </div>
        <button
          onClick={fetchWallet}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#334155',
            color: '#e2e8f0',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {successMessage && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '14px 18px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '14px 18px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Main Wallet Balance */}
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #3b82f6',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#93c5fd', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>
              {t('walletBalance')}
            </span>
            <WalletIcon size={22} color="#60a5fa" />
          </div>
          <div style={{ color: '#ffffff', fontSize: '32px', fontWeight: '800' }}>
            ₹{balance}
          </div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            Available for instant payout request
          </span>
        </div>

        {/* Total Earnings */}
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>
              Gross Ride Earnings
            </span>
            <TrendingUp size={22} color="#10b981" />
          </div>
          <div style={{ color: '#10b981', fontSize: '30px', fontWeight: '800' }}>
            ₹{earnings}
          </div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            Total 80% share credited from rides
          </span>
        </div>

        {/* Commission */}
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>
              {t('commission')}
            </span>
            <Percent size={22} color="#f59e0b" />
          </div>
          <div style={{ color: '#f59e0b', fontSize: '30px', fontWeight: '800' }}>
            ₹{commission}
          </div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            Authoritative platform fee deductions
          </span>
        </div>

        {/* Withdrawn */}
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>
              Total Settled Payouts
            </span>
            <ArrowUpRight size={22} color="#a855f7" />
          </div>
          <div style={{ color: '#c084fc', fontSize: '30px', fontWeight: '800' }}>
            ₹{withdrawn}
          </div>
          <span style={{ color: '#64748b', fontSize: '12px' }}>
            Transferred to Bank / Wallets
          </span>
        </div>
      </div>

      {/* Withdrawal Form & Payout Methods */}
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '20px', fontWeight: '700' }}>
          Request Payout / Withdrawal
        </h2>

        <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Method Selector Tabs */}
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              Select Payout Method
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {['Bank', 'eSewa', 'Khalti'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayoutMethod(m)}
                  style={{
                    flex: '1 1 120px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: payoutMethod === m ? '2px solid #2563eb' : '1px solid #334155',
                    backgroundColor: payoutMethod === m ? 'rgba(37, 99, 235, 0.2)' : '#0f172a',
                    color: payoutMethod === m ? '#60a5fa' : '#94a3b8',
                    fontWeight: '700',
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {m === 'Bank' ? <Building size={18} /> : <CreditCard size={18} />}
                  <span>{m} Transfer</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Withdrawal Amount (₹)
              </label>
              <input
                type="number"
                min="100"
                max={balance}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount (min ₹100)"
                required
                style={{
                  width: '100%',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '700',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Payout Specific Details */}
            {payoutMethod === 'Bank' && (
              <>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={payoutDetails.bankName}
                    onChange={(e) => setPayoutDetails({ ...payoutDetails, bankName: e.target.value })}
                    placeholder="e.g. State Bank of India / Nabil Bank"
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={payoutDetails.accountNumber}
                    onChange={(e) => setPayoutDetails({ ...payoutDetails, accountNumber: e.target.value })}
                    placeholder="Account Number"
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#cbd5e1', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={payoutDetails.accountHolderName}
                    onChange={(e) => setPayoutDetails({ ...payoutDetails, accountHolderName: e.target.value })}
                    placeholder="Account Holder Full Name"
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </>
            )}

            {payoutMethod === 'eSewa' && (
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  eSewa Registered Mobile / ID
                </label>
                <input
                  type="text"
                  value={payoutDetails.esewaId}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, esewaId: e.target.value })}
                  placeholder="e.g. 98XXXXXXXX"
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            {payoutMethod === 'Khalti' && (
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  Khalti Registered Mobile Number
                </label>
                <input
                  type="text"
                  value={payoutDetails.khaltiId}
                  onChange={(e) => setPayoutDetails({ ...payoutDetails, khaltiId: e.target.value })}
                  placeholder="e.g. 98XXXXXXXX"
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={actionLoading || balance < 100}
            style={{
              backgroundColor: balance >= 100 ? '#2563eb' : '#475569',
              color: '#ffffff',
              border: 'none',
              padding: '14px 24px',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: balance >= 100 ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <ArrowUpRight size={18} />
            <span>{actionLoading ? 'Submitting Request...' : 'Submit Withdrawal Request'}</span>
          </button>
        </form>
      </div>

      {/* Transaction & Settlement History */}
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
          Recent Settlement & Withdrawal Requests
        </h2>

        {walletData?.recentWithdrawals?.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '13px' }}>
                  <th style={{ padding: '12px' }}>Reference</th>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Method</th>
                  <th style={{ padding: '12px' }}>Amount</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {walletData.recentWithdrawals.map((w) => (
                  <tr key={w._id} style={{ borderBottom: '1px solid #1e293b', color: '#e2e8f0', fontSize: '14px' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{w.referenceId}</td>
                    <td style={{ padding: '12px' }}>{new Date(w.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px' }}>{w.payoutMethod}</td>
                    <td style={{ padding: '12px', color: '#60a5fa', fontWeight: '700' }}>₹{w.amount}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          backgroundColor: w.status === 'Completed' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                          color: w.status === 'Completed' ? '#34d399' : '#fbbf24',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#94a3b8', fontSize: '13px' }}>
                      {w.adminNotes || 'Processing settlement.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
            No recent withdrawal requests logged.
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;
