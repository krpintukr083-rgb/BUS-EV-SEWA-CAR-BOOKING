import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services/adminService';
import StatusBadge from '../components/StatusBadge';
import { Truck, PlusCircle, Search, Edit, FileText, Check, AlertCircle, Eye, UserCheck, Image as ImageIcon, Trash2, Plus, Star, Camera, DollarSign, Building, ShoppingBag, Calendar, CheckCircle2, Clock } from 'lucide-react';

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
  const [filterSource, setFilterSource] = useState('All'); // 'All' | 'OWN' | 'THIRD_PARTY'
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  // Photo Management State
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);
  const photoInputRef = useRef(null);

  // Owner / Vendor Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentVehicle, setPaymentVehicle] = useState(null);
  const [paymentStatusInput, setPaymentStatusInput] = useState('Paid');
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [paymentDateInput, setPaymentDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [paymentNotesInput, setPaymentNotesInput] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchVehiclesAndDrivers = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        adminService.getVehicles(filterType !== 'All' ? filterType : undefined, filterSource !== 'All' ? filterSource : undefined),
        adminService.getDrivers()
      ]);
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
  }, [filterType, filterSource]);

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

  const handleOpenPaymentModal = vehicle => {
    setPaymentVehicle(vehicle);
    const currHire = vehicle.hireDetails || {};
    setPaymentStatusInput(currHire.paymentStatus === 'Paid' ? 'Pending' : 'Paid');
    setPaidAmountInput(currHire.paidAmount || currHire.hireAmount || '');
    setPaymentDateInput(new Date().toISOString().split('T')[0]);
    setPaymentRefInput(currHire.paymentReference || '');
    setPaymentNotesInput(currHire.notes || '');
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async e => {
    e.preventDefault();
    if (!paymentVehicle) return;
    setPaymentSubmitting(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        paymentStatus: paymentStatusInput,
        paidAmount: Number(paidAmountInput) || 0,
        paymentDate: paymentDateInput,
        paymentReference: paymentRefInput,
        notes: paymentNotesInput
      };
      const res = await adminService.recordHirePayment(paymentVehicle._id, payload);
      if (res.success) {
        setMessage(res.message || 'Owner payment status updated successfully!');
        setIsPaymentModalOpen(false);
        await fetchVehiclesAndDrivers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record owner payment');
    } finally {
      setPaymentSubmitting(false);
    }
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
      setPhotoError('Some files were skipped because they exceed the 2MB size limit.');
    }

    if (validFiles.length > 0) {
      setNewPhotoFiles(prev => [...prev, ...validFiles]);
      setNewPhotoPreviews(prev => [...prev, ...previews]);
    }

    if (e.target) e.target.value = '';
  };

  const handleRemoveExistingPhoto = indexToRemove => {
    setExistingPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRemoveNewPhoto = indexToRemove => {
    setNewPhotoFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setNewPhotoPreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryExistingPhoto = indexToMakePrimary => {
    setExistingPhotos(prev => {
      const item = prev[indexToMakePrimary];
      const rest = prev.filter((_, idx) => idx !== indexToMakePrimary);
      return [item, ...rest];
    });
  };

  const handleSavePhotos = async () => {
    if (!selectedVehicle) return;
    setPhotoSaving(true);
    setPhotoError('');

    try {
      let newlyUploadedUrls = [];
      if (newPhotoFiles.length > 0) {
        const uploadRes = await adminService.uploadVehicleImages(newPhotoFiles);
        if (uploadRes.success && uploadRes.urls) {
          newlyUploadedUrls = uploadRes.urls;
        }
      }

      const finalImagesList = [...existingPhotos, ...newlyUploadedUrls].slice(0, 5);

      const updateRes = await adminService.updateVehicle(selectedVehicle._id, {
        vehicleImages: finalImagesList
      });

      if (updateRes.success) {
        setMessage('Vehicle photos updated successfully!');
        setIsPhotoModalOpen(false);
        await fetchVehiclesAndDrivers();
      }
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Failed to save vehicle photos');
    } finally {
      setPhotoSaving(false);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch =
      v.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vehicleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendorDetails?.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.assignedDriver?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'All' || v.vehicleType === filterType;
    const matchesSource = filterSource === 'All' || (v.vehicleSource || 'OWN') === filterSource;

    return matchesSearch && matchesType && matchesSource;
  });

  const ownCount = vehicles.filter(v => (v.vehicleSource || 'OWN') !== 'THIRD_PARTY').length;
  const thirdPartyCount = vehicles.filter(v => v.vehicleSource === 'THIRD_PARTY').length;

  if (loading) {
    return <div style={{ padding: '24px', color: '#64748b' }}>Loading fleet vehicles...</div>;
  }

  return (
    <div>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Vehicle Fleet & Market Hire Management</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Manage Company-Owned vehicles and Third-Party / Market-Hired vehicles (e.g. Trucks, Buses, Cars).
          </p>
        </div>
        <Link to="/admin/add-vehicle" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlusCircle size={18} /> Add Vehicle / Hire Truck
        </Link>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #a7f3d0' }}>
          <Check size={18} /> {message}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fecaca' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* OWN VS THIRD-PARTY QUICK FILTER CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div
          onClick={() => setFilterSource('All')}
          style={{
            padding: '14px 18px',
            borderRadius: '8px',
            backgroundColor: filterSource === 'All' ? '#1e293b' : '#ffffff',
            color: filterSource === 'All' ? '#ffffff' : '#334155',
            border: '1px solid #cbd5e1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s'
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>All Fleet Vehicles</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{vehicles.length}</div>
          </div>
          <Truck size={22} style={{ opacity: 0.7 }} />
        </div>

        <div
          onClick={() => setFilterSource('OWN')}
          style={{
            padding: '14px 18px',
            borderRadius: '8px',
            backgroundColor: filterSource === 'OWN' ? '#2563eb' : '#ffffff',
            color: filterSource === 'OWN' ? '#ffffff' : '#1e40af',
            border: `1px solid ${filterSource === 'OWN' ? '#2563eb' : '#bfdbfe'}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s'
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Own / Company Fleet</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{ownCount}</div>
          </div>
          <Building size={22} style={{ opacity: 0.8 }} />
        </div>

        <div
          onClick={() => setFilterSource('THIRD_PARTY')}
          style={{
            padding: '14px 18px',
            borderRadius: '8px',
            backgroundColor: filterSource === 'THIRD_PARTY' ? '#ea580c' : '#ffffff',
            color: filterSource === 'THIRD_PARTY' ? '#ffffff' : '#c2410c',
            border: `1px solid ${filterSource === 'THIRD_PARTY' ? '#ea580c' : '#fed7aa'}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s'
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Third-Party / Market Hired</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{thirdPartyCount}</div>
          </div>
          <ShoppingBag size={22} style={{ opacity: 0.8 }} />
        </div>
      </div>

      {/* Search & Type Filter Bar */}
      <div className="content-card" style={{ marginBottom: '16px', padding: '14px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by vehicle no, name, owner, vendor, driver..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b' }}>Vehicle Type:</span>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="form-control"
              style={{ width: '160px' }}
            >
              <option value="All">All Types</option>
              <option value="Bus">Buses Only</option>
              <option value="EV-Sewa">EV-Sewa Only</option>
              <option value="Car">Cars Only</option>
              <option value="Truck">Trucks / Haulage</option>
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
                <th>Source & Type</th>
                <th>Capacity / Cargo</th>
                <th>Driver / Market Crew</th>
                <th>Hire / Fare (₹)</th>
                <th>Owner Payment</th>
                <th>Status</th>
                <th>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map(v => {
                  const isThirdParty = v.vehicleSource === 'THIRD_PARTY';
                  const hire = v.hireDetails || {};

                  return (
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
                                backgroundColor: isThirdParty ? '#fff7ed' : '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isThirdParty ? '#ea580c' : '#94a3b8',
                                flexShrink: 0,
                                border: '1px solid #e2e8f0'
                              }}
                            >
                              <Truck size={20} />
                            </div>
                          )}
                          <div>
                            <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{v.vehicleName}</strong>
                            <div style={{ fontWeight: '700', color: isThirdParty ? '#ea580c' : '#1d4ed8', fontSize: '0.85rem' }}>
                              {v.vehicleNumber}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {isThirdParty ? `Vendor: ${v.vendorDetails?.vendorName || v.ownerName}` : `Owner: ${v.ownerName}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {isThirdParty ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', width: 'fit-content', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800', backgroundColor: '#ffedd5', color: '#c2410c' }}>
                              MARKET HIRED
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', width: 'fit-content', padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800', backgroundColor: '#dbeafe', color: '#1e40af' }}>
                              OWN FLEET
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>
                            {v.vehicleType} • {v.vehicleCategory}
                          </span>
                        </div>
                      </td>

                      <td style={{ fontWeight: '600' }}>
                        {v.loadCapacity ? (
                          <div>
                            <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>{v.loadCapacity}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{v.seatingCapacity} seats</div>
                          </div>
                        ) : (
                          `${v.seatingCapacity} Seats`
                        )}
                      </td>

                      <td>
                        {v.assignedDriver ? (
                          <div>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{v.assignedDriver.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{v.assignedDriver.mobileNumber}</div>
                          </div>
                        ) : isThirdParty && v.thirdPartyDriver?.driverName ? (
                          <div>
                            <div style={{ fontWeight: '600', color: '#ea580c' }}>{v.thirdPartyDriver.driverName} (Vendor)</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{v.thirdPartyDriver.driverMobile}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Unassigned</span>
                        )}
                      </td>

                      <td style={{ fontWeight: '700' }}>
                        {isThirdParty ? (
                          <div>
                            <div style={{ color: '#ea580c' }}>Hire: ₹{hire.hireAmount || 0}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Rate: ₹{v.fareRate}</div>
                          </div>
                        ) : (
                          `₹${v.fareRate}`
                        )}
                      </td>

                      <td>
                        {isThirdParty ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                width: 'fit-content',
                                backgroundColor: hire.paymentStatus === 'Paid' ? '#dcfce7' : '#fef3c7',
                                color: hire.paymentStatus === 'Paid' ? '#15803d' : '#b45309'
                              }}
                            >
                              {hire.paymentStatus === 'Paid' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                              {hire.paymentStatus || 'Pending'}
                            </span>
                            <button
                              onClick={() => handleOpenPaymentModal(v)}
                              style={{
                                border: 'none',
                                background: 'none',
                                padding: 0,
                                fontSize: '0.72rem',
                                color: '#2563eb',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              Update Status
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Company Owned</span>
                        )}
                      </td>

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
                          {isThirdParty && (
                            <button
                              onClick={() => handleOpenPaymentModal(v)}
                              className="btn btn-sm btn-outline"
                              style={{ color: '#ea580c', borderColor: '#fdba74' }}
                              title="Record/Update Owner Payment"
                            >
                              <DollarSign size={13} /> Payout
                            </button>
                          )}
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No vehicle records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Owner / Vendor Payment Modal */}
      {isPaymentModalOpen && paymentVehicle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="card-header-flex" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="card-title">Record Vehicle Owner Payment</h3>
                <span style={{ fontSize: '0.85rem', color: '#ea580c', fontWeight: '700' }}>
                  {paymentVehicle.vehicleNumber} ({paymentVehicle.vendorDetails?.vendorName || paymentVehicle.ownerName})
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setIsPaymentModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment}>
              <div style={{ padding: '12px', backgroundColor: '#fff7ed', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fed7aa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                  <span style={{ color: '#7c2d12' }}>Agreed Hire Amount:</span>
                  <span style={{ fontWeight: '700', color: '#ea580c' }}>₹{paymentVehicle.hireDetails?.hireAmount || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#7c2d12' }}>Additional Expenses:</span>
                  <span style={{ fontWeight: '700', color: '#7c2d12' }}>₹{paymentVehicle.hireDetails?.additionalExpense || 0}</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontWeight: '700' }}>Payment Status</label>
                <select
                  value={paymentStatusInput}
                  onChange={e => setPaymentStatusInput(e.target.value)}
                  className="form-control"
                >
                  <option value="Pending">Pending (Unpaid)</option>
                  <option value="Paid">Paid (Settled to Vendor)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Settled / Paid Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={paidAmountInput}
                  onChange={e => setPaidAmountInput(e.target.value)}
                  className="form-control"
                  placeholder="e.g. 2800"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Payment Date</label>
                <input
                  type="date"
                  value={paymentDateInput}
                  onChange={e => setPaymentDateInput(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Transaction Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-MKT-99218204 or NEFT-88910"
                  value={paymentRefInput}
                  onChange={e => setPaymentRefInput(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Accounting Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Full settlement for Delhi-Jaipur truck haulage"
                  value={paymentNotesInput}
                  onChange={e => setPaymentNotesInput(e.target.value)}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsPaymentModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={paymentSubmitting} style={{ backgroundColor: '#ea580c', borderColor: '#ea580c' }}>
                  {paymentSubmitting ? 'Saving...' : 'Save Payment Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Vehicle Details Modal with Image Gallery & Hire Info */}
      {isViewModalOpen && selectedVehicle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">{selectedVehicle.vehicleName}</h3>
                <span style={{ fontSize: '0.85rem', color: selectedVehicle.vehicleSource === 'THIRD_PARTY' ? '#ea580c' : '#1d4ed8', fontWeight: '700' }}>
                  {selectedVehicle.vehicleNumber} {selectedVehicle.vehicleSource === 'THIRD_PARTY' ? '• [MARKET HIRED]' : '• [OWN FLEET]'}
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setIsViewModalOpen(false)}>
                ✕
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
                <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.85rem' }}>
                  <ImageIcon size={28} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
                  No photos uploaded for this vehicle yet.
                </div>
              )}
            </div>

            {/* Third Party Hire Breakdown if applicable */}
            {selectedVehicle.vehicleSource === 'THIRD_PARTY' && selectedVehicle.hireDetails && (
              <div style={{ padding: '14px', backgroundColor: '#fff7ed', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fed7aa' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#c2410c', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingBag size={16} /> Market Hire Contract & Accounting
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                  <div><strong>Vendor Name:</strong> {selectedVehicle.vendorDetails?.vendorName || selectedVehicle.ownerName}</div>
                  <div><strong>Vendor Mobile:</strong> {selectedVehicle.vendorDetails?.vendorMobile || selectedVehicle.ownerMobileNumber}</div>
                  <div><strong>Agreed Hire Amount:</strong> ₹{selectedVehicle.hireDetails.hireAmount || 0}</div>
                  <div><strong>Additional Expense:</strong> ₹{selectedVehicle.hireDetails.additionalExpense || 0}</div>
                  <div><strong>Owner Payment Status:</strong> <span style={{ fontWeight: '700', color: selectedVehicle.hireDetails.paymentStatus === 'Paid' ? '#16a34a' : '#ea580c' }}>{selectedVehicle.hireDetails.paymentStatus || 'Pending'}</span></div>
                  <div><strong>Payment Reference:</strong> <code>{selectedVehicle.hireDetails.paymentReference || 'N/A'}</code></div>
                  {selectedVehicle.thirdPartyDriver?.driverName && (
                    <div><strong>Vendor Driver:</strong> {selectedVehicle.thirdPartyDriver.driverName} ({selectedVehicle.thirdPartyDriver.driverMobile})</div>
                  )}
                  {selectedVehicle.loadCapacity && (
                    <div><strong>Load Capacity:</strong> {selectedVehicle.loadCapacity}</div>
                  )}
                </div>
              </div>
            )}

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
                <span style={{ color: '#64748b' }}>Owner / Entity Information</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.ownerName} ({selectedVehicle.ownerMobileNumber})</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Capacity</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.loadCapacity || `${selectedVehicle.seatingCapacity} Seats`}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Assigned Driver</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.assignedDriver ? selectedVehicle.assignedDriver.name : 'Unassigned'}</div>
              </div>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <span style={{ color: '#64748b' }}>Operating Route</span>
                <div style={{ fontWeight: '700' }}>{selectedVehicle.route?.origin || 'N/A'} → {selectedVehicle.route?.destination || 'N/A'}</div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {selectedVehicle.vehicleSource === 'THIRD_PARTY' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#ea580c', borderColor: '#ea580c' }}
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleOpenPaymentModal(selectedVehicle);
                  }}
                >
                  <DollarSign size={14} /> Update Owner Payment
                </button>
              )}
              <button className="btn btn-outline" onClick={() => setIsViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Assignment Modal */}
      {isAssignModalOpen && selectedVehicle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="card-header-flex">
              <div>
                <h3 className="card-title">Assign Driver</h3>
                <span style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: '700' }}>
                  {selectedVehicle.vehicleName} ({selectedVehicle.vehicleNumber})
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setIsAssignModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveAssignment} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Select Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={e => setSelectedDriverId(e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Unassigned --</option>
                  {drivers.map(d => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.mobileNumber}) - {d.driverStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
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

      {/* Photo Management Modal */}
      {isPhotoModalOpen && selectedVehicle && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header-flex" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="card-title">Manage Vehicle Photos</h3>
                <span style={{ fontSize: '0.85rem', color: '#1d4ed8', fontWeight: '700' }}>
                  {selectedVehicle.vehicleName} ({selectedVehicle.vehicleNumber})
                </span>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setIsPhotoModalOpen(false)}>✕</button>
            </div>

            <input
              type="file"
              ref={photoInputRef}
              onChange={handleSelectNewPhotos}
              multiple
              accept="image/png, image/jpeg, image/jpg"
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {existingPhotos.map((imgUrl, idx) => (
                <div key={idx} style={{ position: 'relative', width: '120px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: idx === 0 ? '2px solid #2563eb' : '1px solid #cbd5e1' }}>
                  <img src={getImageUrl(imgUrl)} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {idx === 0 && (
                    <span style={{ position: 'absolute', bottom: '4px', left: '4px', backgroundColor: '#2563eb', color: '#fff', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', fontWeight: '700' }}>
                      PRIMARY
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingPhoto(idx)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Trash2 size={12} />
                  </button>
                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryExistingPhoto(idx)}
                      style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '0.65rem', cursor: 'pointer' }}
                    >
                      Make Primary
                    </button>
                  )}
                </div>
              ))}

              {newPhotoPreviews.map((p, idx) => (
                <div key={`new-${idx}`} style={{ position: 'relative', width: '120px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '2px dashed #10b981' }}>
                  <img src={p.previewUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', bottom: '4px', left: '4px', backgroundColor: '#10b981', color: '#fff', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', fontWeight: '700' }}>
                    NEW
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveNewPhoto(idx)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {existingPhotos.length + newPhotoPreviews.length < 5 && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  style={{ width: '120px', height: '90px', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#f8fafc', cursor: 'pointer', color: '#64748b', fontSize: '0.8rem' }}
                >
                  <Plus size={20} /> Add Photo
                </button>
              )}
            </div>

            {photoError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '14px' }}>{photoError}</p>}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsPhotoModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSavePhotos} disabled={photoSaving}>
                {photoSaving ? 'Saving Changes...' : 'Save Photos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;
