import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import {
  BarChart3,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Percent,
  Bus,
  Zap,
  Car,
  CheckCircle2,
  Clock,
  RefreshCw,
  Download
} from 'lucide-react';

const PlatformChargeReports = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'services' | 'drivers' | 'bookings'

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (serviceFilter !== 'ALL') params.serviceType = serviceFilter;

      const res = await adminService.getPlatformChargeReports(params);
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Error fetching platform charge reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [serviceFilter]);

  const handleFilterSubmit = (e) => {
    e?.preventDefault();
    fetchReports();
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setServiceFilter('ALL');
  };

  const summary = reportData?.summary || {
    totalGrossBookingAmount: 0,
    totalPlatformChargesCollected: 0,
    totalNetDriverEarnings: 0,
    totalBookingsCount: 0,
    settledAmount: 0,
    pendingSettlementAmount: 0
  };

  const serviceBreakdown = reportData?.serviceBreakdown || {};
  const driverBreakdown = reportData?.driverBreakdown || {};
  const bookings = reportData?.bookings || [];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Page Header */}
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a' }}>
            Platform Charge & Driver Earnings Audit Report
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
            Comprehensive reporting of gross customer fares, platform charges collected, net driver earnings, and settlement status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchReports} className="btn btn-outline" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="content-card" style={{ marginBottom: '24px', padding: '16px' }}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: '160px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Service Type</label>
            <select
              className="form-control"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
            >
              <option value="ALL">All Services (Bus, EV, Car)</option>
              <option value="Bus">Bus Only</option>
              <option value="EV-Sewa">EV-Sewa Only</option>
              <option value="Car">Car / Cab Only</option>
            </select>
          </div>

          <div style={{ minWidth: '150px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '600' }}>Start Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '600' }}>End Date</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Filter size={16} /> Apply Filters
            </button>
            <button type="button" onClick={handleReset} className="btn btn-outline" disabled={loading}>
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Financial KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: '700', textTransform: 'uppercase' }}>
            Total Gross Booking Amount
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginTop: '6px' }}>
            ₹{summary.totalGrossBookingAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Across {summary.totalBookingsCount || 0} completed rides
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #fed7aa', borderLeft: '4px solid #ea580c' }}>
          <div style={{ fontSize: '0.75rem', color: '#9a3412', fontWeight: '700', textTransform: 'uppercase' }}>
            Total Platform Charges Collected
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ea580c', marginTop: '6px' }}>
            ₹{summary.totalPlatformChargesCollected?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Platform revenue share
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>
            Total Net Driver Earnings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#16a34a', marginTop: '6px' }}>
            ₹{summary.totalNetDriverEarnings?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Credited to driver wallets
          </div>
        </div>

        <div style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0891b2' }}>
          <div style={{ fontSize: '0.75rem', color: '#0e7490', fontWeight: '700', textTransform: 'uppercase' }}>
            Settlement Status
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginTop: '6px' }}>
            ₹{summary.settledAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'} <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '600' }}>(Settled)</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: '700', marginTop: '2px' }}>
            ₹{summary.pendingSettlementAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '400' }}>(Pending Cash/Wallet)</span>
          </div>
        </div>
      </div>

      {/* Report Section Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('summary')}
          className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-outline'}`}
        >
          <BarChart3 size={16} /> Service Breakdown
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`btn ${activeTab === 'drivers' ? 'btn-primary' : 'btn-outline'}`}
        >
          Driver-wise Report ({Object.keys(driverBreakdown).length})
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`btn ${activeTab === 'bookings' ? 'btn-primary' : 'btn-outline'}`}
        >
          Booking-wise Audit Details ({bookings.length})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 12px' }} />
          <p>Compiling Financial & Platform Charge Audit Records...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: Service-wise Breakdown */}
          {activeTab === 'summary' && (
            <div className="content-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
                Service-wise Financial Breakdown
              </h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Trips Count</th>
                      <th>Gross Booking Amount</th>
                      <th>Platform Charge</th>
                      <th>Net Driver Earning</th>
                      <th>Effective Take Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Bus', 'EV-Sewa', 'Car'].map((srv) => {
                      const data = serviceBreakdown[srv] || { gross: 0, charges: 0, net: 0, count: 0 };
                      const rate = data.gross > 0 ? ((data.charges / data.gross) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={srv}>
                          <td style={{ fontWeight: '600' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {srv === 'Bus' && <Bus size={18} color="#2563eb" />}
                              {srv === 'EV-Sewa' && <Zap size={18} color="#16a34a" />}
                              {srv === 'Car' && <Car size={18} color="#6366f1" />}
                              <span>{srv}</span>
                            </div>
                          </td>
                          <td>{data.count}</td>
                          <td style={{ fontWeight: '600' }}>₹{data.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ color: '#ea580c', fontWeight: '700' }}>₹{data.charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ color: '#16a34a', fontWeight: '700' }}>₹{data.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: '#f1f5f9',
                              color: '#334155'
                            }}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Driver-wise Report */}
          {activeTab === 'drivers' && (
            <div className="content-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
                Driver-wise Platform Charge & Earnings Report
              </h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Driver Name</th>
                      <th>Mobile Number</th>
                      <th>Completed Trips</th>
                      <th>Total Gross Fare</th>
                      <th>Platform Charge Deducted</th>
                      <th>Net Earnings</th>
                      <th>Current Wallet Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(driverBreakdown).length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                          No completed trips found for the selected filter period.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(driverBreakdown).map(([id, d]) => (
                        <tr key={id}>
                          <td style={{ fontWeight: '700', color: '#0f172a' }}>{d.name}</td>
                          <td style={{ fontFamily: 'monospace' }}>{d.mobile || '—'}</td>
                          <td>{d.count}</td>
                          <td style={{ fontWeight: '600' }}>₹{d.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ color: '#ea580c', fontWeight: '700' }}>₹{d.charges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ color: '#16a34a', fontWeight: '700' }}>₹{d.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ fontWeight: '700', color: '#0284c7' }}>₹{Number(d.walletBalance || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Booking-wise Audit Details */}
          {activeTab === 'bookings' && (
            <div className="content-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>
                Booking-wise Immutable Audit Details
              </h3>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Date</th>
                      <th>Service</th>
                      <th>Mode</th>
                      <th>Driver</th>
                      <th>Gross Fare</th>
                      <th>Platform Charge</th>
                      <th>Net Driver Earning</th>
                      <th>Charge Rule</th>
                      <th>Settlement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                          No booking records match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((b) => (
                        <tr key={b._id}>
                          <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{b.bookingId}</td>
                          <td>{new Date(b.createdAt).toLocaleDateString()}</td>
                          <td>{b.serviceType}</td>
                          <td>{b.bookingMode || 'NORMAL'}</td>
                          <td>{b.driver?.name || '—'}</td>
                          <td style={{ fontWeight: '600' }}>₹{Number(b.grossFare || b.fare || 0).toFixed(2)}</td>
                          <td style={{ color: '#ea580c', fontWeight: '700' }}>
                            ₹{Number(b.platformCharge || 0).toFixed(2)}
                          </td>
                          <td style={{ color: '#16a34a', fontWeight: '700' }}>
                            ₹{Number(b.netDriverEarning || b.driverPaymentAmount || 0).toFixed(2)}
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: '600',
                              backgroundColor: '#f1f5f9',
                              color: '#334155'
                            }}>
                              {b.chargeType || 'PERCENTAGE'} {b.chargeRateOrAmount ? `(${b.chargeRateOrAmount}${b.chargeType === 'PERCENTAGE' ? '%' : '₹'})` : ''}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: b.paymentStatus === 'Paid' ? '#dcfce7' : '#fef3c7',
                              color: b.paymentStatus === 'Paid' ? '#15803d' : '#b45309'
                            }}>
                              {b.paymentStatus === 'Paid' ? 'SETTLED' : 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlatformChargeReports;
