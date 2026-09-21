import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { Image as ImageIcon, CheckCircle2, AlertCircle, Upload, Percent, Save, RefreshCw } from 'lucide-react';

const BannerManagement = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [discountStatus, setDiscountStatus] = useState('active');
  const [discountPercentage, setDiscountPercentage] = useState(15);
  const [offerTitle, setOfferTitle] = useState('Travel Nepal With TravelSewa');
  const [offerSubtitle, setOfferSubtitle] = useState('Book your journey today with verified luxury fleet');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [lastUpdatedBy, setLastUpdatedBy] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getBusOffer();
      if (res && res.success && res.data) {
        const data = res.data;
        setDiscountStatus(data.offerStatus || data.discountStatus || 'active');
        setDiscountPercentage(data.discountPercentage !== undefined ? data.discountPercentage : 15);
        setOfferTitle(data.offerTitle || 'Travel Nepal With TravelSewa');
        setOfferSubtitle(data.offerSubtitle || 'Book your journey today with verified luxury fleet');
        setImagePreview(data.bannerImage || data.imageUrl || '');
        setLastUpdatedBy(data.lastUpdatedBy || 'Super Admin');
        setUpdatedAt(data.updatedAt || '');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg('');

      const formData = new FormData();
      formData.append('discountStatus', discountStatus);
      formData.append('offerStatus', discountStatus);
      formData.append('discountPercentage', discountPercentage);
      formData.append('offerTitle', offerTitle);
      formData.append('offerSubtitle', offerSubtitle);

      if (imageFile) {
        formData.append('image', imageFile);
      } else if (imagePreview) {
        formData.append('imageUrl', imagePreview);
      }

      const res = await adminService.updateBusOffer(formData);
      if (res && res.success) {
        setSuccessMsg('Banner & Bus Discount configuration updated successfully!');
        setImageFile(null);
        fetchConfig();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(res?.message || 'Failed to update configuration.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Error updating configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ImageIcon size={26} color="#2563eb" />
          Banner & Bus Discount
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
          Configure promotional banner image and actual Bus fare discount percentage. Discount percentage is automatically hidden from Customer App banner but applied to fare calculations.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #6ee7b7',
          color: '#047857',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '600'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          color: '#b91c1c',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '600'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Loading Banner & Bus Discount settings...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
          {/* Main Form */}
          <form onSubmit={handleSave} style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              Promotional Banner & Discount Configuration
            </h2>

            {/* 1. Upload Banner Image */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                Promotional Banner Image *
              </label>

              {imagePreview ? (
                <div style={{ position: 'relative', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '8px' }}>
                  <img src={imagePreview} alt="Banner Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(''); }}
                    style={{
                      position: 'absolute', top: '10px', right: '10px',
                      backgroundColor: 'rgba(15, 23, 42, 0.85)', color: '#ffffff',
                      border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '600'
                    }}
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '150px',
                  border: '2px dashed #94a3b8',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  gap: '8px'
                }}>
                  <Upload size={28} color="#64748b" />
                  <span style={{ fontSize: '14px', color: '#475569', fontWeight: '600' }}>
                    Click to upload promotional banner image
                  </span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Supported: JPG, JPEG, PNG, WebP
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {/* 2. Discount Status & Percentage Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Discount Status
                </label>
                <select
                  value={discountStatus}
                  onChange={(e) => setDiscountStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    fontWeight: '600'
                  }}
                >
                  <option value="active">Active (Discount Applied)</option>
                  <option value="inactive">Inactive (No Discount)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Discount Percentage (%) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px 11px 36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: '700',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Percent size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                </div>
              </div>
            </div>

            {/* 3. Title & Subtitle */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Banner Title
              </label>
              <input
                type="text"
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Banner Subtitle
              </label>
              <input
                type="text"
                value={offerSubtitle}
                onChange={(e) => setOfferSubtitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '700',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '15px',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)'
              }}
            >
              {submitting ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
              {submitting ? 'Saving Configuration...' : 'Save & Publish Banner & Discount'}
            </button>
          </form>

          {/* Admin Live Preview Panel */}
          <div>
            <div style={{
              backgroundColor: '#1e293b',
              borderRadius: '16px',
              padding: '20px',
              color: '#ffffff',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Super Admin Live Preview
              </div>

              {/* Banner Image Preview */}
              <div style={{ height: '140px', borderRadius: '12px', overflow: 'hidden', position: 'relative', marginBottom: '16px', backgroundColor: '#334155' }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Live Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                    No Banner Image Uploaded
                  </div>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.75)', padding: '10px'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>{offerTitle || 'Banner Title'}</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{offerSubtitle || 'Banner Subtitle'}</div>
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px', fontSize: '12px', lineHeight: '1.5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Discount Status:</span>
                  <span style={{ fontWeight: '700', color: discountStatus === 'active' ? '#34d399' : '#f87171' }}>
                    {discountStatus === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#94a3b8' }}>Configured Discount:</span>
                  <span style={{ fontWeight: '800', color: '#f59e0b' }}>{discountPercentage}%</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                  ℹ️ Customer App banner displays only the image. The {discountPercentage}% discount is applied behind the scenes to Bus booking calculations.
                </div>
              </div>

              {updatedAt && (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '16px', textAlign: 'center' }}>
                  Last updated by {lastUpdatedBy} on {new Date(updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
