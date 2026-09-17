import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { BarChart3, CalendarCheck, CreditCard, XOctagon, Percent, ShieldAlert, ShoppingBag, Truck, Building, DollarSign, CheckCircle2, Clock } from 'lucide-react';

const BasicReports = () => {
  const [reportData, setReportData] = useState(null);
  const [activeReportTab, setActiveReportTab] = useState('hireExpenses');
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
    return <div style={{ padding: '24px', color: '#64748b' }}>Generating platform audit and financial reports...</div>;
  }

  const { bookings, payments, cancellations, compensations, insurances, hireExpenses, hireSummary, ownTrips, thirdPartyTrips } = reportData || {};

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Financial, Fleet & Operational Reports</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Audited records for Third-Party Market Vehicle Hire expenses, Own vs Third-Party trips, bookings, customer payments, cancellations, and compensations.
          </p>
        </div>
      </div>

      {/* Top Financial KPI Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '14px 18px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #fed7aa', borderLeft: '4px solid #ea580c' }}>
          <div style={{ fontSize: '0.75rem', color: '#9a3412', fontWeight: '700', textTransform: 'uppercase' }}>Total Market Hire Expense</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ea580c', marginTop: '4px' }}>
            ₹{hireSummary?.totalThirdPartyHireExpense?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            {hireExpenses?.length || 0} Hired Vehicle Contracts
          </div>
        </div>

        <div style={{ padding: '14px 18px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: '700', textTransform: 'uppercase' }}>Pending Owner Payouts</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>
            ₹{hireSummary?.pendingThirdPartyPayments?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            {hireSummary?.pendingCount || 0} Pending Settlement
          </div>
        </div>

        <div style={{ padding: '14px 18px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Paid Owner Payouts</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
            ₹{hireSummary?.paidThirdPartyPayments?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            {hireSummary?.paidCount || 0} Settled
          </div>
        </div>

        <div style={{ padding: '14px 18px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: '700', textTransform: 'uppercase' }}>Own vs Third-Party Trips</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>
            {hireSummary?.ownVehicleTripsCount || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>Own</span> / {hireSummary?.thirdPartyVehicleTripsCount || 0} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#ea580c' }}>Hired</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            Total {bookings?.length || 0} Platform Trips
          </div>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveReportTab('hireExpenses')}
          className={`btn ${activeReportTab === 'hireExpenses' ? 'btn-primary' : 'btn-outline'}`}
          style={activeReportTab === 'hireExpenses' ? { backgroundColor: '#ea580c', borderColor: '#ea580c' } : {}}
        >
          <ShoppingBag size={16} /> 1. Third-Party Vehicle Hire Expenses ({hireExpenses?.length || 0})
        </button>
        <button
          onClick={() => setActiveReportTab('bookings')}
          className={`btn ${activeReportTab === 'bookings' ? 'btn-primary' : 'btn-outline'}`}
        >
          <CalendarCheck size={16} /> 2. Booking Records ({bookings?.length || 0})
        </button>
        <button
          onClick={() => setActiveReportTab('payments')}
          className={`btn ${activeReportTab === 'payments' ? 'btn-primary' : 'btn-outline'}`}
        >
          <CreditCard size={16} /> 3. Customer Payments ({payments?.length || 0})
        </button>
        <button
          onClick={() => setActiveReportTab('cancellations')}
          className={`btn ${activeReportTab === 'cancellations' ? 'btn-primary' : 'btn-outline'}`}
        >
          <XOctagon size={16} /> 4. Cancellations ({cancellations?.length || 0})
        </button>
        <button
          onClick={() => setActiveReportTab('compensations')}
          className={`btn ${activeReportTab === 'compensations' ? 'btn-primary' : 'btn-outline'}`}
        >
          <Percent size={16} /> 5. 3% Compensations ({compensations?.length || 0})
        </button>
        <button
          onClick={() => setActiveReportTab('insurance')}
          className={`btn ${activeReportTab === 'insurance' ? 'btn-primary' : 'btn-outline'}`}
        >
          <ShieldAlert size={16} /> 6. Insurances ({insurances?.length || 0})
        </button>
      </div>

      {/* Report Tables */}
      <div className="content-card">
        <div className="table-responsive">
          {/* TAB 1: THIRD-PARTY VEHICLE HIRE EXPENSES */}
          {activeReportTab === 'hireExpenses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#9a3412', margin: 0 }}>
                  Audited Third-Party & Market-Hired Vehicle Expense Ledger
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Recorded separately from company own-vehicle operating costs
                </span>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle Details</th>
                    <th>Vendor / Transporter</th>
                    <th>Hire Amount (₹)</th>
                    <th>Additional Exp.</th>
                    <th>Total Expense</th>
                    <th>Payment Status</th>
                    <th>Payment Ref / Date</th>
                    <th>Trip / Route Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {hireExpenses && hireExpenses.length > 0 ? (
                    hireExpenses.map(exp => (
                      <tr key={exp._id}>
                        <td>
                          <div style={{ fontWeight: '700', color: '#ea580c' }}>
                            {exp.vehicleNumber || exp.vehicle?.vehicleNumber || 'Market Vehicle'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {exp.vehicleType || exp.vehicle?.vehicleType || 'Truck'} • {exp.loadCapacity || exp.vehicle?.loadCapacity || 'Freight'}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{exp.vendorName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{exp.vendorMobile || 'N/A'}</div>
                        </td>

                        <td style={{ fontWeight: '700', color: '#0f172a' }}>
                          ₹{exp.hireAmount?.toLocaleString()}
                        </td>

                        <td style={{ color: '#64748b' }}>
                          ₹{exp.additionalExpense || 0}
                        </td>

                        <td style={{ fontWeight: '800', color: '#ea580c', fontSize: '0.95rem' }}>
                          ₹{exp.totalAmount?.toLocaleString()}
                        </td>

                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              backgroundColor: exp.paymentStatus === 'Paid' ? '#dcfce7' : '#fef3c7',
                              color: exp.paymentStatus === 'Paid' ? '#15803d' : '#b45309'
                            }}
                          >
                            {exp.paymentStatus === 'Paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            {exp.paymentStatus}
                          </span>
                        </td>

                        <td style={{ fontSize: '0.8rem' }}>
                          <div><code>{exp.paymentReference || 'Unsettled'}</code></div>
                          {exp.paymentDate && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {new Date(exp.paymentDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        <td style={{ fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: '600' }}>{exp.tripReference || (exp.booking ? exp.booking.bookingId : 'General Hire')}</div>
                          {(exp.pickup || exp.destination) && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {exp.pickup} → {exp.destination}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        No third-party vehicle hire expenses recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: BOOKING RECORDS */}
          {activeReportTab === 'bookings' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Source & Service</th>
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
                    <td>
                      <div>{b.serviceType}</div>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', color: b.vehicleSource === 'THIRD_PARTY' ? '#ea580c' : '#1e40af' }}>
                        {b.vehicleSource === 'THIRD_PARTY' ? '[MARKET HIRED]' : '[OWN FLEET]'}
                      </span>
                    </td>
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

          {/* TAB 3: CUSTOMER PAYMENTS */}
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

          {/* TAB 4: CANCELLATIONS */}
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
                    <td>{c.cancellationReason}</td>
                    <td style={{ fontWeight: '700', color: '#10b981' }}>₹{c.refundAmount}</td>
                    <td><StatusBadge status={c.refundStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 5: 3% COMPENSATIONS */}
          {activeReportTab === 'compensations' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Glitch Reason</th>
                  <th>3% Compensation</th>
                  <th>Approval Status</th>
                  <th>Refund Status</th>
                </tr>
              </thead>
              <tbody>
                {compensations?.map(comp => (
                  <tr key={comp._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{comp.bookingId}</td>
                    <td>{comp.customer?.name} ({comp.customer?.phone})</td>
                    <td>{comp.glitchReason}</td>
                    <td style={{ fontWeight: '700', color: '#10b981' }}>₹{comp.compensationAmount}</td>
                    <td><StatusBadge status={comp.approvalStatus} /></td>
                    <td><StatusBadge status={comp.refundStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 6: ACCIDENT INSURANCE */}
          {activeReportTab === 'insurance' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Policy ID</th>
                  <th>Booking ID</th>
                  <th>Insured Person</th>
                  <th>Max Coverage</th>
                  <th>Claim Status</th>
                  <th>Active Status</th>
                </tr>
              </thead>
              <tbody>
                {insurances?.map(ins => (
                  <tr key={ins._id}>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{ins.policyId}</td>
                    <td>{ins.bookingId}</td>
                    <td>{ins.insuredPerson?.name} ({ins.insuredPerson?.phone})</td>
                    <td style={{ fontWeight: '700', color: '#10b981' }}>₹{ins.coverageAmount?.toLocaleString()}</td>
                    <td><StatusBadge status={ins.claimStatus} /></td>
                    <td><StatusBadge status={ins.activeStatus} /></td>
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
