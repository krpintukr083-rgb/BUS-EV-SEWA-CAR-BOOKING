import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { PlusCircle, Check, AlertCircle, Truck, Bus, Zap, Car, Plus, Trash2, Image as ImageIcon, Upload, Star, Building, ShoppingBag, DollarSign, Calendar, MapPin, User, Phone, FileText } from 'lucide-react';

const AddVehicle = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Vehicle Source: 'OWN' | 'THIRD_PARTY'
  const [vehicleSource, setVehicleSource] = useState('OWN');

  // Vehicle Photos state (Maximum 5 images, Max 2MB each)
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  // General Form Fields
  const [vehicleType, setVehicleType] = useState('Bus');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleCategory, setVehicleCategory] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState(36);
  const [loadCapacity, setLoadCapacity] = useState('');
  const [ownerName, setOwnerName] = useState('Metro Transport Logistics Ltd');
  const [ownerMobileNumber, setOwnerMobileNumber] = useState('+919811122334');
  const [assignedDriver, setAssignedDriver] = useState('');
  const [fareRate, setFareRate] = useState(850);
  const [vehicleStatus, setVehicleStatus] = useState('Active');

  // Third-Party / Market-Hire Specific Fields
  const [vendorName, setVendorName] = useState('National Market Logistics / Transporter');
  const [vendorMobile, setVendorMobile] = useState('+919876012345');
  const [vendorAddress, setVendorAddress] = useState('Transport Nagar, Central Freight Terminal');
  const [thirdPartyDriverName, setThirdPartyDriverName] = useState('');
  const [thirdPartyDriverMobile, setThirdPartyDriverMobile] = useState('');
  const [thirdPartyDriverLicense, setThirdPartyDriverLicense] = useState('');
  const [hireAmount, setHireAmount] = useState(2800);
  const [additionalExpense, setAdditionalExpense] = useState(0);
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [hirePaymentStatus, setHirePaymentStatus] = useState('Pending');
  const [paymentReference, setPaymentReference] = useState('');
  const [tripReference, setTripReference] = useState('');
  const [hireNotes, setHireNotes] = useState('');

  // Documents
  const [rcNumber, setRcNumber] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiryDetails, setInsuranceExpiryDetails] = useState('2026-12-31');
  const [fitnessDetails, setFitnessDetails] = useState('State Transport Roadworthiness Certified');

  // Routes & Timing
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('06:00 AM');
  const [arrivalTime, setArrivalTime] = useState('11:30 AM');
  const [duration, setDuration] = useState('5h 30m');
  const [boardingPoints, setBoardingPoints] = useState('');
  const [droppingPoints, setDroppingPoints] = useState('');

  // Bus specifics
  const [busType, setBusType] = useState('AC Sleeper 2+1');
  const [seatLayout, setSeatLayout] = useState('2+1 Luxury Sleeper');

  // EV specifics
  const [batteryCapacity, setBatteryCapacity] = useState('');
  const [rangeKm, setRangeKm] = useState(280);

  // Car specifics
  const [fuelType, setFuelType] = useState('Electric');

  // Truck specifics
  const [cargoType, setCargoType] = useState('General Freight & Heavy Goods');
  const [grossVehicleWeight, setGrossVehicleWeight] = useState('16 Tonnes');

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

  const handleSourceSelect = source => {
    setVehicleSource(source);
    if (source === 'THIRD_PARTY') {
      setVehicleType('Bus');
      setVehicleCategory('Market Hired AC Bus');
      setVehicleModel('Volvo / Ashok Leyland');
      setVehicleName('Market Hired Bus');
      setSeatingCapacity(36);
      setLoadCapacity('');
      setFareRate(850);
      setHireAmount(2800);
      setOrigin('Delhi (Kashmere Gate ISBT)');
      setDestination('Jaipur (Sindhi Camp)');
      setOwnerName('Patel Road Logistics & Transport');
      setOwnerMobileNumber('+919876012345');
    } else {
      setVehicleType('Bus');
      setVehicleCategory('AC Sleeper 2+1 (Multi-Axle)');
      setVehicleModel('Volvo 9600 Multi-Axle');
      setVehicleName('Royal Express Deluxe');
      setSeatingCapacity(36);
      setLoadCapacity('');
      setFareRate(850);
      setOwnerName('Metro Transport Logistics Ltd');
      setOwnerMobileNumber('+919811122334');
    }
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

      const isThirdParty = vehicleSource === 'THIRD_PARTY';

      const payload = {
        vehicleSource,
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        vehicleType,
        vehicleCategory: vehicleCategory || (isThirdParty ? 'Market Hired Vehicle' : 'Commercial Passenger Fleet'),
        vehicleModel: vehicleModel || 'Standard Fleet Model',
        vehicleName: vehicleName || `${vehicleType} Express`,
        seatingCapacity: Number(seatingCapacity) || 1,
        loadCapacity: loadCapacity || (vehicleType === 'Truck' ? '10 Tonnes' : ''),
        ownerName: isThirdParty ? (vendorName || ownerName) : ownerName,
        ownerMobileNumber: isThirdParty ? (vendorMobile || ownerMobileNumber) : ownerMobileNumber,
        assignedDriver: assignedDriver || undefined,
        thirdPartyDriver: isThirdParty ? {
          driverName: thirdPartyDriverName,
          driverMobile: thirdPartyDriverMobile,
          driverLicenseNumber: thirdPartyDriverLicense
        } : undefined,
        vendorDetails: isThirdParty ? {
          vendorName,
          vendorMobile,
          vendorAddress
        } : undefined,
        hireDetails: isThirdParty ? {
          hireAmount: Number(hireAmount) || 0,
          additionalExpense: Number(additionalExpense) || 0,
          hireDate: hireDate ? new Date(hireDate) : new Date(),
          paymentStatus: hirePaymentStatus,
          paymentReference,
          tripReference,
          pickup: origin,
          destination,
          notes: hireNotes
        } : undefined,
        rcNumber: rcNumber || `RC-${vehicleNumber.replace(/\s+/g, '')}`,
        insurancePolicyNumber: insurancePolicyNumber || `INS-${Date.now()}`,
        insuranceExpiryDetails,
        fitnessDetails,
        fareRate: Number(fareRate) || (isThirdParty ? Number(hireAmount) : 500),
        vehicleStatus,
        vehicleImages: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        route: {
          origin,
          destination,
          departureTime: departureTime || '06:00 AM',
          arrivalTime: arrivalTime || '11:30 AM',
          duration: duration || '5h 30m',
          boardingPoints: boardingPoints ? boardingPoints.split(',').map(s => s.trim()) : [],
          droppingPoints: droppingPoints ? droppingPoints.split(',').map(s => s.trim()) : []
        },
        pickupDropDetails: {
          pickupLocation: origin,
          dropLocation: destination
        },
        busDetails: vehicleType === 'Bus' ? { busType, seatLayout, availableSeats: Number(seatingCapacity) } : undefined,
        evDetails: vehicleType === 'EV-Sewa' ? { batteryCapacity, rangeKm: Number(rangeKm) } : undefined,
        carDetails: vehicleType === 'Car' ? { ac: true, fuelType } : undefined,
        truckDetails: vehicleType === 'Truck' ? { cargoType, grossVehicleWeight } : undefined
      };

      const res = await adminService.addVehicle(payload);
      if (res.success) {
        setMessage(isThirdParty ? 'Third-Party / Market-Hired vehicle added successfully and recorded in expenses!' : 'Own vehicle added to fleet successfully!');
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
    <div style={{ maxWidth: '950px' }}>
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Add Vehicle (Own or Market-Hired)</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Register Company-Owned fleet vehicles or Third-Party / Market-Hired vehicles (e.g. Truck Hire From Market).
          </p>
        </div>
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

      {/* 1. VEHICLE SOURCE SELECTION (OWN VS THIRD-PARTY) */}
      <div className="content-card" style={{ marginBottom: '20px', border: '2px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={18} color="#2563eb" /> Step 1: Select Vehicle Source / Ownership Model
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div
            onClick={() => handleSourceSelect('OWN')}
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: `2px solid ${vehicleSource === 'OWN' ? '#2563eb' : '#e2e8f0'}`,
              backgroundColor: vehicleSource === 'OWN' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '1rem', color: vehicleSource === 'OWN' ? '#1e40af' : '#334155' }}>
                1. Own / Company Fleet Vehicle
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: '#dbeafe', color: '#1e40af' }}>
                INTERNAL FLEET
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Company-owned Buses, EV-Sewa electric shuttles, or Cars operated directly by company drivers.
            </p>
          </div>

          <div
            onClick={() => handleSourceSelect('THIRD_PARTY')}
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: `2px solid ${vehicleSource === 'THIRD_PARTY' ? '#ea580c' : '#e2e8f0'}`,
              backgroundColor: vehicleSource === 'THIRD_PARTY' ? '#fff7ed' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '1rem', color: vehicleSource === 'THIRD_PARTY' ? '#c2410c' : '#334155' }}>
                2. Third-Party / Market-Hired Vehicle
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: '#ffedd5', color: '#c2410c' }}>
                MARKET HIRE
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Hired from market vendors (e.g., external buses, cars, EV-Sewa). Tracks hire amount & owner payouts separately.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 2: Vehicle Type Selection */}
        <div className="content-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
            Step 2: Select Vehicle Type
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleTypeSelect('Bus')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: '600',
                border: `2px solid ${vehicleType === 'Bus' ? '#2563eb' : '#cbd5e1'}`,
                backgroundColor: vehicleType === 'Bus' ? '#eff6ff' : '#ffffff',
                color: vehicleType === 'Bus' ? '#1d4ed8' : '#475569',
                cursor: 'pointer'
              }}
            >
              <Bus size={18} /> Bus
            </button>
            <button
              type="button"
              onClick={() => handleTypeSelect('EV-Sewa')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: '600',
                border: `2px solid ${vehicleType === 'EV-Sewa' ? '#10b981' : '#cbd5e1'}`,
                backgroundColor: vehicleType === 'EV-Sewa' ? '#ecfdf5' : '#ffffff',
                color: vehicleType === 'EV-Sewa' ? '#047857' : '#475569',
                cursor: 'pointer'
              }}
            >
              <Zap size={18} /> EV-Sewa Shuttle
            </button>
            <button
              type="button"
              onClick={() => handleTypeSelect('Car')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: '600',
                border: `2px solid ${vehicleType === 'Car' ? '#8b5cf6' : '#cbd5e1'}`,
                backgroundColor: vehicleType === 'Car' ? '#f5f3ff' : '#ffffff',
                color: vehicleType === 'Car' ? '#6d28d9' : '#475569',
                cursor: 'pointer'
              }}
            >
              <Car size={18} /> Car / SUV
            </button>
          </div>
        </div>

        {/* Step 3: Third-Party Market Hire Details (Visible if THIRD_PARTY) */}
        {vehicleSource === 'THIRD_PARTY' && (
          <div className="content-card" style={{ marginBottom: '20px', borderLeft: '4px solid #ea580c', backgroundColor: '#fffbf5' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#c2410c', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={20} color="#ea580c" /> Third-Party / Market-Hire Financials & Vendor Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#9a3412' }}>Vendor / Transporter Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Patel Roadways Transport"
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#9a3412' }}>Vendor Mobile Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +919876012345"
                  value={vendorMobile}
                  onChange={e => setVendorMobile(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', color: '#9a3412' }}>Hire Amount (₹) * (e.g. ₹2,800)</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="2800"
                  value={hireAmount}
                  onChange={e => setHireAmount(e.target.value)}
                  className="form-control"
                  style={{ fontWeight: '700', color: '#ea580c' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Additional Expense (₹) (Tolls/Loading)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={additionalExpense}
                  onChange={e => setAdditionalExpense(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hire Date</label>
                <input
                  type="date"
                  value={hireDate}
                  onChange={e => setHireDate(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Owner Payment Status</label>
                <select
                  value={hirePaymentStatus}
                  onChange={e => setHirePaymentStatus(e.target.value)}
                  className="form-control"
                >
                  <option value="Pending">Pending (Unpaid to Owner)</option>
                  <option value="Paid">Paid (Settled to Owner)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Trip / Booking Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TRIP-MKT-991"
                  value={tripReference}
                  onChange={e => setTripReference(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Ref / Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-REF-4820129"
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>

            {/* Third-Party Driver Details */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #fed7aa' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#9a3412', marginBottom: '12px' }}>
                Hired Vehicle Driver Details (If provided by market vendor)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Driver Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Singh"
                    value={thirdPartyDriverName}
                    onChange={e => setThirdPartyDriverName(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Driver Mobile</label>
                  <input
                    type="text"
                    placeholder="e.g. +919876543210"
                    value={thirdPartyDriverMobile}
                    onChange={e => setThirdPartyDriverMobile(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Driver License Number</label>
                  <input
                    type="text"
                    placeholder="e.g. DL-042019001928"
                    value={thirdPartyDriverLicense}
                    onChange={e => setThirdPartyDriverLicense(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Hire Notes & Contract Specifics</label>
              <textarea
                rows="2"
                placeholder="Notes on hire contract, load requirements, overflow consignment reasons, etc."
                value={hireNotes}
                onChange={e => setHireNotes(e.target.value)}
                className="form-control"
              />
            </div>
          </div>
        )}

        {/* Step 4: Core Vehicle Details */}
        <div className="content-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
            Step {vehicleSource === 'THIRD_PARTY' ? '4' : '3'}: Vehicle Specifications & Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Vehicle Registration Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. DL 01 AB 1234 or HR 55 AB 9988"
                value={vehicleNumber}
                onChange={e => setVehicleNumber(e.target.value)}
                className="form-control"
                style={{ textTransform: 'uppercase', fontWeight: '700' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Model / Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tata Prima / Volvo 9600"
                value={vehicleModel}
                onChange={e => setVehicleModel(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Display Name</label>
              <input
                type="text"
                placeholder="e.g. Market Hired Truck #1 or Royal Deluxe"
                value={vehicleName}
                onChange={e => setVehicleName(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Category</label>
              <input
                type="text"
                placeholder="e.g. 10-Ton Heavy Haulage or AC Sleeper"
                value={vehicleCategory}
                onChange={e => setVehicleCategory(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{vehicleType === 'Truck' ? 'Cabin Capacity (Persons)' : 'Seating Capacity'}</label>
              <input
                type="number"
                min="1"
                value={seatingCapacity}
                onChange={e => setSeatingCapacity(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Load / Carrying Capacity</label>
              <input
                type="text"
                placeholder="e.g. 10 Tonnes / 1500 kg / 36 Seats"
                value={loadCapacity}
                onChange={e => setLoadCapacity(e.target.value)}
                className="form-control"
              />
            </div>

            {vehicleSource === 'OWN' && (
              <>
                <div className="form-group">
                  <label className="form-label">Owner / Entity Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Owner Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={ownerMobileNumber}
                    onChange={e => setOwnerMobileNumber(e.target.value)}
                    className="form-control"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Assign Registered Driver (Optional)</label>
              <select
                value={assignedDriver}
                onChange={e => setAssignedDriver(e.target.value)}
                className="form-control"
              >
                <option value="">-- No Driver Assigned (Can assign later) --</option>
                {drivers.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.mobileNumber}) - Status: {d.driverStatus}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Base Rate / Customer Fare (₹)</label>
              <input
                type="number"
                min="0"
                value={fareRate}
                onChange={e => setFareRate(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Status</label>
              <select
                value={vehicleStatus}
                onChange={e => setVehicleStatus(e.target.value)}
                className="form-control"
              >
                <option value="Active">Active (Ready for booking)</option>
                <option value="Inactive">Inactive</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </div>

          {/* Route details */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '12px' }}>
              Pickup & Destination Route
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Origin / Pickup Location</label>
                <input
                  type="text"
                  placeholder="e.g. Delhi Okhla Industrial Area"
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Destination / Drop Location</label>
                <input
                  type="text"
                  placeholder="e.g. Jaipur Sitapura Industrial Hub"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Vehicle Photos */}
        <div className="content-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
            Vehicle Photos (Max 5 images, Max 2MB each)
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
            Upload real photos of the vehicle (exterior, interior, cargo bay).
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFilesSelect}
            multiple
            accept="image/png, image/jpeg, image/jpg"
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {imagePreviews.map((img, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  width: '100px',
                  height: '80px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #cbd5e1'
                }}
              >
                <img src={img.previewUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {imagePreviews.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100px',
                  height: '80px',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '0.75rem'
                }}
              >
                <Upload size={18} /> Add Photo
              </button>
            )}
          </div>

          {imageError && (
            <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '8px' }}>{imageError}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/vehicles')}
            className="btn btn-outline"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{
              backgroundColor: vehicleSource === 'THIRD_PARTY' ? '#ea580c' : '#2563eb',
              borderColor: vehicleSource === 'THIRD_PARTY' ? '#ea580c' : '#2563eb'
            }}
          >
            {submitting ? 'Registering Vehicle...' : vehicleSource === 'THIRD_PARTY' ? 'Save Market Hired Vehicle & Record Expense' : 'Register Own Fleet Vehicle'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddVehicle;
