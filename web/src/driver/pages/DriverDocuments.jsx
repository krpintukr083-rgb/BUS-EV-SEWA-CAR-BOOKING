import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import {
  FileCheck,
  Shield,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  Clock,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';

const DriverDocuments = () => {
  const { t } = useLanguage();
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(null); // { docType, title }
  const [docNumberInput, setDocNumberInput] = useState('');
  const [docUrlInput, setDocUrlInput] = useState('');
  const [expiryInput, setExpiryInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/driver/documents');
      if (res.data.success) {
        setDocData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error fetching driver documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleOpenUpload = (doc) => {
    setUploadModal(doc);
    setDocNumberInput(doc.documentNumber !== 'N/A' ? doc.documentNumber : '');
    setDocUrlInput(doc.docUrl || '');
    setExpiryInput(doc.expiryDate !== 'N/A' ? doc.expiryDate : '');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSubmitUpload = async (e) => {
    e.preventDefault();
    if (!docUrlInput) {
      setErrorMsg('Document Image/File URL is required.');
      return;
    }

    setActionLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.post('/driver/documents', {
        docType: uploadModal.key,
        documentNumber: docNumberInput,
        docUrl: docUrlInput,
        expiryDate: expiryInput
      });

      if (res.data.success) {
        setSuccessMsg(`${uploadModal.type} updated and submitted for review.`);
        setUploadModal(null);
        fetchDocs();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error updating document.');
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

  const documents = docData?.documents || [];

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '24px', fontWeight: '800' }}>
            {t('driverDocuments')}
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            Official compliance KYC documents verified by Super Admin for operating on the platform.
          </p>
        </div>
        <button
          onClick={fetchDocs}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#334155',
            color: '#e2e8f0',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Document Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {documents.map((doc) => {
          const { isExpired, isExpiringSoon, daysRemaining } = doc.expiryInfo || {};

          return (
            <div
              key={doc.key}
              style={{
                backgroundColor: '#1e293b',
                border: isExpired ? '2px solid #ef4444' : isExpiringSoon ? '2px solid #f59e0b' : '1px solid #334155',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileCheck size={20} color="#38bdf8" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: '700' }}>
                      {doc.type}
                    </h3>
                    <div style={{ color: '#64748b', fontSize: '12px' }}>
                      Doc ID: {doc.documentNumber}
                    </div>
                  </div>
                </div>
                <StatusBadge status={doc.status} />
              </div>

              {/* Expiry Warning Badge */}
              <div
                style={{
                  backgroundColor: isExpired ? 'rgba(239, 68, 68, 0.15)' : isExpiringSoon ? 'rgba(245, 158, 11, 0.15)' : '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isExpired ? '#fca5a5' : isExpiringSoon ? '#fbbf24' : '#94a3b8' }}>
                  <Clock size={15} />
                  <span>Expiry: {doc.expiryDate}</span>
                </div>
                {isExpired && (
                  <span style={{ color: '#ef4444', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase' }}>
                    EXPIRED
                  </span>
                )}
                {isExpiringSoon && !isExpired && (
                  <span style={{ color: '#f59e0b', fontWeight: '700', fontSize: '11px' }}>
                    Expires in {daysRemaining} days
                  </span>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => handleOpenUpload(doc)}
                style={{
                  backgroundColor: '#334155',
                  color: '#e2e8f0',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: 'auto'
                }}
              >
                <Upload size={14} />
                <span>Upload / Replace Document</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '18px' }}>
              Upload / Replace {uploadModal.type}
            </h3>

            <form onSubmit={handleSubmitUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>
                  Document Identification Number
                </label>
                <input
                  type="text"
                  value={docNumberInput}
                  onChange={(e) => setDocNumberInput(e.target.value)}
                  placeholder="e.g. DL-0420180059124"
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>
                  Document Image / Scan URL
                </label>
                <input
                  type="url"
                  value={docUrlInput}
                  onChange={(e) => setDocUrlInput(e.target.value)}
                  placeholder="https://..."
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', marginBottom: '6px', fontWeight: '600' }}>
                  Document Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryInput}
                  onChange={(e) => setExpiryInput(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUploadModal(null)}
                  style={{
                    backgroundColor: '#334155',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Uploading...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDocuments;
