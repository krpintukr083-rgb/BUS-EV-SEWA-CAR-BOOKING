import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { ShieldCheck, Check, X, AlertCircle, FileCheck, Eye } from 'lucide-react';

const DriverVerification = () => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Verification state for selected driver
  const [dlStatus, setDlStatus] = useState('Approved');
  const [rcStatus, setRcStatus] = useState('Approved');
  const [insuranceStatus, setInsuranceStatus] = useState('Approved');
  const [fitnessStatus, setFitnessStatus] = useState('Approved');
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchDrivers = async () => {
    try {
      const res = await adminService.getDrivers();
      if (res.success) {
        setDrivers(res.data);
        if (res.data.length > 0 && !selectedDriver) {
          selectDriverForReview(res.data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const selectDriverForReview = driver => {
    setSelectedDriver(driver);
    setDlStatus(driver.drivingLicenceStatus);
    setRcStatus(driver.rcStatus);
    setInsuranceStatus(driver.insuranceStatus);
    setFitnessStatus(driver.fitnessStatus);
    setRejectionReason(driver.rejectionReason || '');
    setMessage('');
    setError('');
  };

  const handleSaveVerification = async () => {
    if (!selectedDriver) return;
    setActionLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await adminService.verifyDriverDocuments(selectedDriver._id, {
        drivingLicenceStatus: dlStatus,
        rcStatus: rcStatus,
        insuranceStatus: insuranceStatus,
        fitnessStatus: fitnessStatus,
        rejectionReason: rejectionReason
      });

      if (res.success) {
        setMessage(`Verification updated for ${selectedDriver.name}!`);
        await fetchDrivers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update verification status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading verification records...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Driver Document Verification Desk</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Review and approve/reject Driver Licence, RC, Vehicle Insurance, and State Fitness compliance.
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

      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        {/* Driver Selection List */}
        <div className="content-card" style={{ padding: '16px', maxHeight: '720px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '12px' }}>Drivers for Verification</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {drivers.map(d => {
              const isSelected = selectedDriver?._id === d._id;
              const hasPending =
                d.drivingLicenceStatus === 'Pending' ||
                d.rcStatus === 'Pending' ||
                d.insuranceStatus === 'Pending' ||
                d.fitnessStatus === 'Pending';

              return (
                <div
                  key={d._id}
                  onClick={() => selectDriverForReview(d)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                    border: `1px solid ${isSelected ? '#93c5fd' : '#e2e8f0'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                      {d.name}
                    </span>
                    {hasPending ? (
                      <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>
                        Pending
                      </span>
                    ) : (
                      <StatusBadge status={d.drivingLicenceStatus} />
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    DL: {d.drivingLicenceNumber}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verification Review & Approval Workspace */}
        {selectedDriver ? (
          <div className="content-card">
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Reviewing: {selectedDriver.name}</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Mobile: {selectedDriver.mobileNumber} | Status: <StatusBadge status={selectedDriver.driverStatus} />
                </p>
              </div>
            </div>

            {/* Document Checklist Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. Driving Licence */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>1. Commercial Driving Licence</strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Licence No: <code>{selectedDriver.drivingLicenceNumber}</code>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setDlStatus('Approved')}
                      className={`btn btn-sm ${dlStatus === 'Approved' ? 'btn-success' : 'btn-outline'}`}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setDlStatus('Rejected')}
                      className={`btn btn-sm ${dlStatus === 'Rejected' ? 'btn-danger' : 'btn-outline'}`}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Registration Certificate (RC) */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>2. Vehicle Registration Certificate (RC)</strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      RC No: <code>{selectedDriver.rcNumber || 'Pending Link'}</code> • {selectedDriver.rcDetails}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setRcStatus('Approved')}
                      className={`btn btn-sm ${rcStatus === 'Approved' ? 'btn-success' : 'btn-outline'}`}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setRcStatus('Rejected')}
                      className={`btn btn-sm ${rcStatus === 'Rejected' ? 'btn-danger' : 'btn-outline'}`}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Vehicle Insurance */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>3. Vehicle Fleet Insurance</strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Policy: <code>{selectedDriver.insurancePolicyNumber || 'N/A'}</code> • Expiry: {selectedDriver.insuranceExpiryDetails}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setInsuranceStatus('Approved')}
                      className={`btn btn-sm ${insuranceStatus === 'Approved' ? 'btn-success' : 'btn-outline'}`}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsuranceStatus('Rejected')}
                      className={`btn btn-sm ${insuranceStatus === 'Rejected' ? 'btn-danger' : 'btn-outline'}`}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Fitness / Vehicle Check Certificate */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>4. State Fitness / Vehicle Safety Certificate</strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Details: {selectedDriver.fitnessDetails}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setFitnessStatus('Approved')}
                      className={`btn btn-sm ${fitnessStatus === 'Approved' ? 'btn-success' : 'btn-outline'}`}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setFitnessStatus('Rejected')}
                      className={`btn btn-sm ${fitnessStatus === 'Rejected' ? 'btn-danger' : 'btn-outline'}`}
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                </div>
              </div>

              {/* Rejection / Compliance Note */}
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">Compliance Notes / Rejection Remarks (If Any)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="State reason if rejecting any compliance document..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={handleSaveVerification}
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  <ShieldCheck size={16} /> {actionLoading ? 'Saving...' : 'Confirm Verification Decisions'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="content-card">Select a driver from the left list.</div>
        )}
      </div>
    </div>
  );
};

export default DriverVerification;
