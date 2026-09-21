import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import StatusBadge from '../components/StatusBadge';
import {
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  FileCheck,
  Eye,
  Search,
  ExternalLink,
  FileText,
  Clock,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://bus-ev-sewa-car-booking.onrender.com/api';
const SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return `${SERVER_URL}${url}`;
  return `${SERVER_URL}/${url}`;
};

const DriverVerification = () => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetDocKey, setTargetDocKey] = useState(null);
  const [targetDocTitle, setTargetDocTitle] = useState('');
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [modalError, setModalError] = useState('');

  // Document Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const fetchDrivers = async () => {
    try {
      const res = await adminService.getDrivers();
      if (res.success || Array.isArray(res.data)) {
        const list = res.data || res;
        setDrivers(list);
        if (list.length > 0) {
          if (selectedDriver) {
            const updated = list.find(d => d._id === selectedDriver._id);
            if (updated) setSelectedDriver(updated);
            else setSelectedDriver(list[0]);
          } else {
            setSelectedDriver(list[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error loading drivers for verification:', err);
      if (err.response?.status === 403) {
        setError('Access restricted (HTTP 403): Super Admin privileges required. Please sign in with an official admin account.');
      } else {
        setError('Failed to load drivers for verification. Please check network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const selectDriverForReview = (driver) => {
    setSelectedDriver(driver);
    setMessage('');
    setError('');
  };

  const handleViewDocument = (doc) => {
    if (!doc.url || doc.url.trim() === '') return;
    const fullUrl = getImageUrl(doc.url);
    const isPdf = doc.url.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    } else {
      setPreviewDoc({
        ...doc,
        fullUrl,
        isPdf
      });
      setPreviewModalOpen(true);
    }
  };

  const handleApproveDocument = async (docKey, docTitle) => {
    if (!selectedDriver) return;
    setActionLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await adminService.verifyDriverDocuments(selectedDriver._id, {
        docType: docKey,
        status: 'Approved'
      });

      if (res.success || res.data) {
        setMessage(`${docTitle} approved successfully!`);
        await fetchDrivers();
      } else {
        setError(res.message || 'Failed to approve document');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to approve document');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectModal = (docKey, docTitle) => {
    setTargetDocKey(docKey);
    setTargetDocTitle(docTitle);
    setRejectionReasonText('');
    setModalError('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionReasonText || !rejectionReasonText.trim()) {
      setModalError('Please enter a valid rejection reason for the driver.');
      return;
    }

    setActionLoading(true);
    setModalError('');
    try {
      const res = await adminService.verifyDriverDocuments(selectedDriver._id, {
        docType: targetDocKey,
        status: 'Rejected',
        rejectionReason: rejectionReasonText.trim()
      });

      if (res.success || res.data) {
        setMessage(`${targetDocTitle} rejected. Reason saved to MongoDB.`);
        setRejectModalOpen(false);
        await fetchDrivers();
      } else {
        setModalError(res.message || 'Could not reject document');
      }
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || 'Could not reject document');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to determine document compliance badge status
  const getDocStatus = (statusStr) => {
    const s = (statusStr || 'Pending').toUpperCase();
    if (s === 'APPROVED' || s === 'VERIFIED') return { label: 'Approved', class: 'badge-success', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
    if (s === 'REJECTED') return { label: 'Rejected', class: 'badge-danger', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    return { label: 'Pending Review', class: 'badge-warning', bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
  };

  // Filtered drivers list
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch =
      (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.mobileNumber || '').includes(searchQuery) ||
      (d.user?.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const hasPending =
      d.citizenshipStatus === 'Pending' ||
      d.drivingLicenceStatus === 'Pending' ||
      d.rcStatus === 'Pending' ||
      d.insuranceStatus === 'Pending' ||
      d.fitnessStatus === 'Pending';

    const hasRejected =
      d.citizenshipStatus === 'Rejected' ||
      d.drivingLicenceStatus === 'Rejected' ||
      d.rcStatus === 'Rejected' ||
      d.insuranceStatus === 'Rejected' ||
      d.fitnessStatus === 'Rejected';

    if (statusFilter === 'Pending') return hasPending;
    if (statusFilter === 'Rejected') return hasRejected;
    if (statusFilter === 'Approved') return !hasPending && !hasRejected;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
        <Clock size={24} style={{ marginBottom: '8px' }} />
        <div>Loading Driver Verification Desks & Documents...</div>
      </div>
    );
  }

  // Define 5 KYC Documents list configuration
  const documentConfigs = selectedDriver ? [
    {
      key: 'citizenship',
      title: '1. Citizenship Certificate / National ID',
      docNum: selectedDriver.citizenshipNumber || selectedDriver.documents?.citizenship?.documentNumber || 'Not submitted',
      issueDate: selectedDriver.citizenshipIssueDate || selectedDriver.documents?.citizenship?.issueDate || selectedDriver.documents?.citizenship?.citizenshipIssueDate || 'Not specified',
      url: selectedDriver.citizenshipDocFront || selectedDriver.citizenshipDoc || selectedDriver.documents?.citizenship?.url || selectedDriver.documents?.citizenship?.docFront,
      docFront: selectedDriver.citizenshipDocFront || selectedDriver.citizenshipDoc || selectedDriver.documents?.citizenship?.docFront || selectedDriver.documents?.citizenship?.url,
      docBack: selectedDriver.citizenshipDocBack || selectedDriver.documents?.citizenship?.docBack,
      status: selectedDriver.citizenshipStatus || selectedDriver.documents?.citizenship?.status || 'Pending'
    },
    {
      key: 'drivingLicence',
      title: '2. Commercial Driving Licence',
      docNum: selectedDriver.drivingLicenceNumber || selectedDriver.documents?.drivingLicence?.documentNumber || selectedDriver.documents?.drivingLicense?.documentNumber || 'Not submitted',
      expiry: selectedDriver.drivingLicenceExpiry || selectedDriver.documents?.drivingLicence?.expiryDate || selectedDriver.documents?.drivingLicense?.expiryDate || '2028-12-31',
      url: selectedDriver.drivingLicenceDoc || selectedDriver.drivingLicenseDoc || selectedDriver.documents?.drivingLicence?.url || selectedDriver.documents?.drivingLicence?.fileUrl || selectedDriver.documents?.drivingLicense?.url || selectedDriver.documents?.drivingLicense?.fileUrl,
      status: selectedDriver.drivingLicenceStatus || selectedDriver.documents?.drivingLicence?.status || selectedDriver.documents?.drivingLicense?.status || 'Pending'
    },
    {
      key: 'rc',
      title: '3. Vehicle Registration Certificate (Blue Book / RC)',
      docNum: selectedDriver.rcNumber || selectedDriver.documents?.rc?.documentNumber || selectedDriver.documents?.vehicleRc?.documentNumber || 'Not submitted',
      expiry: selectedDriver.rcExpiry || selectedDriver.documents?.rc?.expiryDate || selectedDriver.documents?.vehicleRc?.expiryDate || '2029-06-30',
      url: selectedDriver.rcDoc || selectedDriver.vehicleRcDoc || selectedDriver.documents?.rc?.url || selectedDriver.documents?.rc?.fileUrl || selectedDriver.documents?.vehicleRc?.url || selectedDriver.documents?.vehicleRc?.fileUrl,
      status: selectedDriver.rcStatus || selectedDriver.documents?.rc?.status || selectedDriver.documents?.vehicleRc?.status || 'Pending'
    },
    {
      key: 'insurance',
      title: '4. Commercial Vehicle Insurance Policy',
      docNum: selectedDriver.insurancePolicyNumber || selectedDriver.documents?.insurance?.documentNumber || 'Not submitted',
      expiry: selectedDriver.insuranceExpiryDetails || selectedDriver.documents?.insurance?.expiryDate || '2026-12-31',
      url: selectedDriver.insuranceDoc || selectedDriver.documents?.insurance?.url || selectedDriver.documents?.insurance?.fileUrl,
      status: selectedDriver.insuranceStatus || selectedDriver.documents?.insurance?.status || 'Pending'
    },
    {
      key: 'fitness',
      title: '5. State Fitness Certificate / Vehicle Safety Permit',
      docNum: selectedDriver.fitnessDetails || selectedDriver.documents?.fitness?.documentNumber || selectedDriver.documents?.fitnessCertificate?.documentNumber || 'Not submitted',
      expiry: selectedDriver.fitnessExpiry || selectedDriver.documents?.fitness?.expiryDate || selectedDriver.documents?.fitnessCertificate?.expiryDate || '2027-03-31',
      url: selectedDriver.fitnessDoc || selectedDriver.fitnessCertificateDoc || selectedDriver.documents?.fitness?.url || selectedDriver.documents?.fitness?.fileUrl || selectedDriver.documents?.fitnessCertificate?.url || selectedDriver.documents?.fitnessCertificate?.fileUrl,
      status: selectedDriver.fitnessStatus || selectedDriver.documents?.fitness?.status || selectedDriver.documents?.fitnessCertificate?.status || 'Pending'
    },
    {
      key: 'routePermit',
      title: '6. Route Permit',
      description: selectedDriver.routePermitDescription || selectedDriver.routePermit?.description || selectedDriver.documents?.routePermit?.description || selectedDriver.documents?.routePermit?.documentNumber || 'Not submitted',
      docNum: selectedDriver.routePermitDescription || selectedDriver.routePermit?.description || selectedDriver.documents?.routePermit?.description || selectedDriver.documents?.routePermit?.documentNumber || 'Not submitted',
      url: selectedDriver.routePermitDoc || selectedDriver.routePermit?.document || selectedDriver.documents?.routePermit?.url || selectedDriver.documents?.routePermit?.fileUrl,
      status: selectedDriver.routePermitStatus || selectedDriver.routePermit?.status || selectedDriver.documents?.routePermit?.status || 'Not Submitted'
    }
  ] : [];

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* Header */}
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={26} color="#0A66C2" /> Driver KYC Verification Desk
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Inspect uploaded driver compliance documents, verify authenticity, and approve/reject credentials with audit feedback.
          </p>
        </div>
      </div>

      {message && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Check size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px' }}>
        {/* Left Column: Driver Selection List */}
        <div className="content-card" style={{ padding: '16px', height: 'fit-content', maxHeight: '820px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 10px 0', color: '#0f172a' }}>Drivers Queue ({drivers.length})</h3>
            
            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search driver by name, phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.82rem', height: '34px' }}
              />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: statusFilter === f ? '#0A66C2' : '#cbd5e1',
                    backgroundColor: statusFilter === f ? '#0A66C2' : '#f8fafc',
                    color: statusFilter === f ? '#ffffff' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {filteredDrivers.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                No drivers match the filter.
              </div>
            ) : (
              filteredDrivers.map(d => {
                const isSelected = selectedDriver?._id === d._id;
                const hasPending =
                  d.citizenshipStatus === 'Pending' ||
                  d.drivingLicenceStatus === 'Pending' ||
                  d.rcStatus === 'Pending' ||
                  d.insuranceStatus === 'Pending' ||
                  d.fitnessStatus === 'Pending' ||
                  d.routePermitStatus === 'Pending' || d.routePermitStatus === 'Pending Verification';

                const hasRejected =
                  d.citizenshipStatus === 'Rejected' ||
                  d.drivingLicenceStatus === 'Rejected' ||
                  d.rcStatus === 'Rejected' ||
                  d.insuranceStatus === 'Rejected' ||
                  d.fitnessStatus === 'Rejected' ||
                  d.routePermitStatus === 'Rejected';

                return (
                  <div
                    key={d._id}
                    onClick={() => selectDriverForReview(d)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(10, 102, 194, 0.08)' : '#f8fafc',
                      border: `1.5px solid ${isSelected ? '#0A66C2' : '#e2e8f0'}`,
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <img
                      src={getImageUrl(d.driverPhoto || d.profilePhoto)}
                      alt={d.name}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        flexShrink: 0
                      }}
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=100&q=80';
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.88rem', color: isSelected ? '#0A66C2' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {d.name}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                        {d.mobileNumber}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                        {hasRejected ? (
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#dc2626', backgroundColor: '#fef2f2', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                            REJECTED
                          </span>
                        ) : hasPending ? (
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#d97706', backgroundColor: '#fffbeb', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                            PENDING KYC
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#059669', backgroundColor: '#ecfdf5', padding: '1px 6px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                            VERIFIED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Driver Detailed Information & Document Verification Workspace */}
        {selectedDriver ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* DRIVER INFORMATION Header Card */}
            <div className="content-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <img
                    src={getImageUrl(selectedDriver.driverPhoto || selectedDriver.profilePhoto)}
                    alt={selectedDriver.name}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #0A66C2',
                      backgroundColor: '#f8fafc'
                    }}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80';
                    }}
                  />
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      {selectedDriver.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: '#475569', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={13} color="#64748b" /> {selectedDriver.mobileNumber}</span>
                      {selectedDriver.user?.email && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={13} color="#64748b" /> {selectedDriver.user.email}</span>
                      )}
                      {selectedDriver.address && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} color="#64748b" /> {selectedDriver.address}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>OVERALL COMPLIANCE</div>
                  <StatusBadge status={selectedDriver.driverStatus} />
                </div>
              </div>

              {selectedDriver.emergencyContact && selectedDriver.emergencyContact.name && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '0.78rem', color: '#64748b' }}>
                  <strong>Emergency Contact:</strong> {selectedDriver.emergencyContact.name} ({selectedDriver.emergencyContact.phone}) - {selectedDriver.emergencyContact.relation}
                </div>
              )}
            </div>

            {/* DOCUMENTS REVIEW SECTION */}
            <div className="content-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileCheck size={18} color="#0A66C2" /> Uploaded KYC Credentials & Documents ({documentConfigs.length})
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {documentConfigs.map((doc) => {
                  const statusInfo = getDocStatus(doc.status);
                  const hasFile = doc.url && doc.url.trim() !== '';

                  return (
                    <div
                      key={doc.key}
                      style={{
                        border: `1.5px solid ${statusInfo.border}`,
                        borderRadius: '12px',
                        padding: '16px',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        {/* Doc Details */}
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h5 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                              {doc.title}
                            </h5>
                            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: statusInfo.text, backgroundColor: statusInfo.bg, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${statusInfo.border}` }}>
                              {statusInfo.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.82rem', color: '#475569' }}>
                            {doc.key === 'routePermit' ? (
                              <div>
                                <span style={{ color: '#94a3b8' }}>Description: </span>
                                <span style={{ fontWeight: '600', color: '#0f172a' }}>{doc.description || doc.docNum}</span>
                              </div>
                            ) : doc.key === 'citizenship' ? (
                              <>
                                <div>
                                  <span style={{ color: '#94a3b8' }}>Citizenship Number: </span>
                                  <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', color: '#0f172a' }}>
                                    {doc.docNum}
                                  </code>
                                </div>
                                <div>
                                  <span style={{ color: '#94a3b8' }}>Issue Date: </span>
                                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{doc.issueDate}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <span style={{ color: '#94a3b8' }}>Doc No: </span>
                                  <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', color: '#0f172a' }}>
                                    {doc.docNum}
                                  </code>
                                </div>
                                <div>
                                  <span style={{ color: '#94a3b8' }}>Expiry Date: </span>
                                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{doc.expiry}</span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Rejection Note Display if rejected */}
                          {doc.status?.toLowerCase() === 'rejected' && selectedDriver.rejectionReason && (
                            <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <AlertTriangle size={14} />
                              <span><strong>Admin Rejection Reason:</strong> {selectedDriver.rejectionReason}</span>
                            </div>
                          )}
                        </div>

                        {/* File Preview & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {/* View Document / Document Not Uploaded Buttons */}
                          {doc.key === 'citizenship' ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {doc.docFront ? (
                                <button
                                  type="button"
                                  onClick={() => handleViewDocument({ ...doc, fullUrl: getImageUrl(doc.docFront), title: 'Citizenship Certificate - Front Side' })}
                                  className="btn btn-sm btn-outline"
                                  style={{
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#0A66C2',
                                    borderColor: '#0A66C2',
                                    backgroundColor: 'rgba(10, 102, 194, 0.05)',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Eye size={14} /> Front Side
                                </button>
                              ) : null}
                              {doc.docBack ? (
                                <button
                                  type="button"
                                  onClick={() => handleViewDocument({ ...doc, fullUrl: getImageUrl(doc.docBack), title: 'Citizenship Certificate - Back Side' })}
                                  className="btn btn-sm btn-outline"
                                  style={{
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    color: '#0A66C2',
                                    borderColor: '#0A66C2',
                                    backgroundColor: 'rgba(10, 102, 194, 0.05)',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Eye size={14} /> Back Side
                                </button>
                              ) : null}
                              {!doc.docFront && !doc.docBack && (
                                <button
                                  type="button"
                                  disabled
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    cursor: 'not-allowed'
                                  }}
                                >
                                  Document Not Uploaded
                                </button>
                              )}
                            </div>
                          ) : (
                            hasFile ? (
                              <button
                                type="button"
                                onClick={() => handleViewDocument(doc)}
                                className="btn btn-sm btn-outline"
                                style={{
                                  fontSize: '0.78rem',
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  color: '#0A66C2',
                                  borderColor: '#0A66C2',
                                  backgroundColor: 'rgba(10, 102, 194, 0.05)',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Eye size={14} /> View Document
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  color: '#94a3b8',
                                  backgroundColor: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  cursor: 'not-allowed'
                                }}
                              >
                                Document Not Uploaded
                              </button>
                            )
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleApproveDocument(doc.key, doc.title)}
                              className={`btn btn-sm ${doc.status?.toLowerCase() === 'approved' ? 'btn-success' : 'btn-outline'}`}
                              disabled={actionLoading}
                              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(doc.key, doc.title)}
                              className={`btn btn-sm ${doc.status?.toLowerCase() === 'rejected' ? 'btn-danger' : 'btn-outline'}`}
                              disabled={actionLoading}
                              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="content-card" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
            Select a driver from the left list to inspect KYC details and document files.
          </div>
        )}
      </div>

      {/* REJECTION REASON MODAL */}
      {rejectModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#dc2626', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} /> Reject Document Compliance
              </h3>
              <button onClick={() => setRejectModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: 0, marginBottom: '16px' }}>
              Rejecting <strong>{targetDocTitle}</strong> for driver <strong>{selectedDriver?.name}</strong>. Please provide a clear rejection reason for the driver.
            </p>

            {modalError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '14px' }}>
                {modalError}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Rejection Reason / Compliance Notes *
              </label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="e.g. Image blurry, License expired, Details mismatch with citizenship record..."
                value={rejectionReasonText}
                onChange={e => setRejectionReasonText(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setRejectModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmReject}
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewModalOpen && previewDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '750px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#0A66C2" /> {previewDoc.title}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  Driver: <strong>{selectedDriver?.name}</strong> ({selectedDriver?.mobileNumber}) | Doc No: <code>{previewDoc.docNum}</code>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a
                  href={previewDoc.fullUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline"
                  style={{ fontSize: '0.75rem', padding: '4px 10px', textDecoration: 'none', color: '#0A66C2', borderColor: '#0A66C2', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ExternalLink size={13} /> Open Full Tab
                </a>
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '4px' }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Modal Image Display */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
              <img
                src={previewDoc.fullUrl}
                alt={previewDoc.title}
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                onError={e => {
                  e.target.onerror = null;
                  setError('Could not load document preview image.');
                }}
              />
            </div>

            {/* Modal Footer with Actions */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Current Compliance Status: <strong>{previewDoc.status}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  onClick={() => {
                    setPreviewModalOpen(false);
                    handleApproveDocument(previewDoc.key, previewDoc.title);
                  }}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  <Check size={14} /> Approve Document
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    setPreviewModalOpen(false);
                    handleOpenRejectModal(previewDoc.key, previewDoc.title);
                  }}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  <X size={14} /> Reject Document
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setPreviewModalOpen(false)}
                  style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverVerification;
