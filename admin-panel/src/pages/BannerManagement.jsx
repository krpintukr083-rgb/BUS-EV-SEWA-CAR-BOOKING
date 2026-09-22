import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { getFullImageUrl } from '../utils/imageUrl';
import {
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Upload,
  Percent,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Layers
} from 'lucide-react';

const BannerManagement = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Multi-Banner State
  const [banners, setBanners] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  // Banner Modal Form State
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerStatus, setBannerStatus] = useState('active');
  const [bannerSortOrder, setBannerSortOrder] = useState(0);
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState('');

  // Discount % Configuration State (100% UNTOUCHED LOGIC)
  const [discountStatus, setDiscountStatus] = useState('active');
  const [discountPercentage, setDiscountPercentage] = useState(15);
  const [discountTitle, setDiscountTitle] = useState('Travel Nepal With TravelSewa');
  const [discountSubtitle, setDiscountSubtitle] = useState('Book your journey today with verified luxury fleet');
  const [discountImageFile, setDiscountImageFile] = useState(null);
  const [discountImagePreview, setDiscountImagePreview] = useState('');
  const [lastUpdatedBy, setLastUpdatedBy] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Multi Banners
      try {
        const bRes = await adminService.getBanners();
        if (bRes && bRes.success && bRes.data) {
          setBanners(bRes.data);
        }
      } catch (err) {
        console.warn('Error fetching banners:', err);
      }

      // 2. Fetch Bus Discount Config (UNTOUCHED)
      try {
        const dRes = await adminService.getBusOffer();
        if (dRes && dRes.success && dRes.data) {
          const data = dRes.data;
          setDiscountStatus(data.offerStatus || data.discountStatus || 'active');
          setDiscountPercentage(data.discountPercentage !== undefined ? data.discountPercentage : 15);
          setDiscountTitle(data.offerTitle || 'Travel Nepal With TravelSewa');
          setDiscountSubtitle(data.offerSubtitle || 'Book your journey today with verified luxury fleet');
          setDiscountImagePreview(data.bannerImage || data.imageUrl || '');
          setLastUpdatedBy(data.lastUpdatedBy || 'Super Admin');
          setUpdatedAt(data.updatedAt || '');
        }
      } catch (err) {
        console.warn('Error fetching discount config:', err);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Multi-Banner Handlers
  const handleOpenAddModal = () => {
    setEditingBanner(null);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerStatus('active');
    setBannerSortOrder(banners.length + 1);
    setBannerImageFile(null);
    setBannerImagePreview('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (banner) => {
    setEditingBanner(banner);
    setBannerTitle(banner.title || '');
    setBannerSubtitle(banner.subtitle || '');
    setBannerStatus(banner.status || 'active');
    setBannerSortOrder(banner.sortOrder || 0);
    setBannerImageFile(null);
    setBannerImagePreview(banner.imageUrl || banner.bannerImage || '');
    setShowAddModal(true);
  };

  const handleBannerImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerImageFile(file);
      setBannerImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg('');

      const formData = new FormData();
      formData.append('title', bannerTitle);
      formData.append('subtitle', bannerSubtitle);
      formData.append('status', bannerStatus);
      formData.append('sortOrder', bannerSortOrder);

      if (bannerImageFile) {
        formData.append('bannerImage', bannerImageFile);
      } else if (bannerImagePreview) {
        formData.append('imageUrl', bannerImagePreview);
      }

      let res;
      if (editingBanner) {
        res = await adminService.updateBanner(editingBanner._id, formData);
      } else {
        res = await adminService.createBanner(formData);
      }

      if (res && res.success) {
        setSuccessMsg(editingBanner ? 'Banner updated successfully!' : 'New Banner added successfully!');
        setShowAddModal(false);
        fetchAllData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(res?.message || 'Failed to save banner.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Error saving banner.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBannerStatus = async (bannerId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const res = await adminService.toggleBannerStatus(bannerId, newStatus);
      if (res && res.success) {
        setSuccessMsg(`Banner status changed to ${newStatus}`);
        fetchAllData();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setError('Failed to toggle banner status.');
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      const res = await adminService.deleteBanner(bannerId);
      if (res && res.success) {
        setSuccessMsg('Banner deleted successfully');
        fetchAllData();
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setError('Failed to delete banner.');
    }
  };

  // Bus Discount % Handler (100% UNTOUCHED)
  const handleSaveDiscount = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg('');

      const formData = new FormData();
      formData.append('discountStatus', discountStatus);
      formData.append('offerStatus', discountStatus);
      formData.append('discountPercentage', discountPercentage);
      formData.append('offerTitle', discountTitle);
      formData.append('offerSubtitle', discountSubtitle);

      if (discountImageFile) {
        formData.append('image', discountImageFile);
      } else if (discountImagePreview) {
        formData.append('imageUrl', discountImagePreview);
      }

      const res = await adminService.updateBusOffer(formData);
      if (res && res.success) {
        setSuccessMsg('Bus Discount configuration updated successfully!');
        setDiscountImageFile(null);
        fetchAllData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(res?.message || 'Failed to update discount configuration.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Error updating discount configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={26} color="#2563eb" />
            Promotional Banners & Bus Discount
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            Manage multiple active banners shown on Customer App carousel & configure actual Bus fare discount percentage.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)'
          }}
        >
          <Plus size={18} />
          Add New Banner
        </button>
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
          Loading Banners & Configuration...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* SECTION 1: Multiple Customer App Promotional Banners */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                Customer App Active Banners ({banners.length})
              </h2>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                All active banners appear in the Customer App slider dynamically.
              </span>
            </div>

            {banners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                <ImageIcon size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
                <p style={{ margin: 0, color: '#475569', fontWeight: '600', fontSize: '15px' }}>No Banners Available</p>
                <p style={{ margin: '4px 0 16px 0', color: '#94a3b8', fontSize: '13px' }}>Click "Add New Banner" above to upload your first banner image.</p>
                <button
                  onClick={handleOpenAddModal}
                  style={{
                    backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  + Add First Banner
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {banners.map((b) => {
                  const img = b.imageUrl || b.bannerImage || discountImagePreview;
                  return (
                    <div
                      key={b._id}
                      style={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ position: 'relative', height: '140px', backgroundColor: '#1e293b' }}>
                        <img
                          src={getFullImageUrl(img)}
                          alt={b.title || 'Banner'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute', top: '10px', right: '10px',
                          backgroundColor: b.status === 'active' ? '#10b981' : '#ef4444',
                          color: '#ffffff', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '12px', textTransform: 'uppercase'
                        }}>
                          {b.status === 'active' ? 'Active' : 'Inactive'}
                        </div>
                      </div>

                      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                            {b.title || 'Promotional Banner'}
                          </h4>
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                            {b.subtitle || 'Active in Customer App'}
                          </p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                          <button
                            onClick={() => handleToggleBannerStatus(b._id, b.status)}
                            style={{
                              flex: 1,
                              backgroundColor: b.status === 'active' ? '#fef2f2' : '#ecfdf5',
                              color: b.status === 'active' ? '#dc2626' : '#059669',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            {b.status === 'active' ? <EyeOff size={14} /> : <Eye size={14} />}
                            {b.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(b)}
                            style={{
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Edit size={14} />
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteBanner(b._id)}
                            style={{
                              backgroundColor: '#fff1f2',
                              color: '#e11d48',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: Bus Discount Percentage (%) Configuration (100% UNTOUCHED) */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
              Bus Discount Percentage (%) Settings
            </h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
              Configures the actual discount % applied behind the scenes to Bus booking fare calculations.
            </p>

            <form onSubmit={handleSaveDiscount} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Discount Calculation Status
                </label>
                <select
                  value={discountStatus}
                  onChange={(e) => setDiscountStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    fontWeight: '600'
                  }}
                >
                  <option value="active">Active (Discount Applied to Fares)</option>
                  <option value="inactive">Inactive (Full Base Fare)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Discount Percentage (%)
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
                      padding: '10px 14px 10px 36px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: '700',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Percent size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                </div>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  {submitting ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
                  Save Discount Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT BANNER MODAL */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0' }}>
              {editingBanner ? 'Edit Banner Image' : 'Add New Promotional Banner'}
            </h3>

            <form onSubmit={handleSaveBanner}>
              {/* Banner Image Upload */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Banner Image *
                </label>
                {bannerImagePreview ? (
                  <div style={{ position: 'relative', height: '140px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1', marginBottom: '8px' }}>
                    <img src={bannerImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => { setBannerImageFile(null); setBannerImagePreview(''); }}
                      style={{
                        position: 'absolute', top: '8px', right: '8px',
                        backgroundColor: 'rgba(15, 23, 42, 0.85)', color: '#ffffff',
                        border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: '600'
                      }}
                    >
                      Change Image
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '130px', border: '2px dashed #94a3b8', borderRadius: '10px', backgroundColor: '#f8fafc', cursor: 'pointer'
                  }}>
                    <Upload size={24} color="#64748b" />
                    <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600', marginTop: '6px' }}>
                      Click to upload banner image
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleBannerImageChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Title & Subtitle */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Banner Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special Holiday Offer"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Banner Subtitle (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Book luxury buses at discounted rates"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Status & Sort Order */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    value={bannerStatus}
                    onChange={(e) => setBannerStatus(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={bannerSortOrder}
                    onChange={(e) => setBannerSortOrder(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submitting ? 'Saving...' : editingBanner ? 'Save Changes' : 'Upload Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
