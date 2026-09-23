import React, { useState } from 'react';
import { adminService } from '../services/adminService';
import { Upload as UploadIcon, Eye as EyeIcon } from 'lucide-react';

/**
 * VehicleImagesCard
 * Admin side UI for uploading front and back vehicle images for a driver.
 * It uses the existing adminService.uploadVehicleImages endpoint.
 */
function VehicleImagesCard({ driver, refreshDrivers }) {
  const [frontImg, setFrontImg] = useState(null);
  const [backImg, setBackImg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!frontImg || !backImg) return;
    setUploading(true);
    setError('');
    try {
      await adminService.uploadVehicleImages([frontImg, backImg]);
      // Refresh driver list to reflect any changes.
      if (refreshDrivers) await refreshDrivers();
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: '#fff' }}>Vehicle Images</h4>
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
      <p style={{ color: '#cbd5e1', marginTop: '4px' }}>
        Upload clear images of your vehicle (front &amp; back view)
      </p>
      <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1' }}>Front View *</label>
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
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#cbd5e1' }}>Back View *</label>
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
            }}
          />
        </div>
      </div>
      {error && (
        <div style={{ color: '#dc2626', marginTop: '8px' }}>
          {error}
        </div>
      )}
      <button
        type="button"
        disabled={!frontImg || !backImg || uploading}
        onClick={handleUpload}
        style={{
          marginTop: '12px',
          width: '100%',
          backgroundColor: '#0A66C2',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '8px',
          fontSize: '0.9rem',
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
