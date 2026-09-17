import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { PlusCircle, Check, AlertCircle, Truck, Bus, Zap, Car, Plus, Trash2, Image as ImageIcon, Upload, Star } from 'lucide-react';

const AddVehicle = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Vehicle Photos state (Maximum 5 images, Max 2MB each)
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  // Form Fields
  const [vehicleType, setVehicleType] = useState('Bus');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleCategory, setVehicleCategory] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState(36);
  const [ownerName, setOwnerName] = useState('Metro Transport Logistics Ltd');
  const [ownerMobileNumber, setOwnerMobileNumber] = useState('+919811122334');
  const [assignedDriver, setAssignedDriver] = useState('');
  const [fareRate, setFareRate] = useState(850);
  const [vehicleStatus, setVehicleStatus] = useState('Active');

  // Documents
  const [rcNumber, setRcNumber] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiryDetails, setInsuranceExpiryDetails] = useState('2026-12-31');
  const [fitnessDetails, setFitnessDetails] = useState('State Transport Roadworthiness Certified');

  // Routes
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [boardingPoints, setBoardingPoints] = useState('');
  const [droppingPoints, setDroppingPoints] = useState('');

  // Bus specifics
  const [busType, setBusType] = useState('AC Sleeper 2+1');
  const [seatLayout, setSeatLayout] = useState('2+1 Luxury Sleeper');

  // EV specifics
  const [batteryCapacity, setBatteryCapacity] = useState('72 kWh');
  const [rangeKm, setRangeKm] = useState(280);

  // Car specifics
  const [fuelType, setFuelType] = useState('Electric');

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await adminService.getDrivers();
        if (res.success) {
          setDrivers(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  const handleFilesSelect = e => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageError('');
    const maxLimit = 5;
    const currentCount = imagePreviews.length;
    const remainingSlots = maxLimit - currentCount;

    if (remainingSlots <= 0) {
      setImageError('Maximum limit of 5 vehicle images already reached.');
      if (e.target) e.target.value = '';
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setImageError(`Only ${remainingSlots} more image(s) can be added (maximum 5 allowed).`);
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    const newValidFiles = [];
    const newPreviews = [];
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
      newValidFiles.push(file);
      newPreviews.push({
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name
      });
    }

    if (hasTypeError) {
      setImageError('Some files were skipped. Only JPG, JPEG, and PNG images are allowed.');
    } else if (hasSizeError) {
      setImageError('Some files were skipped because they exceed the 2MB size limit.');
    }

    if (newValidFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newValidFiles]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }

    if (e.target) e.target.value = '';
  };

  const handleRemoveImage = indexToRemove => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setImageError('');
  };

  const handleTypeSelect = type => {
    setVehicleType(type);
    if (type === 'Bus') {
      setVehicleCategory('AC Sleeper 2+1 (Multi-Axle)');
      setVehicleModel('Volvo 9600 Multi-Axle');
      setSeatingCapacity(36);
      setFareRate(850);
      setOrigin('Delhi (Kashmere Gate ISBT)');
      setDestination('Jaipur (Sindhi Camp)');
      setBoardingPoints('ISBT Kashmere Gate, Dhaula Kuan, IFFCO Chowk');
      setDroppingPoints('Kotputli Bypass, Amer Road, Sindhi Camp');
    } else if (type === 'EV-Sewa') {
      setVehicleCategory('Electric Shuttle 12-Seater');
      setVehicleModel('Tata Winger EV Green Express');
      setSeatingCapacity(12);
      setFareRate(320);
      setOrigin('Connaught Place, Delhi');
      setDestination('Sector 62, Noida');
      setBoardingPoints('CP Outer Circle, Akshardham');
      setDroppingPoints('Sector 18 Atta, Sector 62 IT Park');
    } else if (type === 'Car') {
      setVehicleCategory('Executive Electric SUV');
      setVehicleModel('Mahindra XUV700 EV Prime');
      setSeatingCapacity(6);
      setFareRate(950);
      setOrigin('IGI Airport T3');
      setDestination('Cyber Hub Gurugram');
      setBoardingPoints('T3 Arrival Gate 5');
      setDroppingPoints('Cyber Hub DLF Phase 2');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      let uploadedImageUrls = [];
      if (selectedFiles.length > 0) {
        const uploadRes = await adminService.uploadVehicleImages(selectedFiles);
        if (uploadRes.success && uploadRes.urls) {
          uploadedImageUrls = uploadRes.urls;
        }
      }

      const payload = {
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        vehicleType,
        vehicleCategory: vehicleCategory || (vehicleType === 'Bus' ? 'AC Sleeper' : vehicleType === 'EV-Sewa' ? 'Electric Shuttle' : 'Sedan'),
        vehicleModel: vehicleModel || 'Standard Fleet Model',
        vehicleName: vehicleName || `${vehicleType} Express`,
        seatingCapacity: Number(seatingCapacity),
        ownerName,
        ownerMobileNumber,
        assignedDriver: assignedDriver || undefined,
        rcNumber: rcNumber || `RC-${vehicleNumber.replace(/\s+/g, '')}`,
        insurancePolicyNumber: insurancePolicyNumber || `INS-${Date.now()}`,
        insuranceExpiryDetails,
        fitnessDetails,
        fareRate: Number(fareRate),
        vehicleStatus,
        vehicleImages: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        route: {
          origin,
          destination,
          boardingPoints: boardingPoints ? boardingPoints.split(',').map(s => s.trim()) : [],
          droppingPoints: droppingPoints ? droppingPoints.split(',').map(s => s.trim()) : []
        },
        pickupDropDetails: {
          pickupLocation: origin,
          dropLocation: destination
        },
        busDetails: vehicleType === 'Bus' ? { busType, seatLayout, availableSeats: Number(seatingCapacity) } : undefined,
        evDetails: vehicleType === 'EV-Sewa' ? { batteryCapacity, rangeKm: Number(rangeKm) } : undefined,
        carDetails: vehicleType === 'Car' ? { ac: true, fuelType } : undefined
      };

      const res = await adminService.addVehicle(payload);
      if (res.success) {
        setMessage('Vehicle added to fleet successfully with photos!');
        setTimeout(() => {
          navigate('/admin/vehicles');
        }, 1200);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Add Fleet Vehicle</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Register new Bus, EV-Sewa electric shuttle, or Car into the fleet system.
          </p>
        </div>
      </div>

      {message && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#059669',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Check size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Vehicle Type Selector Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div
          onClick={() => handleTypeSelect('Bus')}
          style={{
            padding: '18px',
            borderRadius: '10px',
            cursor: 'pointer',
            border: `2px solid ${vehicleType === 'Bus' ? '#1d4ed8' : '#e2e8f0'}`,
            backgroundColor: vehicleType === 'Bus' ? '#eff6ff' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Bus size={26} color={vehicleType === 'Bus' ? '#1d4ed8' : '#64748b'} />
          <div>
            <strong style={{ display: 'block', color: '#0f172a' }}>1. Intercity Bus</strong>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Luxury & Sleeper Coaches</span>
          </div>
        </div>

        <div
          onClick={() => handleTypeSelect('EV-Sewa')}
          style={{
            padding: '18px',
            borderRadius: '10px',
            cursor: 'pointer',
            border: `2px solid ${vehicleType === 'EV-Sewa' ? '#10b981' : '#e2e8f0'}`,
            backgroundColor: vehicleType === 'EV-Sewa' ? '#ecfdf5' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Zap size={26} color={vehicleType === 'EV-Sewa' ? '#10b981' : '#64748b'} />
          <div>
            <strong style={{ display: 'block', color: '#0f172a' }}>2. EV-Sewa Shuttle</strong>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Green Electric Transit</span>
          </div>
        </div>

        <div
          onClick={() => handleTypeSelect('Car')}
          style={{
            padding: '18px',
            borderRadius: '10px',
            cursor: 'pointer',
            border: `2px solid ${vehicleType === 'Car' ? '#6366f1' : '#e2e8f0'}`,
            backgroundColor: vehicleType === 'Car' ? '#eef2ff' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Car size={26} color={vehicleType === 'Car' ? '#6366f1' : '#64748b'} />
          <div>
            <strong style={{ display: 'block', color: '#0f172a' }}>3. Car & Cab</strong>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sedan, SUV & Outstation</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Core Vehicle Information */}
        <div className="content-card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Core Vehicle Information</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Vehicle Registration Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. DL 01 AB 4321"
                value={vehicleNumber}
                onChange={e => setVehicleNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Commercial Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Royal Intercity Express"
                value={vehicleName}
                onChange={e => setVehicleName(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Vehicle Category</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. AC Sleeper 2+1"
                value={vehicleCategory}
                onChange={e => setVehicleCategory(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Model / Make</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Volvo 9600"
                value={vehicleModel}
                onChange={e => setVehicleModel(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Seating Capacity</label>
              <input
                type="number"
                className="form-control"
                value={seatingCapacity}
                onChange={e => setSeatingCapacity(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Owner Name</label>
              <input
                type="text"
                className="form-control"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Owner Mobile Number</label>
              <input
                type="text"
                className="form-control"
                value={ownerMobileNumber}
                onChange={e => setOwnerMobileNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Base Fare / Rate (â‚¹)</label>
              <input
                type="number"
                className="form-control"
                value={fareRate}
                onChange={e => setFareRate(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Assign Driver</label>
              <select
                className="form-control"
                value={assignedDriver}
                onChange={e => setAssignedDriver(e.target.value)}
              >
                <option value="">-- Unassigned (Assign Later) --</option>
                {drivers.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.mobileNumber}) - {d.driverStatus}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Status</label>
              <select
                className="form-control"
                value={vehicleStatus}
                onChange={e => setVehicleStatus(e.target.value)}
              >
                <option value="Active">Active (Available for Bookings)</option>
                <option value="Inactive">Inactive</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vehicle Photos Upload Section */}
        <div className="content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>Vehicle Photos</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                Upload up to 5 photos (JPG, JPEG, PNG, max 2MB each). First image is used as the primary thumbnail.
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: '600', padding: '4px 10px', borderRadius: '12px', backgroundColor: imagePreviews.length === 5 ? '#fef3c7' : '#f1f5f9', color: imagePreviews.length === 5 ? '#d97706' : '#475569' }}>
              {imagePreviews.length} / 5 Images
            </span>
          </div>

          {imageError && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{imageError}</span>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFilesSelect}
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            multiple
            style={{ display: 'none' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>
            {imagePreviews.map((item, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  aspectRatio: '4/3',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: idx === 0 ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  backgroundColor: '#f8fafc'
                }}
              >
                <img
                  src={item.previewUrl}
                  alt={`Vehicle preview ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {idx === 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      padding: '3px 7px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    <Star size={10} fill="#ffffff" />
                    PRIMARY
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  title="Remove image"
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.9)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.15s'
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            {imagePreviews.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  aspectRatio: '4/3',
                  borderRadius: '10px',
                  border: '2px dashed #93c5fd',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  color: '#2563eb',
                  transition: 'all 0.2s',
                  padding: '12px'
                }}
              >
                <Plus size={24} />
                <span style={{ fontSize: '0.78rem', fontWeight: '600' }}>+ Add Image</span>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>({5 - imagePreviews.length} left)</span>
              </button>
            )}
          </div>
        </div>

        {/* Route & Pickup/Drop Details */}
        <div className="content-card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Route & Pickup/Drop Schedule</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Origin / Pickup Location</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Delhi ISBT"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Destination / Drop Location</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Jaipur Sindhi Camp"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Boarding Points (Comma separated)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Point A (22:00), Point B (22:30)"
                value={boardingPoints}
                onChange={e => setBoardingPoints(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Dropping Points (Comma separated)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Drop X (04:00), Drop Y (04:30)"
                value={droppingPoints}
                onChange={e => setDroppingPoints(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Compliance & Legal Documents */}
        <div className="content-card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Compliance & Vehicle Documents</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">RC Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="RC Number"
                value={rcNumber}
                onChange={e => setRcNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Insurance Policy Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="Policy Number"
                value={insurancePolicyNumber}
                onChange={e => setInsurancePolicyNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Insurance Expiry Date</label>
              <input
                type="date"
                className="form-control"
                value={insuranceExpiryDetails}
                onChange={e => setInsuranceExpiryDetails(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fitness / Vehicle Check Details</label>
              <input
                type="text"
                className="form-control"
                value={fitnessDetails}
                onChange={e => setFitnessDetails(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '40px' }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/vehicles')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <PlusCircle size={18} />
            <span>{submitting ? 'Registering Vehicle...' : 'Save & Register Vehicle'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddVehicle;

