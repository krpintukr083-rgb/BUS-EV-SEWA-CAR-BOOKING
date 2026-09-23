import React, { useState } from 'react';
import { adminService } from '../services/adminService';
import { Upload as UploadIcon, Eye as EyeIcon, Image as ImageIcon } from 'lucide-react';

const getResolvedUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  const backendBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://bus-ev-sewa-car-booking.onrender.com' : 'http://localhost:5000');
  const cleanBase = backendBase.replace(/\/+$/, '').replace(/\/api$/, '');
  return `${cleanBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * VehicleImagesCard
 * Admin side UI for uploading front and back vehicle images for a driver.
 */
function VehicleImagesCard({ driver, refreshDrivers }) {
  const [frontImg, setFrontImg] = useState(null);
  const [backImg, setBackImg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Extract existing images
  const existingImages = driver?.assignedVehicle?.vehicleImages || [];
  const existingFrontUrl = getResolvedUrl(existingImages[0]);
  const existingBackUrl = getResolvedUrl(existingImages[1]);

  const handleUpload = async () => {
    if (!frontImg || !backImg) return;
    const vehicleId = driver?.assignedVehicle?._id || driver?.assignedVehicle;
    if (!vehicleId) {
      setError('No vehicle assigned to this driver');
      return;
    }

    setUploading(true);
    setError('');
    try {
      await adminService.uploadVehicleImages(vehicleId, [frontImg, backImg]);
      // Refresh driver list to reflect any changes.
      if (refreshDrivers) await refreshDrivers();
      setFrontImg(null);
      setBackImg(null);
    } catch (e) {
      setError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="content-card"
      style={{
        padding: '20px',
        border: '1px solid #0A66C2',
        borderRadius: '12px',
        backgroundColor: '#1e293b', // dark navy
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ImageIcon size={18} /> Vehicle Images
        </h4>
        <span
          style={{
            backgroundColor: '#0A66C2',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
          }}
        >
          Required
        </span>
      </div>

      {/* Existing Images Display */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ flex: 1, backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>Current Front View</p>
          {existingFrontUrl ? (
            <img 
              src={existingFrontUrl} 
              alt="Front View" 
              style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #475569' }} 
            />
          ) : (
            <div style={{ width: '100%', height: '160px', backgroundColor: '#1e293b', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '1px dashed #475569' }}>
              Not Uploaded
            </div>
          )}
        </div>
        <div style={{ flex: 1, backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>Current Back View</p>
          {existingBackUrl ? (
            <img 
              src={existingBackUrl} 
              alt="Back View" 
              style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #475569' }} 
            />
          ) : (
            <div style={{ width: '100%', height: '160px', backgroundColor: '#1e293b', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', border: '1px dashed #475569' }}>
              Not Uploaded
            </div>
          )}
        </div>
      </div>

      <div style={{ height: '1px', backgroundColor: '#334155', margin: '20px 0' }}></div>

      <p style={{ color: '#cbd5e1', marginTop: '4px', fontSize: '0.9rem' }}>
        Upload new clear images of your vehicle (front &amp; back view)
      </p>
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '0.85rem' }}>Front View *</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={e => setFrontImg(e.target.files[0])}
            style={{
              width: '100%',
              backgroundColor: '#334155',
              color: '#fff',
              border: '1px solid #475569',
              borderRadius: '6px',
              padding: '6px',
              fontSize: '0.85rem'
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1', fontSize: '0.85rem' }}>Back View *</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={e => setBackImg(e.target.files[0])}
            style={{
              width: '100%',
              backgroundColor: '#334155',
              color: '#fff',
              border: '1px solid #475569',
              borderRadius: '6px',
              padding: '6px',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>
      {error && (
        <div style={{ color: '#ef4444', marginTop: '8px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}
      <button
        type="button"
        disabled={!frontImg || !backImg || uploading}
        onClick={handleUpload}
        style={{
          marginTop: '16px',
          width: '100%',
          backgroundColor: '#0A66C2',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '10px',
          fontSize: '0.9rem',
          fontWeight: '600',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: !frontImg || !backImg || uploading ? 0.6 : 1,
        }}
      >
        {uploading ? 'Uploading...' : 'Upload Vehicle Images'}
      </button>
    </div>
  );
}

export default VehicleImagesCard;
