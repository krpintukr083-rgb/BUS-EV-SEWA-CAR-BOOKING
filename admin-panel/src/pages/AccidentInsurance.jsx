import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { ShieldAlert, ShieldCheck, AlertCircle, Check } from 'lucide-react';

const AccidentInsurance = () => {
  const [records, setRecords] = useState([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchInsurance = async () => {
    try {
      const res = await adminService.getInsuranceRecords();
      if (res.success) {
        setRecords(res.data);
        setDisclaimer(res.disclaimer);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsurance();
  }, []);

  const handleClaimStatusChange = async (id, claimStatus) => {
    try {
      const res = await adminService.updateInsuranceClaim(id, { claimStatus });
      if (res.success) {
        setMessage('Insurance claim status updated');
        await fetchInsurance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading accident insurance policies...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Transit Accident Insurance Records</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Underwritten passenger safety coverage logs and claim verification pipeline.
          </p>
        </div>
      </div>

      {/* Mandatory Statutory Disclaimer Box */}
      <div className="disclaimer-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', marginBottom: '4px' }}>
          <ShieldAlert size={18} color="#1d4ed8" />
          <span>Statutory Insurance Disclaimer</span>
        </div>
        <div>
          {disclaimer ||
            'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.'}
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

      {/* Table */}
      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Booking ID</th>
                <th>Policy Number</th>
                <th>Underwriting Provider</th>
                <th>Max Policy Ceiling</th>
                <th>Policy Status</th>
                <th>Claim Status</th>
                <th>Update Claim Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map(r => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{r.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.customerPhone}</div>
                    </td>
                    <td style={{ fontWeight: '700', color: '#1d4ed8' }}>{r.bookingId}</td>
                    <td>
                      <code>{r.policyNumber}</code>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{r.insuranceProvider}</td>
                    <td style={{ fontWeight: '700', color: '#0369a1' }}>
                      Up to ₹{(r.maxCoverageLimit || 500000).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <StatusBadge status={r.activeStatus} />
                    </td>
                    <td>
                      <StatusBadge status={r.claimStatus === 'None' ? 'Active' : r.claimStatus} />
                    </td>
                    <td>
                      <select
                        className="form-control"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                        value={r.claimStatus}
                        onChange={e => handleClaimStatusChange(r._id, e.target.value)}
                      >
                        <option value="None">None (Normal)</option>
                        <option value="Filed">Filed</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No accident insurance records found.
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

export default AccidentInsurance;
