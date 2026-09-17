import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Truck, PlusCircle, Search, Edit, FileText, Check, AlertCircle, Eye, UserCheck, Image as ImageIcon, Trash2, Plus, Star, Camera } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${SERVER_URL}${url}`;
  return `${SERVER_URL}/${url}`;
};

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  // Photo Management / Edit State
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);
  const photoInputRef = useRef(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchVehiclesAndDrivers = async () => {
    try {
      const [vRes, dRes] = await Promise.all([adminService.getVehicles(), adminService.getDrivers()]);
      if (vRes.success) setVehicles(vRes.data);
      if (dRes.success) setDrivers(dRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiclesAndDrivers();
  }, []);

  const handleStatusChange = async (id, status) => {
    setMessage('');
    try {
      const res = await adminService.updateVehicleStatus(id, status);
      if (res.success) {
        setMessage(res.message);
        await fetchVehiclesAndDrivers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update vehicle status');
    }
  };

  const handleOpenAssignModal = vehicle => {
    setSelectedVehicle(vehicle);
    setSelectedDriverId(vehicle.assignedDriver?._id || vehicle.assignedDriver || '');
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async e => {
    e.preventDefault();
    try {
      const res = await adminService.assignDriverToVehicle(selectedVehicle._id, selectedDriverId);
      if (res.success) {
        setMessage(res.message);
        setIsAssignModalOpen(false);
        await fetchVehiclesAndDrivers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign driver');
    }
  };

  const handleOpenViewModal = vehicle => {
    setSelectedVehicle(vehicle);
    setActiveGalleryIndex(0);
    setIsViewModalOpen(true);
  };

  const handleOpenPhotoModal = vehicle => {
    setSelectedVehicle(vehicle);
    setExistingPhotos(vehicle.vehicleImages || []);
    setNewPhotoFiles([]);
    setNewPhotoPreviews([]);
    setPhotoError('');
    setIsPhotoModalOpen(true);
  };

  const handleSelectNewPhotos = e => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setPhotoError('');
    const totalCurrent = existingPhotos.length + newPhotoFiles.length;
    const remainingSlots = 5 - totalCurrent;

    if (remainingSlots <= 0) {
      setPhotoError('Maximum limit of 5 vehicle images already reached.');
      if (e.target) e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setPhotoError(`Only ${remainingSlots} more image(s) can be added (maximum 5 allowed).`);
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    const validFiles = [];
    const previews = [];
    let hasTypeError = false;
    let hasSizeError = false;

    for (const file of filesToProcess) {
      if (!validTypes.includes(file.type.toLowerCase())) {
        hasTypeError = true;
        continue;
      }
      if (file.size > maxSize) {
        hasSizeError = true;
        continue;
      }
      validFiles.push(file);
      previews.push({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name
      });
    }

    if (hasTypeError) {
      setPhotoError('Only JPG, JPEG, and PNG images are allowed.');
    } else if (hasSizeError) {
      setPhotoError('Images must be smaller than 2MB.');
    }

    if (validFiles.length > 0) {
      setNewPhotoFiles(prev => [...prev, ...validFiles]);
      setNewPhotoPreviews(prev => [...prev, ...previews]);
    }

    if (e.target) e.target.value = '';
  };

  const handleRemoveExistingPhoto = indexToRemove => {
    setExistingPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setPhotoError('');
  };

  const handleRemoveNewPhoto = indexToRemove => {
    setNewPhotoFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setNewPhotoPreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setPhotoError('');
  };

  const handleSaveVehiclePhotos = async e => {
    e.preventDefault();
    setPhotoSaving(true);
    setPhotoError('');
    setMessage('');

    try {
      let uploadedUrls = [];
      if (newPhotoFiles.length > 0) {
        const uploadRes = await adminService.uploadVehicleImages(newPhotoFiles);
        if (uploadRes.success && uploadRes.urls) {
          uploadedUrls = uploadRes.urls;
        }
      }

      const finalImages = [...existingPhotos, ...uploadedUrls].slice(0, 5);
      const res = await adminService.updateVehicle(selectedVehicle._id, {
        vehicleImages: finalImages
      });

      if (res.success) {
        setMessage('Vehicle photos updated successfully!');
        setIsPhotoModalOpen(false);
        if (isViewModalOpen) {
          setSelectedVehicle({ ...selectedVehicle, vehicleImages: finalImages });
        }
        await fetchVehiclesAndDrivers();
      }
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Failed to update vehicle photos');
    } finally {
      setPhotoSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading fleet vehicles...</div>;
  }

  const filteredVehicles = vehicles.filter(v => {
    const matchSearch =
      v.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = filterType === 'All' || v.vehicleType === filterType;
    return matchSearch && matchType;
  });

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Vehicle Fleet Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Manage buses, electric shuttles, and cars. Note: Inactive & Blocked vehicles cannot take bookings.
          </p>
        </div>
        <Link to="/admin/add-vehicle" className="btn btn-primary">
          <PlusCircle size={16} /> Add Vehicle
        </Link>
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

      {/* Filter Controls */}
      <div className="content-card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by vehicle number, name, or owner..."
              className="form-control"
              style={{ border: 'none', backgroundColor: '#f8fafc' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Type:</span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="All">All Fleet ({vehicles.length})</option>
              <option value="Bus">Buses Only</option>
              <option value="EV-Sewa">EV-Sewa Only</option>
              <option value="Car">Cars Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="content-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle Details</th>
                <th>Type / Category</th>
                <th>Capacity</th>
                <th>Assigned Driver</th>
                <th>Rate / Fare</th>
                <th>Status</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map(v => (
                  <tr key={v._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {v.vehicleImages && v.vehicleImages.length > 0 ? (
                          <img
                            src={getImageUrl(v.vehicleImages[0])}
                            alt={v.vehicleName}
                            style={{
                              width: '54px',
                              height: '42px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              border: '1px solid #e2e8f0',
                              flexShrink: 0
                            }}
                            onError={e => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100';
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '54px',
                              height: '42px',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                              flexShrink: 0,
                              border: '1px solid #e2e8f0'
                            }}
                          >
                            <Truck size={20} />
                          </div>
                        )}
                        <div>
                          <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{v.vehicleName}</strong>
                          <div style={{ fontWeight: '700', color: '#1d4ed8', fontSize: '0.85rem' }}>
                            {v.vehicleNumber}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Owner: {v.ownerName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                        {v.vehicleType}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{v.vehicleCategory}</div>
                    </td>
                    <td style={{ fontWeight: '600' }}>{v.seatingCapacity} Seats</td>
                    <td>
                      {v.assignedDriver ? (
                        <div>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{v.assignedDriver.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{v.assignedDriver.mobileNumber}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ fontWeight: '700' }}>â‚¹{v.fareRate}</td>
                    <td>
                      <StatusBadge status={v.vehicleStatus} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleOpenViewModal(v)}
                          className="btn btn-sm btn-outline"
                          title="View Details & Gallery"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          onClick={() => handleOpenPhotoModal(v)}
                          className="btn btn-sm btn-outline"
                          title="Manage Vehicle Photos"
                        >
                          <Camera size={13} /> Photos
                        </button>
                        <button
                          onClick={() => handleOpenAssignModal(v)}
                          className="btn btn-sm btn-outline"
                          title="Assign Driver"
                        >
                          <UserCheck size={13} /> Assign
                        </button>
                        {v.vehicleStatus !== 'Active' && (
                          <button
                            onClick={() => handleStatusChange(v._id, 'Active')}
                            className="btn btn-sm btn-outline"
                            style={{ color: '#10b981', borderColor: '#a7f3d0' }}
                          >
                            Activate
                          </button>
                        )}
                        {v.vehicleStatus !== 'Inactive' && (
                          <button
                            onClick={() => handleStatusChange(v._id, 'Inactive')}
                            className="btn btn-sm btn-outline"
                            style={{ color: '#f59e0b', borderColor: '#fde68a' }}
                          >
                            Deactivate
                          </button>
                        )}
                        {v.vehicleStatus !== 'Blocked' && (
                          <button
                            onClick={() => handleStatusChange(v._id, 'Blocked')}
                            className="btn btn-sm btn-outline"
                            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No vehicle records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Vehicle Details Modal with Image Gallery */}
      {isViewModalOpen && selectedVehicle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">{selectedVehicle.vehicleName}</h3>
                <span style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: '700' }}>
                  {selectedVehicle.vehicleNumber}
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setIsViewModalOpen(false)}>
                âœ•
              </button>
            </div>

            {/* Vehicle Photos Gallery Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>Vehicle Photos</span>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenPhotoModal(selectedVehicle);
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#2563eb',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Camera size={14} /> Manage Photos
                </button>
              </div>

              {selectedVehicle.vehicleImages && selectedVehicle.vehicleImages.length > 0 ? (
                <div>
                  {/* Main Gallery Display */}
                  <div
                    style={{
                      position: 'relative',
                      height: '240px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#0f172a',
                      marginBottom: '10px'
                    }}
                  >
                    <img
                      src={getImageUrl(selectedVehicle.vehicleImages[activeGalleryIndex] || selectedVehicle.vehicleImages[0])}
                      alt="Vehicle preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    {activeGalleryIndex === 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Star size={12} fill="#ffffff" /> PRIMARY IMAGE
                      </div>
                    )}
                  </div>

                  {/* Thumbnails row */}
                  {selectedVehicle.vehicleImages.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {selectedVehicle.vehicleImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveGalleryIndex(idx)}
                          style={{
                            width: '64px',
                            height: '48px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: activeGalleryIndex === idx ? '2px solid #2563eb' : '1px solid #cbd5e1',
                            cursor: 'pointer',
                            opacity: activeGalleryIndex === idx ? 1 : 0.65,
                            flexShrink: 0
                          }}
                        >
                          <img
                            src={getImageUrl(imgUrl)}
                            alt={`thumb ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                    fontSize: '0.85rem'
                  }}
                >
                  <ImageIcon size={28} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
                  No photos uploaded for this vehicle yet.
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.875rem' }}>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Vehicle Type</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.vehicleType}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Category & Model</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.vehicleCategory} ({selectedVehicle.vehicleModel})</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Owner Information</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.ownerName} ({selectedVehicle.ownerMobileNumber})</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Assigned Driver</span>
                <div style={{ fontWeight: '700' }}>
                  {selectedVehicle.assignedDriver ? selectedVehicle.assignedDriver.name : 'Unassigned'}
                </div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>RC Number</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.rcNumber}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Insurance Policy Number</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.insurancePolicyNumber} (Exp: {selectedVehicle.insuranceExpiryDetails})</div>
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
              <span style={{ color: '#64748b' }}>Fitness / Check Details:</span>
              <div style={{ fontWeight: '600' }}>{selectedVehicle.fitnessDetails}</div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage / Edit Vehicle Photos Modal */}
      {isPhotoModalOpen && selectedVehicle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Manage Vehicle Photos</h3>
                <span style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: '700' }}>
                  {selectedVehicle.vehicleName} ({selectedVehicle.vehicleNumber})
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setIsPhotoModalOpen(false)}>
                âœ•
              </button>
            </div>

            <form onSubmit={handleSaveVehiclePhotos}>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 12px 0' }}>
                  Upload up to 5 photos (JPG, JPEG, PNG, max 2MB each). First image is the primary thumbnail.
                </p>

                {photoError && (
                  <div
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{photoError}</span>
                  </div>
                )}

                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handleSelectNewPhotos}
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  multiple
                  style={{ display: 'none' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                  {/* Existing Photos */}
                  {existingPhotos.map((url, idx) => (
                    <div
                      key={`existing-${idx}`}
                      style={{
                        position: 'relative',
                        aspectRatio: '4/3',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: idx === 0 ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        backgroundColor: '#f8fafc'
                      }}
                    >
                      <img
                        src={getImageUrl(url)}
                        alt={`Vehicle photo ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {idx === 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontSize: '0.6rem',
                            fontWeight: '700',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <Star size={9} fill="#ffffff" /> PRIMARY
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingPhoto(idx)}
                        title="Remove photo"
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Newly selected photo previews */}
                  {newPhotoPreviews.map((item, idx) => {
                    const globalIdx = existingPhotos.length + idx;
                    return (
                      <div
                        key={`new-${idx}`}
                        style={{
                          position: 'relative',
                          aspectRatio: '4/3',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: globalIdx === 0 ? '2px solid #2563eb' : '1px solid #93c5fd',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          backgroundColor: '#eff6ff'
                        }}
                      >
                        <img
                          src={item.previewUrl}
                          alt={`New preview ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {globalIdx === 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '4px',
                              left: '4px',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              fontSize: '0.6rem',
                              fontWeight: '700',
                              padding: '2px 5px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            <Star size={9} fill="#ffffff" /> PRIMARY
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveNewPhoto(idx)}
                          title="Remove new photo"
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}

                  {/* Add Image Slot Button */}
                  {existingPhotos.length + newPhotoFiles.length < 5 && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current && photoInputRef.current.click()}
                      style={{
                        aspectRatio: '4/3',
                        borderRadius: '8px',
                        border: '2px dashed #93c5fd',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        color: '#2563eb',
                        padding: '8px'
                      }}
                    >
                      <Plus size={20} />
                      <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>+ Add Image</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                        ({5 - (existingPhotos.length + newPhotoFiles.length)} left)
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsPhotoModalOpen(false)}
                  disabled={photoSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={photoSaving}>
                  {photoSaving ? 'Saving Photos...' : 'Save Photos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver Assignment Modal */}
      {isAssignModalOpen && selectedVehicle && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header-flex">
              <h3 className="card-title">Assign Driver to {selectedVehicle.vehicleNumber}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setIsAssignModalOpen(false)}>
                âœ•
              </button>
            </div>

            <form onSubmit={handleSaveAssignment}>
              <div className="form-group">
                <label className="form-label">Select Driver</label>
                <select
                  className="form-control"
                  value={selectedDriverId}
                  onChange={e => setSelectedDriverId(e.target.value)}
                >
                  <option value="">-- Unassign Current Driver --</option>
                  {drivers.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.mobileNumber}) - {d.driverStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;

