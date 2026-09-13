import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { BarChart3, CalendarCheck, CreditCard, XOctagon, Percent, ShieldAlert } from 'lucide-react';

const BasicReports = () => {
  const [reportData, setReportData] = useState(null);
  const [activeReportTab, setActiveReportTab] = useState('bookings');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await adminService.getBasicReports();
        if (res.success) {
          setReportData(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Generating basic operational reports...</div>;
  }

  const { bookings, payments, cancellations, compensations, insurances } = reportData || {};

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Basic Reports & Platform Audit</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Audited records for bookings, payments, cancellations, glitch compensations, and accident insurance policies.
          </p>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveReportTab('bookings')}
          className={`btn ${activeReportTab === 'bookings' ? 'btn-primary' : 'btn-outline'}`}
        >
          <CalendarCheck size={16} /> 1. Booking Records ({bookings?.length || 0})
        </button>
        <button
          onClick={() => setActiveReportTab('payments')}
          className={`btn ${activeReportTab === 'payments' ? 'btn-primary' : 'btn-outline'}`}
        >
          <CreditCard size={16} /> 2. Payment Records ({payments?.length || 0})
        </button>
        <button
          onClick={() => setActiveReportTab('cancellations')}
          className={`btn ${activeReportTab === 'cancellations' ? 'btn-primary' : 'btn-outline'}`}
        >
          <XOctagon size={16} /> 3. Cancellation Records ({cancellations?.length || 0})
        </button>
        <button
          onClick={() => setActiveReportTab('compensations')}
          className={`btn ${activeReportTab === 'compensations' ? 'btn-primary' : 'btn-outline'}`}
        >
          <Percent size={16} /> 4. 3% Compensation Records ({compensations?.length || 0})
        </button>
        <button
          onClick={() => setActiveReportTab('insurance')}
          className={`btn ${activeReportTab === 'insurance' ? 'btn-primary' : 'btn-outline'}`}
        >
          <ShieldAlert size={16} /> 5. Insurance Records ({insurances?.length || 0})
        </button>
      </div>

      {/* Report Tables */}
      <div className="content-card">
        <div className="table-responsive">
          {activeReportTab === 'bookings' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Service</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Route</th>
                  <th>Fare</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings?.map(b => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{b.bookingId}</td>
                    <td>{b.serviceType}</td>
                    <td>{b.customer?.name} ({b.customer?.phone})</td>
                    <td>{b.vehicle?.vehicleNumber || 'N/A'}</td>
                    <td>{b.pickupLocation} → {b.dropLocation}</td>
                    <td style={{ fontWeight: '700' }}>₹{b.fare}</td>
                    <td><StatusBadge status={b.bookingStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReportTab === 'payments' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Transaction Ref</th>
                  <th>Gross Amount</th>
                  <th>Driver Settlement</th>
                  <th>Payment Status</th>
                  <th>Refund Status</th>
                </tr>
              </thead>
              <tbody>
                {payments?.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{p.bookingId}</td>
                    <td><code>{p.transactionReference}</code></td>
                    <td style={{ fontWeight: '700' }}>₹{p.bookingAmount}</td>
                    <td style={{ fontWeight: '700', color: '#10b981' }}>₹{p.driverPayment}</td>
                    <td><StatusBadge status={p.paymentStatus} /></td>
                    <td><StatusBadge status={p.refundStatus === 'None' ? 'Completed' : p.refundStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReportTab === 'cancellations' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Booking Amount</th>
                  <th>Cancellation Reason</th>
                  <th>Refund Amount</th>
                  <th>Refund Status</th>
                </tr>
              </thead>
              <tbody>
                {cancellations?.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{c.bookingId}</td>
                    <td>{c.customer?.name} ({c.customer?.phone})</td>
                    <td>₹{c.bookingAmount}</td>
                    <td style={{ maxWidth: '300px', fontSize: '0.85rem' }}>{c.cancellationReason}</td>
                    <td style={{ fontWeight: '700', color: '#dc2626' }}>₹{c.refundAmount}</td>
                    <td><StatusBadge status={c.refundStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReportTab === 'compensations' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Trip Fare</th>
                  <th>Verified Glitch Reason</th>
                  <th>3% Compensation</th>
                  <th>Approval Status</th>
                  <th>Refund Status</th>
                </tr>
              </thead>
              <tbody>
                {compensations?.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{c.bookingId}</td>
                    <td>{c.customer?.name}</td>
                    <td>₹{c.bookingAmount}</td>
                    <td style={{ maxWidth: '300px', fontSize: '0.85rem' }}>{c.issueReason}</td>
                    <td style={{ fontWeight: '800', color: '#7c3aed' }}>₹{c.compensationAmount}</td>
                    <td><StatusBadge status={c.approvalStatus} /></td>
                    <td><StatusBadge status={c.refundStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReportTab === 'insurance' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Booking ID</th>
                  <th>Policy Number</th>
                  <th>Provider</th>
                  <th>Coverage Ceiling</th>
                  <th>Claim Status</th>
                </tr>
              </thead>
              <tbody>
                {insurances?.map(i => (
                  <tr key={i._id}>
                    <td style={{ fontWeight: '600' }}>{i.customerName}</td>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{i.bookingId}</td>
                    <td><code>{i.policyNumber}</code></td>
                    <td>{i.insuranceProvider}</td>
                    <td>Up to ₹{(i.maxCoverageLimit || 500000).toLocaleString('en-IN')}</td>
                    <td><StatusBadge status={i.claimStatus === 'None' ? 'Active' : i.claimStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicReports;
