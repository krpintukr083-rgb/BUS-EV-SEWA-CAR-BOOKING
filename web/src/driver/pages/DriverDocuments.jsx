import React, { useState, useEffect } from 'react';
import { driverService } from '../../services/driverService';
import StatusBadge from '../../components/StatusBadge';
import { FileCheck, Shield, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

const DriverDocuments = () => {
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await driverService.getDocuments();
        if (res.success) {
          setDocs(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, []);

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading document verification records...</div>;
  }

  const { drivingLicence, rcDetails, vehicleInsurance, fitnessCertificate, requiredDriverDocuments } = docs || {};

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
            Driver Documents & Verification Status
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Official compliance documents verified by Super Admin for operating on the platform.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* 1. Driving Licence */}
        <div className="content-card" style={{ marginBottom: 0 }}>
          <div className="card-header-flex">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={20} color="#1d4ed8" />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Commercial Driving Licence</h3>
            </div>
            <StatusBadge status={drivingLicence?.status} />
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Licence Number:</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
            {drivingLicence?.number || 'DL-PENDING-SUBMISSION'}
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              fontSize: '0.825rem',
              color: '#475569'
            }}
          >
            {drivingLicence?.status === 'Approved' ? (
              <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                <CheckCircle2 size={16} /> Verified for Heavy & Light Commercial Transport
              </span>
            ) : (
              <span>Verification under review with RTO verification desk.</span>
            )}
          </div>
        </div>

        {/* 2. RC Details */}
        <div className="content-card" style={{ marginBottom: 0 }}>
          <div className="card-header-flex">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#1d4ed8" />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Registration Certificate (RC)</h3>
            </div>
            <StatusBadge status={rcDetails?.status} />
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>RC Number:</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
            {rcDetails?.number || 'N/A'}
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              fontSize: '0.825rem',
              color: '#475569'
            }}
          >
            {rcDetails?.details || 'Valid Commercial Vehicle Registration Permit'}
          </div>
        </div>

        {/* 3. Vehicle Insurance */}
        <div className="content-card" style={{ marginBottom: 0 }}>
          <div className="card-header-flex">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} color="#1d4ed8" />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Fleet Vehicle Insurance</h3>
            </div>
            <StatusBadge status={vehicleInsurance?.status} />
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Policy Number:</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>
            {vehicleInsurance?.policyNumber || 'N/A'}
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              fontSize: '0.825rem',
              color: '#475569'
            }}
          >
            Expiry Date: <strong>{vehicleInsurance?.expiryDetails}</strong>
          </div>
        </div>

        {/* 4. Fitness / Vehicle Check Certificate */}
        <div className="content-card" style={{ marginBottom: 0 }}>
          <div className="card-header-flex">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} color="#10b981" />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Vehicle Fitness Certificate</h3>
            </div>
            <StatusBadge status={fitnessCertificate?.status} />
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Inspection Status:</div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
            {fitnessCertificate?.details || 'Safety Certified'}
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              fontSize: '0.825rem',
              color: '#475569'
            }}
          >
            State Transport Department Annual Roadworthiness Safety Standard
          </div>
        </div>

        {/* 5. Required Driver Documents & Background Verification */}
        <div className="content-card" style={{ marginBottom: 0 }}>
          <div className="card-header-flex">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={20} color="#1d4ed8" />
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Driver Background Verification</h3>
            </div>
            <StatusBadge status={requiredDriverDocuments?.status} />
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Verification Status:</div>
          <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
            {requiredDriverDocuments?.status === 'Approved' ? 'Police & Address Verification Clear' : 'Pending Verification'}
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              fontSize: '0.825rem',
              color: '#475569'
            }}
          >
            Identity & Address Proof (Aadhaar / Voter ID) verified for passenger transit.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDocuments;
