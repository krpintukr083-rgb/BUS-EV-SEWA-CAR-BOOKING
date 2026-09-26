const mongoose = require('mongoose');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Cancellation = require('../models/Cancellation');
const Compensation = require('../models/Compensation');
const Insurance = require('../models/Insurance');
const Notification = require('../models/Notification');
const Support = require('../models/Support');
const Policy = require('../models/Policy');
const ServiceControl = require('../models/ServiceControl');
const Expense = require('../models/Expense');
const Withdrawal = require('../models/Withdrawal');
const Incentive = require('../models/Incentive');
const { dashboardCache } = require('../utils/cache');

const getBookingQuery = (id) => {
  return mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { bookingId: id };
};

// ==========================================
// 1. ADMIN DASHBOARD
// ==========================================
exports.getDashboardStats = async (req, res, next) => {
  try {
    const cachedData = dashboardCache.get('admin_dashboard_stats');
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData
      });
    }

    const [
      customersCount,
      driversCount,
      vehiclesCount,
      activeVehiclesCount,
      inactiveVehiclesCount,
      blockedVehiclesCount,
      ownVehiclesCount,
      thirdPartyVehiclesCount,
      bookingsCount,
      ownBookingsCount,
      thirdPartyBookingsCount,
      paymentAggregate,
      hireExpenseAggregate,
      pendingDriverVerificationCount,
      pendingDocumentsCount,
      cancellationRecordsCount,
      compensationRecordsCount,
      insuranceRecordsCount,
      serviceControlDoc,
      recentBookings
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Driver.countDocuments(),
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ vehicleStatus: 'Active' }),
      Vehicle.countDocuments({ vehicleStatus: 'Inactive' }),
      Vehicle.countDocuments({ vehicleStatus: 'Blocked' }),
      Vehicle.countDocuments({ vehicleSource: { $ne: 'THIRD_PARTY' } }),
      Vehicle.countDocuments({ vehicleSource: 'THIRD_PARTY' }),
      Booking.countDocuments(),
      Booking.countDocuments({ vehicleSource: { $ne: 'THIRD_PARTY' } }),
      Booking.countDocuments({ vehicleSource: 'THIRD_PARTY' }),
      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalPaymentsAmount: { $sum: '$bookingAmount' },
            paymentsCount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Successful'] }, 1, 0] }
            }
          }
        }
      ]),
      Expense.aggregate([
        {
          $group: {
            _id: null,
            totalHireExpense: { $sum: '$totalAmount' },
            pendingHireExpense: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, '$totalAmount', 0] }
            },
            paidHireExpense: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalAmount', 0] }
            },
            pendingHireCount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, 1, 0] }
            },
            paidHireCount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] }
            }
          }
        }
      ]),
      Driver.countDocuments({
        $or: [
          { drivingLicenceStatus: 'Pending' },
          { rcStatus: 'Pending' },
          { insuranceStatus: 'Pending' },
          { fitnessStatus: 'Pending' }
        ]
      }),
      Driver.countDocuments({
        $or: [{ drivingLicenceStatus: 'Pending' }, { rcStatus: 'Pending' }]
      }),
      Cancellation.countDocuments(),
      Compensation.countDocuments(),
      Insurance.countDocuments(),
      ServiceControl.findOne().lean(),
      Booking.find()
        .select('bookingId customer serviceType bookingMode pickupLocation dropLocation fare driverPaymentAmount paymentStatus bookingStatus travelDate vehicleSource createdAt vehicle driver')
        .populate('vehicle', 'vehicleName vehicleNumber vehicleType vehicleCategory seatingCapacity vehicleStatus vehicleSource')
        .populate('driver', 'name mobileNumber profilePhoto driverStatus')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()
    ]);

    let serviceControl = serviceControlDoc;
    if (!serviceControl) {
      serviceControl = await ServiceControl.create({
        busService: 'Active',
        evSewaService: 'Active',
        carService: 'Active'
      });
    }

    const totalPaymentsAmount = paymentAggregate.length > 0 ? (paymentAggregate[0].totalPaymentsAmount || 0) : 0;
    const paymentsCount = paymentAggregate.length > 0 ? (paymentAggregate[0].paymentsCount || 0) : 0;
    const hireSummary = hireExpenseAggregate.length > 0 ? hireExpenseAggregate[0] : {
      totalHireExpense: 0,
      pendingHireExpense: 0,
      paidHireExpense: 0,
      pendingHireCount: 0,
      paidHireCount: 0
    };

    const responsePayload = {
      counts: {
        customers: customersCount,
        drivers: driversCount,
        vehicles: vehiclesCount,
        activeVehicles: activeVehiclesCount,
        inactiveVehicles: inactiveVehiclesCount,
        blockedVehicles: blockedVehiclesCount,
        ownVehicles: ownVehiclesCount,
        thirdPartyVehicles: thirdPartyVehiclesCount,
        bookings: bookingsCount,
        ownBookings: ownBookingsCount,
        thirdPartyBookings: thirdPartyBookingsCount,
        paymentsCount,
        totalPaymentsAmount,
        totalThirdPartyHireExpense: hireSummary.totalHireExpense || 0,
        pendingThirdPartyHireExpense: hireSummary.pendingHireExpense || 0,
        paidThirdPartyHireExpense: hireSummary.paidHireExpense || 0,
        pendingThirdPartyHireCount: hireSummary.pendingHireCount || 0,
        paidThirdPartyHireCount: hireSummary.paidHireCount || 0,
        pendingDriverVerification: pendingDriverVerificationCount,
        pendingDocuments: pendingDocumentsCount,
        cancellationRecords: cancellationRecordsCount,
        compensationRecords: compensationRecordsCount,
        accidentInsuranceRecords: insuranceRecordsCount
      },
      serviceControl,
      recentBookings
    };

    // Cache non-sensitive aggregate metrics for 30 seconds
    dashboardCache.set('admin_dashboard_stats', responsePayload, 30000);

    res.json({
      success: true,
      data: responsePayload
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. CUSTOMER MANAGEMENT
// ==========================================
exports.getCustomers = async (req, res, next) => {
  try {
    const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 });

    const customersWithBookingStats = await Promise.all(
      customers.map(async customer => {
        const bookingsCount = await Booking.countDocuments({ 'customer.phone': customer.phone });
        const totalSpentResult = await Booking.aggregate([
          { $match: { 'customer.phone': customer.phone, paymentStatus: 'Successful' } },
          { $group: { _id: null, total: { $sum: '$fare' } } }
        ]);
        const totalSpent = totalSpentResult.length > 0 ? totalSpentResult[0].total : 0;

        return {
          id: customer._id,
          name: customer.name,
          mobileNumber: customer.phone,
          email: customer.email,
          bookingRecordsCount: bookingsCount,
          totalSpent,
          accountStatus: customer.status,
          createdAt: customer.createdAt
        };
      })
    );

    res.json({ success: true, count: customersWithBookingStats.length, data: customersWithBookingStats });
  } catch (error) {
    next(error);
  }
};

exports.updateCustomerStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const customer = await User.findById(req.params.id);
    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    customer.status = status;
    await customer.save();
    res.json({ success: true, message: `Customer status updated to ${status}`, data: customer });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// IMAGE & ASSET UPLOADS
// ==========================================
exports.uploadSingleImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded or invalid file format' });
    }
    const relativeUrl = `/uploads/${req.file.filename}`;
    const host = req.get('host');
    const protocol = req.protocol || 'http';
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      url: relativeUrl,
      fullUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadMultipleImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files uploaded or invalid file format' });
    }
    const host = req.get('host');
    const protocol = req.protocol || 'http';

    const urls = req.files.map(file => `/uploads/${file.filename}`);
    const fullUrls = req.files.map(file => `${protocol}://${host}/uploads/${file.filename}`);

    res.json({
      success: true,
      message: `${req.files.length} images uploaded successfully`,
      urls,
      fullUrls,
      count: req.files.length
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. DRIVER MANAGEMENT & VERIFICATION
// ==========================================
exports.getDrivers = async (req, res, next) => {
  try {
    const driversList = await Driver.find().populate('assignedVehicle').populate('user').sort({ createdAt: -1 });
    const formattedDrivers = driversList.map(driver => {
      const obj = driver.toObject();
      const docsObj = {
        citizenship: {
          documentNumber: obj.citizenshipNumber || '',
          url: obj.citizenshipDocFront || obj.citizenshipDoc || '',
          fileUrl: obj.citizenshipDocFront || obj.citizenshipDoc || '',
          docFront: obj.citizenshipDocFront || obj.citizenshipDoc || '',
          docBack: obj.citizenshipDocBack || '',
          issueDate: obj.citizenshipIssueDate || '',
          citizenshipIssueDate: obj.citizenshipIssueDate || '',
          status: obj.citizenshipStatus || 'Pending'
        },
        drivingLicence: {
          documentNumber: obj.drivingLicenceNumber || '',
          url: obj.drivingLicenceDoc || '',
          fileUrl: obj.drivingLicenceDoc || '',
          expiryDate: obj.drivingLicenceExpiry || '',
          status: obj.drivingLicenceStatus || 'Pending'
        },
        drivingLicense: {
          documentNumber: obj.drivingLicenceNumber || '',
          url: obj.drivingLicenceDoc || '',
          fileUrl: obj.drivingLicenceDoc || '',
          expiryDate: obj.drivingLicenceExpiry || '',
          status: obj.drivingLicenceStatus || 'Pending'
        },
        rc: {
          documentNumber: obj.rcNumber || '',
          rcNumber: obj.rcNumber || '',
          vehicleNumber: obj.vehicleNumber || '',
          rcExpiry: obj.rcExpiry || '',
          rcDoc: obj.rcDoc || '',
          rcStatus: obj.rcStatus || 'Pending Verification',
          url: obj.rcDoc || '',
          fileUrl: obj.rcDoc || '',
          expiryDate: obj.rcExpiry || '',
          status: obj.rcStatus || 'Pending'
        },
        vehicleRc: {
          documentNumber: obj.rcNumber || '',
          rcNumber: obj.rcNumber || '',
          vehicleNumber: obj.vehicleNumber || '',
          rcExpiry: obj.rcExpiry || '',
          rcDoc: obj.rcDoc || '',
          rcStatus: obj.rcStatus || 'Pending Verification',
          url: obj.rcDoc || '',
          fileUrl: obj.rcDoc || '',
          expiryDate: obj.rcExpiry || '',
          status: obj.rcStatus || 'Pending'
        },
        insurance: {
          documentNumber: obj.insurancePolicyNumber || '',
          url: obj.insuranceDoc || '',
          fileUrl: obj.insuranceDoc || '',
          expiryDate: obj.insuranceExpiryDetails || '',
          status: obj.insuranceStatus || 'Pending'
        },
        fitness: {
          documentNumber: obj.fitnessDetails || '',
          url: obj.fitnessDoc || '',
          fileUrl: obj.fitnessDoc || '',
          expiryDate: obj.fitnessExpiry || '',
          status: obj.fitnessStatus || 'Pending'
        },
        fitnessCertificate: {
          documentNumber: obj.fitnessDetails || '',
          url: obj.fitnessDoc || '',
          fileUrl: obj.fitnessDoc || '',
          expiryDate: obj.fitnessExpiry || '',
          status: obj.fitnessStatus || 'Pending'
        },
        routePermit: {
          description: obj.routePermit?.description || obj.routePermitDescription || '',
          documentNumber: obj.routePermit?.description || obj.routePermitDescription || '',
          url: obj.routePermit?.document || obj.routePermitDoc || '',
          fileUrl: obj.routePermit?.document || obj.routePermitDoc || '',
          document: obj.routePermit?.document || obj.routePermitDoc || '',
          status: obj.routePermit?.status || obj.routePermitStatus || 'Not Submitted',
          rejectionReason: (obj.routePermit?.status === 'Rejected' || obj.routePermitStatus === 'Rejected') ? (obj.routePermit?.rejectionReason || obj.rejectionReason || '') : ''
        }
      };

      return {
        ...obj,
        rcNumber: obj.rcNumber || '',
        vehicleNumber: obj.vehicleNumber || '',
        rcExpiry: obj.rcExpiry || '',
        rcDoc: obj.rcDoc || '',
        rcStatus: obj.rcStatus || 'Pending Verification',
        drivingLicenseDoc: obj.drivingLicenceDoc,
        vehicleRcDoc: obj.rcDoc,
        fitnessCertificateDoc: obj.fitnessDoc,
        routePermitDoc: obj.routePermit?.document || obj.routePermitDoc || '',
        routePermitDescription: obj.routePermit?.description || obj.routePermitDescription || '',
        routePermitStatus: obj.routePermit?.status || obj.routePermitStatus || 'Not Submitted',
        documents: docsObj
      };
    });

    res.json({ success: true, count: formattedDrivers.length, data: formattedDrivers });
  } catch (error) {
    next(error);
  }
};

exports.addDriver = async (req, res, next) => {
  try {
    const {
      name,
      mobileNumber,
      email,
      password,
      drivingLicenceNumber,
      rcNumber,
      insurancePolicyNumber,
      fitnessDetails,
      assignedVehicle,
      driverPhoto,
      profilePhoto
    } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { phone: mobileNumber }] });
    if (user) {
      user.role = 'driver';
      user.status = 'Active';
      if (password) user.password = password;
      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        phone: mobileNumber,
        password: password || 'Driver@123',
        role: 'driver',
        status: 'Active'
      });
    }

    const photoToSave =
      (req.file ? `/uploads/${req.file.filename}` : null) ||
      driverPhoto ||
      profilePhoto ||
      'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80';

    const driver = await Driver.create({
      user: user._id,
      name,
      mobileNumber,
      drivingLicenceNumber,
      rcNumber: rcNumber || '',
      insurancePolicyNumber: insurancePolicyNumber || '',
      fitnessDetails: fitnessDetails || 'State Transport Safety Certified',
      assignedVehicle: assignedVehicle || null,
      driverPhoto: photoToSave,
      profilePhoto: photoToSave,
      driverStatus: 'Active',
      drivingLicenceStatus: 'Approved',
      rcStatus: 'Approved',
      insuranceStatus: 'Approved',
      fitnessStatus: 'Approved'
    });

    // If assigned vehicle was selected, link driver to vehicle
    if (assignedVehicle) {
      await Vehicle.findByIdAndUpdate(assignedVehicle, { assignedDriver: driver._id });
    }

    res.status(201).json({ success: true, message: 'Driver added successfully', data: driver });
  } catch (error) {
    next(error);
  }
};

exports.updateDriver = async (req, res, next) => {
  try {
    const {
      name,
      mobileNumber,
      driverStatus,
      assignedVehicle,
      drivingLicenceNumber,
      driverPhoto,
      profilePhoto,
      canViewCustomerPhone
    } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (canViewCustomerPhone !== undefined && typeof canViewCustomerPhone !== 'boolean') {
      return res.status(400).json({ success: false, message: 'canViewCustomerPhone must be a boolean' });
    }

    if (name) driver.name = name;
    if (mobileNumber) driver.mobileNumber = mobileNumber;
    if (driverStatus) driver.driverStatus = driverStatus;
    if (drivingLicenceNumber) driver.drivingLicenceNumber = drivingLicenceNumber;
    if (canViewCustomerPhone !== undefined) driver.canViewCustomerPhone = canViewCustomerPhone;

    if (req.file) {
      const uploadedUrl = `/uploads/${req.file.filename}`;
      driver.driverPhoto = uploadedUrl;
      driver.profilePhoto = uploadedUrl;
    } else if (driverPhoto !== undefined) {
      driver.driverPhoto = driverPhoto;
      driver.profilePhoto = driverPhoto;
    } else if (profilePhoto !== undefined) {
      driver.driverPhoto = profilePhoto;
      driver.profilePhoto = profilePhoto;
    }

    if (assignedVehicle !== undefined) {
      // Clear old vehicle assignedDriver
      if (driver.assignedVehicle) {
        await Vehicle.findByIdAndUpdate(driver.assignedVehicle, { assignedDriver: null });
      }
      driver.assignedVehicle = assignedVehicle || null;
      if (assignedVehicle) {
        await Vehicle.findByIdAndUpdate(assignedVehicle, { assignedDriver: driver._id });
      }
    }

    await driver.save();
    res.json({ success: true, message: 'Driver updated successfully', data: driver });
  } catch (error) {
    next(error);
  }
};

exports.verifyDriverDocuments = async (req, res, next) => {
  try {
    const {
      citizenshipStatus,
      drivingLicenceStatus,
      rcStatus,
      insuranceStatus,
      fitnessStatus,
      routePermitStatus,
      rejectionReason
    } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const targetDocType = req.body.docType || req.params.docType;
    const targetStatus = req.body.status || req.body.action || req.params.status;

    // Single document action handler
    if (targetDocType && targetStatus) {
      const cleanType = targetDocType.toLowerCase().replace(/[^a-z0-9]/g, '');
      let normalizeStatus = targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1).toLowerCase(); // 'Approved', 'Rejected', 'Pending'
      if (normalizeStatus === 'Approve') normalizeStatus = 'Approved';
      if (normalizeStatus === 'Reject') normalizeStatus = 'Rejected';
      if (normalizeStatus === 'Pending') normalizeStatus = 'Pending Verification';
      console.log(`[DEBUG VERIFY] cleanType=${cleanType}, normalizeStatus=${normalizeStatus}`);

      if (normalizeStatus === 'Rejected' && (!rejectionReason || !rejectionReason.trim())) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required when rejecting a document' });
      }

      switch (cleanType) {
        case 'citizenship':
        case 'citizenshipdoc':
          driver.citizenshipStatus = normalizeStatus;
          break;
        case 'drivinglicence':
        case 'drivinglicense':
          driver.drivingLicenceStatus = normalizeStatus;
          console.log(`[DEBUG VERIFY] Set drivingLicenceStatus to ${normalizeStatus}`);
          break;
        case 'rc':
        case 'vehiclerc':
          driver.rcStatus = normalizeStatus;
          break;
        case 'insurance':
          driver.insuranceStatus = normalizeStatus;
          break;
        case 'fitness':
        case 'fitnesscertificate':
          driver.fitnessStatus = normalizeStatus;
          break;
        case 'routepermit':
        case 'route_permit':
        case 'routepermitdoc':
          if (!driver.routePermit) driver.routePermit = {};
          driver.routePermit.status = normalizeStatus;
          driver.routePermitStatus = normalizeStatus;
          if (normalizeStatus === 'Rejected' && rejectionReason) {
            driver.routePermit.rejectionReason = rejectionReason.trim();
          }
          break;
        default:
          return res.status(400).json({ success: false, message: `Invalid document type '${targetDocType}'` });
      }

      if (rejectionReason !== undefined) {
        driver.rejectionReason = rejectionReason.trim();
      }
    } else {
      // Multi-field update
      if (citizenshipStatus) driver.citizenshipStatus = citizenshipStatus;
      if (drivingLicenceStatus) driver.drivingLicenceStatus = drivingLicenceStatus;
      if (rcStatus) driver.rcStatus = rcStatus;
      if (insuranceStatus) driver.insuranceStatus = insuranceStatus;
      if (fitnessStatus) driver.fitnessStatus = fitnessStatus;
      if (routePermitStatus) {
        if (!driver.routePermit) driver.routePermit = {};
        driver.routePermit.status = routePermitStatus;
        driver.routePermitStatus = routePermitStatus;
      }
      if (rejectionReason !== undefined) driver.rejectionReason = rejectionReason;
    }

    // Calculate overall driver status
    const allStatuses = [
      driver.citizenshipStatus,
      driver.drivingLicenceStatus,
      driver.rcStatus,
      driver.insuranceStatus,
      driver.fitnessStatus,
      driver.routePermit?.status || driver.routePermitStatus
    ].filter(Boolean).map(s => (s || '').toLowerCase());

    if (allStatuses.some(s => s === 'rejected')) {
      driver.driverStatus = 'Rejected';
    } else if (allStatuses.every(s => s === 'approved')) {
      driver.driverStatus = 'Active';
    } else {
      driver.driverStatus = 'Pending Verification';
    }

    await driver.save();
    res.json({
      success: true,
      message: 'Driver document verification status updated',
      data: driver
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDriverStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive', 'Blocked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Active, Inactive, or Blocked' });
    }

    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    driver.driverStatus = status;
    await driver.save();

    // Also sync user model status
    await User.findByIdAndUpdate(driver.user, { status });

    res.json({ success: true, message: `Driver status changed to ${status}`, data: driver });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. VEHICLE MANAGEMENT (BUS, EV-SEWA, CAR, TRUCK & MARKET HIRE)
// ==========================================
exports.getVehicles = async (req, res, next) => {
  try {
    const { type, source } = req.query;
    const query = {};
    if (type && type !== 'All') query.vehicleType = type;
    if (source && source !== 'All') query.vehicleSource = source;

    const vehicles = await Vehicle.find(query).populate('assignedDriver').sort({ createdAt: -1 });
    
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (error) {
    next(error);
  }
};

const parseJsonIfString = (val, defaultVal) => {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      return defaultVal !== undefined ? defaultVal : val;
    }
  }
  return val;
};

exports.addVehicle = async (req, res, next) => {
  try {
    const {
      vehicleSource = 'OWN',
      vehicleNumber,
      vehicleType,
      vehicleCategory,
      vehicleModel,
      vehicleName,
      seatingCapacity,
      loadCapacity,
      ownerName,
      ownerMobileNumber,
      assignedDriver,
      thirdPartyDriver,
      vendorDetails,
      hireDetails,
      rcNumber,
      rcDocument,
      insurancePolicyNumber,
      insuranceDocument,
      insuranceExpiryDetails,
      fitnessDetails,
      fitnessDocument,
      vehicleImages,
      fareRate,
      route,
      pickupDropDetails,
      vehicleStatus,
      busDetails,
      evDetails,
      carDetails,
      truckDetails
    } = req.body;

    const parsedThirdPartyDriver = parseJsonIfString(thirdPartyDriver, { driverName: '', driverMobile: '', driverLicenseNumber: '' });
    const parsedVendorDetails = parseJsonIfString(vendorDetails, { vendorName: '', vendorMobile: '', vendorAddress: '' });
    const parsedHireDetails = parseJsonIfString(hireDetails, {
      hireAmount: 0,
      additionalExpense: 0,
      hireDate: new Date(),
      paymentStatus: 'Pending',
      paidAmount: 0,
      paymentDate: null,
      paymentReference: '',
      tripReference: '',
      pickup: '',
      destination: '',
      notes: ''
    });
    const parsedRoute = parseJsonIfString(route, { origin: '', destination: '', boardingPoints: [], droppingPoints: [] });
    const parsedPickupDrop = parseJsonIfString(pickupDropDetails, { pickupLocation: '', dropLocation: '' });
    const parsedBusDetails = parseJsonIfString(busDetails, { busType: 'AC Sleeper', seatLayout: '2+1 Luxury Sleeper', availableSeats: seatingCapacity || 36 });
    const parsedEvDetails = parseJsonIfString(evDetails, { rangeKm: 280 });
    const parsedCarDetails = parseJsonIfString(carDetails, { ac: true, fuelType: 'Electric / Hybrid' });
    const parsedTruckDetails = parseJsonIfString(truckDetails, { cargoType: 'General Freight', grossVehicleWeight: '16 Tonnes', axleCount: 2 });

    const existingVehicle = await Vehicle.findOne({ vehicleNumber: vehicleNumber.toUpperCase().trim() });
    if (existingVehicle) {
      return res.status(400).json({ success: false, message: 'Vehicle with this number already exists' });
    }

    let finalImages = [];
    if (req.files && req.files.length > 0) {
      finalImages = req.files.map(f => `/uploads/${f.filename}`);
    } else if (Array.isArray(vehicleImages) && vehicleImages.length > 0) {
      finalImages = vehicleImages.slice(0, 5);
    } else if (typeof vehicleImages === 'string' && vehicleImages.trim() !== '') {
      try {
        const parsed = JSON.parse(vehicleImages);
        finalImages = Array.isArray(parsed) ? parsed.slice(0, 5) : [vehicleImages.trim()];
      } catch (e) {
        finalImages = [vehicleImages.trim()];
      }
    } else {
      finalImages = [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
      ];
    }

    const isThirdParty = vehicleSource === 'THIRD_PARTY';

    const vehicle = await Vehicle.create({
      vehicleSource: isThirdParty ? 'THIRD_PARTY' : 'OWN',
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      vehicleType: vehicleType || 'Bus',
      vehicleCategory: vehicleCategory || (isThirdParty ? 'Market Hired Transport' : 'Commercial Passenger Fleet'),
      vehicleModel: vehicleModel || 'Standard Fleet Model',
      vehicleName: vehicleName || (isThirdParty ? `Hired ${vehicleType || 'Vehicle'}` : 'Company Fleet Vehicle'),
      seatingCapacity: Number(seatingCapacity) || 1,
      loadCapacity: loadCapacity || '',
      ownerName: ownerName || (isThirdParty ? (parsedVendorDetails?.vendorName || 'Market Vendor') : 'Metro Transport Logistics Ltd'),
      ownerMobileNumber: ownerMobileNumber || (isThirdParty ? (parsedVendorDetails?.vendorMobile || '+919800000000') : '+919811122334'),
      assignedDriver: assignedDriver || null,
      thirdPartyDriver: parsedThirdPartyDriver,
      vendorDetails: parsedVendorDetails,
      hireDetails: parsedHireDetails,
      rcNumber: rcNumber || 'RC-VERIFIED-COMMERCIAL',
      rcDocument: rcDocument || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      insurancePolicyNumber: insurancePolicyNumber || 'INS-FLEET-COVER-VALID',
      insuranceDocument: insuranceDocument || 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: insuranceExpiryDetails || '2026-12-31',
      fitnessDetails: fitnessDetails || 'State Transport Certified Fitness Valid',
      fitnessDocument: fitnessDocument || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      vehicleImages: finalImages,
      fareRate: Number(fareRate) || (isThirdParty ? (Number(parsedHireDetails?.hireAmount) || 500) : 500),
      route: parsedRoute,
      pickupDropDetails: parsedPickupDrop,
      vehicleStatus: vehicleStatus || 'Active',
      busDetails: parsedBusDetails,
      evDetails: parsedEvDetails,
      carDetails: parsedCarDetails,
      truckDetails: parsedTruckDetails
    });

    if (assignedDriver) {
      await Driver.findByIdAndUpdate(assignedDriver, { assignedVehicle: vehicle._id });
    }

    // If Third-Party Vehicle, record separate Company Expense
    if (isThirdParty && parsedHireDetails && (parsedHireDetails.hireAmount > 0 || parsedHireDetails.additionalExpense > 0)) {
      const hireAmt = Number(parsedHireDetails.hireAmount) || 0;
      const addExp = Number(parsedHireDetails.additionalExpense) || 0;

      await Expense.create({
        expenseType: 'MARKET_VEHICLE_HIRE',
        vehicle: vehicle._id,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        vendorName: parsedVendorDetails?.vendorName || vehicle.ownerName,
        vendorMobile: parsedVendorDetails?.vendorMobile || vehicle.ownerMobileNumber,
        hireAmount: hireAmt,
        additionalExpense: addExp,
        totalAmount: hireAmt + addExp,
        paymentStatus: parsedHireDetails.paymentStatus || 'Pending',
        paymentDate: parsedHireDetails.paymentStatus === 'Paid' ? (parsedHireDetails.paymentDate || new Date()) : null,
        paymentReference: parsedHireDetails.paymentReference || '',
        hireDate: parsedHireDetails.hireDate || new Date(),
        pickup: parsedHireDetails.pickup || parsedRoute?.origin || '',
        destination: parsedHireDetails.destination || parsedRoute?.destination || '',
        loadCapacity: loadCapacity || '',
        notes: parsedHireDetails.notes || '',
        recordedBy: req.user ? req.user._id : null
      });
    }

    res.status(201).json({ success: true, message: 'Vehicle added successfully', data: vehicle });
  } catch (error) {
    next(error);
  }
};

exports.updateVehicle = async (req, res, next) => {
  try {
    const updatePayload = { ...req.body };

    if (req.files && req.files.length > 0) {
      updatePayload.vehicleImages = req.files.map(f => `/uploads/${f.filename}`);
    } else if (req.body.vehicleImages) {
      if (Array.isArray(req.body.vehicleImages)) {
        updatePayload.vehicleImages = req.body.vehicleImages.slice(0, 5);
      } else if (typeof req.body.vehicleImages === 'string') {
        try {
          const parsed = JSON.parse(req.body.vehicleImages);
          updatePayload.vehicleImages = Array.isArray(parsed) ? parsed.slice(0, 5) : [req.body.vehicleImages];
        } catch (e) {
          updatePayload.vehicleImages = [req.body.vehicleImages];
        }
      }
    }

    const existingVehicleObj = await Vehicle.findById(req.params.id);
    if (!existingVehicleObj) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    if (updatePayload.hireDetails) {
      updatePayload.hireDetails = parseJsonIfString(updatePayload.hireDetails, updatePayload.hireDetails);
    }
    if (updatePayload.vendorDetails) {
      updatePayload.vendorDetails = parseJsonIfString(updatePayload.vendorDetails, updatePayload.vendorDetails);
    }
    if (updatePayload.thirdPartyDriver) {
      updatePayload.thirdPartyDriver = parseJsonIfString(updatePayload.thirdPartyDriver, updatePayload.thirdPartyDriver);
    }
    if (updatePayload.truckDetails) {
      updatePayload.truckDetails = parseJsonIfString(updatePayload.truckDetails, updatePayload.truckDetails);
    }
    if (updatePayload.route) {
      const parsedR = parseJsonIfString(updatePayload.route, updatePayload.route);
      updatePayload.route = {
        ...(existingVehicleObj.route ? existingVehicleObj.route.toObject() : {}),
        ...parsedR
      };
    }
    if (updatePayload.busDetails) {
      const parsedB = parseJsonIfString(updatePayload.busDetails, updatePayload.busDetails);
      updatePayload.busDetails = {
        ...(existingVehicleObj.busDetails ? existingVehicleObj.busDetails.toObject() : {}),
        ...parsedB
      };
    }

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    if (req.body.assignedDriver !== undefined) {
      if (req.body.assignedDriver) {
        await Driver.findByIdAndUpdate(req.body.assignedDriver, { assignedVehicle: vehicle._id });
      }
    }

    // Sync Expense record if Third-Party
    if (vehicle.vehicleSource === 'THIRD_PARTY' && vehicle.hireDetails) {
      const hireAmt = Number(vehicle.hireDetails.hireAmount) || 0;
      const addExp = Number(vehicle.hireDetails.additionalExpense) || 0;
      const vendorName = vehicle.vendorDetails?.vendorName || vehicle.ownerName;
      const vendorMobile = vehicle.vendorDetails?.vendorMobile || vehicle.ownerMobileNumber;

      let expense = await Expense.findOne({ vehicle: vehicle._id, expenseType: 'MARKET_VEHICLE_HIRE' });
      if (expense) {
        expense.hireAmount = hireAmt;
        expense.additionalExpense = addExp;
        expense.totalAmount = hireAmt + addExp;
        expense.vendorName = vendorName;
        expense.vendorMobile = vendorMobile;
        expense.paymentStatus = vehicle.hireDetails.paymentStatus || expense.paymentStatus;
        expense.paymentDate = vehicle.hireDetails.paymentDate || expense.paymentDate;
        expense.paymentReference = vehicle.hireDetails.paymentReference || expense.paymentReference;
        expense.notes = vehicle.hireDetails.notes || expense.notes;
        await expense.save();
      } else if (hireAmt > 0 || addExp > 0) {
        await Expense.create({
          expenseType: 'MARKET_VEHICLE_HIRE',
          vehicle: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          vendorName,
          vendorMobile,
          hireAmount: hireAmt,
          additionalExpense: addExp,
          totalAmount: hireAmt + addExp,
          paymentStatus: vehicle.hireDetails.paymentStatus || 'Pending',
          paymentDate: vehicle.hireDetails.paymentDate || null,
          paymentReference: vehicle.hireDetails.paymentReference || '',
          hireDate: vehicle.hireDetails.hireDate || new Date(),
          notes: vehicle.hireDetails.notes || '',
          recordedBy: req.user ? req.user._id : null
        });
      }
    }

    res.json({ success: true, message: 'Vehicle updated successfully', data: vehicle });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete vehicle (Admin)
// @route   DELETE /api/admin/vehicles/:id
// @access  Private/Admin
exports.deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // 1. Safety Check: Active / Pending / Confirmed Bookings
    const activeBooking = await Booking.findOne({
      vehicle: id,
      bookingStatus: { $in: ['Pending Admin Confirmation', 'Confirmed', 'In Transit', 'Active', 'Pending Cash'] }
    });

    if (activeBooking) {
      return res.status(400).json({
        success: false,
        message: 'This vehicle has active bookings and cannot be deleted.'
      });
    }

    // 2. Driver Unassignment Safety
    const assignedDriver = await Driver.findOne({ assignedVehicle: id });
    if (assignedDriver) {
      assignedDriver.assignedVehicle = null;
      await assignedDriver.save();
    }

    // 3. Delete Vehicle from Database
    await Vehicle.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully.',
      id
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record/Update Payment to Third-Party Vehicle Owner/Vendor
// @route   PUT /api/admin/vehicles/:id/hire-payment
// @access  Private (Admin Only)
exports.recordHirePayment = async (req, res, next) => {
  try {
    const { paymentStatus, paidAmount, paymentDate, paymentReference, notes } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    if (vehicle.vehicleSource !== 'THIRD_PARTY') {
      return res.status(400).json({ success: false, message: 'Payment recording is only applicable to Third-Party / Market-Hired vehicles.' });
    }

    if (!vehicle.hireDetails) {
      vehicle.hireDetails = {};
    }

    const prevStatus = vehicle.hireDetails.paymentStatus;
    const newStatus = paymentStatus || (prevStatus === 'Pending' ? 'Paid' : 'Pending');
    const now = paymentDate ? new Date(paymentDate) : new Date();

    vehicle.hireDetails.paymentStatus = newStatus;
    if (paidAmount !== undefined) vehicle.hireDetails.paidAmount = Number(paidAmount);
    if (newStatus === 'Paid') {
      vehicle.hireDetails.paymentDate = now;
      if (!vehicle.hireDetails.paidAmount) {
        vehicle.hireDetails.paidAmount = (vehicle.hireDetails.hireAmount || 0) + (vehicle.hireDetails.additionalExpense || 0);
      }
    }
    if (paymentReference) vehicle.hireDetails.paymentReference = paymentReference;
    if (notes !== undefined) vehicle.hireDetails.notes = notes;

    await vehicle.save();

    // Sync with Expense record
    let expense = await Expense.findOne({ vehicle: vehicle._id, expenseType: 'MARKET_VEHICLE_HIRE' });
    if (expense) {
      expense.paymentStatus = newStatus;
      expense.paymentDate = newStatus === 'Paid' ? (expense.paymentDate || now) : null;
      if (paymentReference) expense.paymentReference = paymentReference;
      if (notes !== undefined) expense.notes = notes;
      await expense.save();
    } else {
      const hireAmt = Number(vehicle.hireDetails.hireAmount) || 0;
      const addExp = Number(vehicle.hireDetails.additionalExpense) || 0;
      expense = await Expense.create({
        expenseType: 'MARKET_VEHICLE_HIRE',
        vehicle: vehicle._id,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        vendorName: vehicle.vendorDetails?.vendorName || vehicle.ownerName,
        vendorMobile: vehicle.vendorDetails?.vendorMobile || vehicle.ownerMobileNumber,
        hireAmount: hireAmt,
        additionalExpense: addExp,
        totalAmount: hireAmt + addExp,
        paymentStatus: newStatus,
        paymentDate: newStatus === 'Paid' ? now : null,
        paymentReference: paymentReference || '',
        hireDate: vehicle.hireDetails.hireDate || new Date(),
        notes: notes || vehicle.hireDetails.notes || '',
        recordedBy: req.user ? req.user._id : null
      });
    }

    res.json({
      success: true,
      message: `Third-Party vehicle owner payment marked as ${newStatus}`,
      data: {
        vehicle,
        expense
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Third-Party Hire Expenses & Summary Breakdown
// @route   GET /api/admin/hire-expenses
// @access  Private (Admin Only)
exports.getHireExpenses = async (req, res, next) => {
  try {
    const expenses = await Expense.find({ expenseType: 'MARKET_VEHICLE_HIRE' })
      .populate('vehicle')
      .populate('booking')
      .sort({ createdAt: -1 });

    const totalHireExpense = expenses.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const pendingHireExpense = expenses
      .filter(item => item.paymentStatus === 'Pending')
      .reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const paidHireExpense = expenses
      .filter(item => item.paymentStatus === 'Paid')
      .reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    const vehicleBreakdown = {};
    expenses.forEach(exp => {
      const vKey = exp.vehicleNumber || 'Unspecified';
      if (!vehicleBreakdown[vKey]) {
        vehicleBreakdown[vKey] = {
          vehicleNumber: vKey,
          vehicleType: exp.vehicleType || 'Truck',
          vendorName: exp.vendorName,
          totalHireAmount: 0,
          pendingAmount: 0,
          paidAmount: 0,
          tripsCount: 0
        };
      }
      vehicleBreakdown[vKey].totalHireAmount += exp.totalAmount || 0;
      if (exp.paymentStatus === 'Pending') {
        vehicleBreakdown[vKey].pendingAmount += exp.totalAmount || 0;
      } else {
        vehicleBreakdown[vKey].paidAmount += exp.totalAmount || 0;
      }
      vehicleBreakdown[vKey].tripsCount += 1;
    });

    res.json({
      success: true,
      summary: {
        totalRecords: expenses.length,
        totalHireExpense,
        pendingHireExpense,
        paidHireExpense,
        pendingCount: expenses.filter(e => e.paymentStatus === 'Pending').length,
        paidCount: expenses.filter(e => e.paymentStatus === 'Paid').length
      },
      vehicleBreakdown: Object.values(vehicleBreakdown),
      data: expenses
    });
  } catch (error) {
    next(error);
  }
};

exports.updateVehicleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive', 'Blocked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Active, Inactive, or Blocked' });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    vehicle.vehicleStatus = status;
    await vehicle.save();

    res.json({
      success: true,
      message: `Vehicle status updated to ${status}. ${
        status !== 'Active' ? 'Inactive or Blocked vehicles will not be available for new bookings.' : ''
      }`,
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. SPECIFIC SERVICE VEHICLE LISTINGS
// ==========================================
exports.getBuses = async (req, res, next) => {
  try {
    const buses = await Vehicle.find({ vehicleType: 'Bus' }).populate('assignedDriver').sort({ createdAt: -1 });

    const busesWithStats = await Promise.all(
      buses.map(async bus => {
        const bookings = await Booking.find({ vehicle: bus._id });
        const passengersCount = bookings.reduce((sum, b) => sum + (b.passengerDetails ? b.passengerDetails.length : 0), 0);
        const cancellationsCount = await Cancellation.countDocuments({ booking: { $in: bookings.map(b => b._id) } });

        return {
          ...bus.toObject(),
          totalBookingsCount: bookings.length,
          totalPassengersServed: passengersCount,
          cancellationsCount,
          availableSeats: bus.busDetails ? bus.busDetails.availableSeats : bus.seatingCapacity
        };
      })
    );

    res.json({ success: true, count: busesWithStats.length, data: busesWithStats });
  } catch (error) {
    next(error);
  }
};

exports.getEvSewa = async (req, res, next) => {
  try {
    const evs = await Vehicle.find({ vehicleType: 'EV-Sewa' }).populate('assignedDriver').sort({ createdAt: -1 });

    const evsWithStats = await Promise.all(
      evs.map(async ev => {
        const bookings = await Booking.find({ vehicle: ev._id }).sort({ createdAt: -1 }).limit(5);
        return {
          ...ev.toObject(),
          recentBookings: bookings
        };
      })
    );

    res.json({ success: true, count: evsWithStats.length, data: evsWithStats });
  } catch (error) {
    next(error);
  }
};

exports.getCars = async (req, res, next) => {
  try {
    const cars = await Vehicle.find({ vehicleType: 'Car' }).populate('assignedDriver').sort({ createdAt: -1 });

    const carsWithStats = await Promise.all(
      cars.map(async car => {
        const bookings = await Booking.find({ vehicle: car._id }).sort({ createdAt: -1 }).limit(5);
        return {
          ...car.toObject(),
          recentBookings: bookings
        };
      })
    );

    res.json({ success: true, count: carsWithStats.length, data: carsWithStats });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. DRIVER ASSIGNMENT
// ==========================================
exports.getDriverAssignments = async (req, res, next) => {
  try {
    const [vehicles, drivers] = await Promise.all([
      Vehicle.find()
        .select('vehicleNumber vehicleName vehicleType assignedDriver')
        .populate('assignedDriver', 'name mobileNumber driverStatus profilePhoto')
        .lean(),
      Driver.find({ driverStatus: 'Active' })
        .select('name mobileNumber driverStatus profilePhoto')
        .lean()
    ]);

    const assignmentList = vehicles.map(v => ({
      vehicleId: v._id,
      vehicleNumber: v.vehicleNumber,
      vehicleName: v.vehicleName,
      vehicleType: v.vehicleType,
      currentDriver: v.assignedDriver
        ? {
            id: v.assignedDriver._id,
            name: v.assignedDriver.name,
            mobileNumber: v.assignedDriver.mobileNumber,
            driverStatus: v.assignedDriver.driverStatus
          }
        : null,
      assignmentStatus: v.assignedDriver ? 'Assigned' : 'Unassigned'
    }));

    res.json({ success: true, data: { assignments: assignmentList, availableDrivers: drivers } });
  } catch (error) {
    next(error);
  }
};

exports.assignDriverToVehicle = async (req, res, next) => {
  try {
    const { vehicleId, driverId } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    // If unassigning
    if (!driverId) {
      if (vehicle.assignedDriver) {
        await Driver.findByIdAndUpdate(vehicle.assignedDriver, { assignedVehicle: null });
      }
      vehicle.assignedDriver = null;
      await vehicle.save();
      return res.json({ success: true, message: 'Driver unassigned from vehicle', data: vehicle });
    }

    const newDriver = await Driver.findById(driverId);
    if (!newDriver) return res.status(404).json({ success: false, message: 'Driver not found' });

    // Remove new driver from previous vehicle if any (only if different vehicle)
    if (newDriver.assignedVehicle && newDriver.assignedVehicle.toString() !== vehicle._id.toString()) {
      await Vehicle.findByIdAndUpdate(newDriver.assignedVehicle, { assignedDriver: null });
    }

    // Remove old driver from this vehicle if any (only if different driver)
    if (vehicle.assignedDriver && vehicle.assignedDriver.toString() !== newDriver._id.toString()) {
      await Driver.findByIdAndUpdate(vehicle.assignedDriver, { assignedVehicle: null });
    }

    // Set new assignment
    vehicle.assignedDriver = newDriver._id;
    await vehicle.save();

    newDriver.assignedVehicle = vehicle._id;
    await newDriver.save();

    res.json({
      success: true,
      message: `Driver ${newDriver.name} successfully assigned to vehicle ${vehicle.vehicleNumber}`,
      data: { vehicle, driver: newDriver }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. COMPLIANCE & DOCUMENT RECORDS
// ==========================================
exports.getDocumentRecords = async (req, res, next) => {
  try {
    const { recordType } = req.params; // rc, licence, insurance, fitness

    const drivers = await Driver.find().populate('assignedVehicle');
    const vehicles = await Vehicle.find().populate('assignedDriver');

    let records = [];

    if (recordType === 'rc') {
      records = vehicles.map(v => ({
        id: v._id,
        vehicleNumber: v.vehicleNumber,
        vehicleName: v.vehicleName,
        ownerName: v.ownerName,
        rcNumber: v.rcNumber,
        documentUrl: v.rcDocument,
        assignedDriver: v.assignedDriver ? v.assignedDriver.name : 'Unassigned',
        status: v.vehicleStatus
      }));
    } else if (recordType === 'licence') {
      records = drivers.map(d => ({
        id: d._id,
        driverName: d.name,
        mobileNumber: d.mobileNumber,
        drivingLicenceNumber: d.drivingLicenceNumber,
        documentUrl: d.drivingLicenceDoc,
        status: d.drivingLicenceStatus,
        driverStatus: d.driverStatus
      }));
    } else if (recordType === 'insurance') {
      records = vehicles.map(v => ({
        id: v._id,
        vehicleNumber: v.vehicleNumber,
        vehicleName: v.vehicleName,
        policyNumber: v.insurancePolicyNumber,
        expiryDate: v.insuranceExpiryDetails,
        documentUrl: v.insuranceDocument,
        status: v.vehicleStatus
      }));
    } else if (recordType === 'fitness') {
      records = vehicles.map(v => ({
        id: v._id,
        vehicleNumber: v.vehicleNumber,
        vehicleName: v.vehicleName,
        fitnessDetails: v.fitnessDetails,
        documentUrl: v.fitnessDocument,
        status: v.vehicleStatus
      }));
    }

    res.json({ success: true, recordType, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. BOOKING MANAGEMENT
// ==========================================
exports.getBookings = async (req, res, next) => {
  try {
    const { serviceType, status } = req.query;
    const filter = {};
    if (serviceType) filter.serviceType = serviceType;
    if (status) filter.bookingStatus = status;

    const bookings = await Booking.find(filter)
      .select('-confirmationOtpHash -customerViewOtp')
      .populate('vehicle')
      .populate('driver')
      .populate('driverConfirmedBy', 'name phone email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin OTP Verification to Confirm Booking
// @route   POST /api/admin/bookings/:id/confirm-otp, POST /api/admin/bookings/:id/confirm, POST /api/bookings/:id/confirm
// @access  Private (Admin / Super Admin Only)
exports.confirmBookingOtp = async (req, res, next) => {
  try {
    const { otp, confirmationOtp } = req.body;
    const suppliedOtp = (otp || confirmationOtp || '').toString().trim();

    if (!suppliedOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking confirmation OTP'
      });
    }

    const booking = await Booking.findOne(getBookingQuery(req.params.id))
      .select('+confirmationOtpHash')
      .populate('vehicle')
      .populate('driver');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check existing booking status
    if (['Cancelled', 'Rejected'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm a cancelled or rejected booking'
      });
    }

    if (['Completed'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm an already completed booking'
      });
    }

    if (['Admin Confirmed', 'ADMIN_CONFIRMED'].includes(booking.bookingStatus)) {
      return res.json({
        success: true,
        message: 'Booking is already confirmed',
        data: {
          bookingId: booking.bookingId,
          bookingStatus: 'ADMIN_CONFIRMED'
        }
      });
    }

    // Expiry check
    if (booking.confirmationOtpExpiresAt && new Date(booking.confirmationOtpExpiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Customer OTP has expired. Please request a new OTP.'
      });
    }

    // OTP Hash verification
    if (!booking.confirmationOtpHash) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking confirmation OTP'
      });
    }

    const crypto = require('crypto');
    const suppliedHash = crypto.createHash('sha256').update(suppliedOtp).digest('hex');

    if (suppliedHash !== booking.confirmationOtpHash) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking confirmation OTP'
      });
    }

    // SUCCESS - Verify and transition status to ADMIN_CONFIRMED
    booking.bookingStatus = 'ADMIN_CONFIRMED';
    booking.confirmationOtpVerifiedAt = new Date();
    booking.confirmationOtpVerifiedBy = req.user ? req.user._id : null;
    booking.confirmationOtpHash = null; // Invalidate OTP immediately so it cannot be reused
    booking.customerViewOtp = null;
    await booking.save();

    // Create Notification for Customer
    await Notification.create({
      title: 'Booking Confirmed!',
      message: `Your booking ${booking.bookingId} has been confirmed by Admin. Drivers can now accept your trip.`,
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: booking.user || null,
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      data: {
        bookingId: booking.bookingId,
        bookingStatus: 'ADMIN_CONFIRMED'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin / Controlled Resend OTP for Booking Confirmation
// @route   POST /api/admin/bookings/:id/resend-otp, POST /api/bookings/:id/resend-otp
// @access  Private (Admin or Owner Customer)
exports.resendBookingOtp = async (req, res, next) => {
  try {
    const booking = await Booking.findOne(getBookingQuery(req.params.id));
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (!['Pending Admin Confirmation', 'PENDING_ADMIN_CONFIRMATION', 'Pending'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: `Booking status is '${booking.bookingStatus}'. Resend OTP is only allowed for pending admin confirmation.`
      });
    }

    const crypto = require('crypto');
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const confirmationOtpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const confirmationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10 Hours

    booking.confirmationOtpHash = confirmationOtpHash;
    booking.confirmationOtpExpiresAt = confirmationOtpExpiresAt;
    booking.customerViewOtp = rawOtp;
    booking.bookingStatus = 'Pending Admin Confirmation';
    await booking.save();

    res.json({
      success: true,
      message: 'New booking confirmation OTP generated successfully',
      data: {
        bookingId: booking.bookingId,
        ...(req.user.role === 'customer' ? { confirmationOtp: rawOtp } : {})
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { bookingStatus, paymentStatus } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (bookingStatus) booking.bookingStatus = bookingStatus;
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    await booking.save();
    res.json({ success: true, message: 'Booking status updated', data: booking });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete single booking
// @route   DELETE /api/admin/bookings/:id
// @access  Private (Admin Only)
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne(getBookingQuery(req.params.id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const bId = booking.bookingId;
    await Booking.deleteOne({ _id: booking._id });
    await Notification.deleteMany({
      $or: [
        { message: { $regex: bId, $options: 'i' } },
        { title: { $regex: bId, $options: 'i' } }
      ]
    });
    if (dashboardCache && typeof dashboardCache.clear === 'function') {
      dashboardCache.clear();
    }
    res.json({ success: true, message: `Booking ${bId} deleted successfully` });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear booking requests or all test bookings and associated test artifacts
// @route   DELETE /api/admin/bookings/clear, POST /api/admin/bookings/clear
// @access  Private (Admin Only)
exports.clearBookingRequests = async (req, res, next) => {
  try {
    const { deleteAll = true, preserveCompleted = false, statuses } = req.body || {};
    
    let query = {};
    if (statuses && Array.isArray(statuses) && statuses.length > 0) {
      query = { bookingStatus: { $in: statuses } };
    } else if (preserveCompleted) {
      query = { bookingStatus: { $ne: 'Completed' } };
    } else if (deleteAll) {
      query = {}; // Wipe all bookings
    } else {
      query = {
        bookingStatus: {
          $in: [
            'Pending Driver Confirmation',
            'Pending',
            'Pending Admin Confirmation',
            'Admin Confirmed',
            'ADMIN_CONFIRMED',
            'Awaiting Cash Collection',
            'Cancelled',
            'Rejected'
          ]
        }
      };
    }

    const deleteResult = await Booking.deleteMany(query);

    // Also clean up booking-related notifications
    const notifResult = await Notification.deleteMany({
      $or: [
        { title: { $regex: /booking|ride|request/i } },
        { message: { $regex: /booking|BK-|ride|request/i } }
      ]
    });

    // Clean up temporary test drivers (SpeedDriver_*, Ramesh Driver, Wrong Driver)
    // PRESERVE baseline drivers: Harsh, Ayush, Pintu
    const testDrivers = await Driver.find({
      $or: [
        { name: { $regex: /^speeddriver/i } },
        { name: 'Ramesh Driver' },
        { name: 'Wrong Driver' }
      ]
    });
    const testDriverIds = testDrivers.map(d => d._id);
    let cleanedVehiclesCount = 0;
    if (testDriverIds.length > 0) {
      const vResult = await Vehicle.deleteMany({ assignedDriver: { $in: testDriverIds } });
      cleanedVehiclesCount += (vResult.deletedCount || 0);
      await Driver.deleteMany({ _id: { $in: testDriverIds } });
      await User.deleteMany({
        $or: [
          { email: { $regex: /speed\.driver/i } },
          { name: { $regex: /^speeddriver/i } },
          { email: { $regex: /ramesh\.driver/i } },
          { email: { $regex: /wrong\.driver/i } }
        ]
      });
    }

    // Clean up any extra temporary vehicles (e.g. DL 05 SP or DL 04 GH)
    const extraVehicles = await Vehicle.deleteMany({
      vehicleNumber: { $regex: /DL 05 SP|DL 04 GH/i }
    });
    cleanedVehiclesCount += (extraVehicles.deletedCount || 0);

    // Clear dashboard cache
    if (dashboardCache && typeof dashboardCache.clear === 'function') {
      dashboardCache.clear();
    }

    const remainingBookings = await Booking.countDocuments();
    const remainingDrivers = await Driver.countDocuments();
    const remainingVehicles = await Vehicle.countDocuments();

    res.json({
      success: true,
      message: `Database cleaned successfully. Removed ${deleteResult.deletedCount} bookings.`,
      deletedBookingsCount: deleteResult.deletedCount,
      deletedNotificationsCount: notifResult.deletedCount,
      cleanedDriversCount: testDriverIds.length,
      cleanedVehiclesCount,
      remaining: {
        bookings: remainingBookings,
        drivers: remainingDrivers,
        vehicles: remainingVehicles
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 9. PAYMENT MANAGEMENT
// ==========================================
exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate('booking')
      .populate('driver')
      .sort({ createdAt: -1 });

    const totalRevenue = payments.reduce((acc, curr) => acc + (curr.bookingAmount || 0), 0);
    const totalDriverPayouts = payments.reduce((acc, curr) => acc + (curr.driverPayment || 0), 0);

    res.json({
      success: true,
      summary: {
        totalTransactions: payments.length,
        totalRevenue,
        totalDriverPayouts
      },
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

exports.getWithdrawals = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate({
        path: 'driver',
        select: 'name mobileNumber walletBalance'
      })
      .populate('user', 'name phone')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, count: withdrawals.length, data: withdrawals });
  } catch (error) {
    next(error);
  }
};

exports.approveWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: 'Pending' },
      { $set: { status: 'Processing', processedAt: new Date(), adminNotes: 'Approved for processing.' } },
      { new: true }
    )
      .populate({ path: 'driver', select: 'name mobileNumber walletBalance' })
      .populate('user', 'name phone');

    if (!withdrawal) {
      const exists = await Withdrawal.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({
        success: false,
        message: exists ? 'Withdrawal request is no longer pending' : 'Withdrawal request not found'
      });
    }

    res.json({ success: true, message: 'Withdrawal approved and marked for processing', data: withdrawal });
  } catch (error) {
    next(error);
  }
};

exports.rejectWithdrawal = async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: 'Pending' },
      { $set: { status: 'Rejected', processedAt: new Date(), adminNotes: reason } },
      { new: true }
    );

    if (!withdrawal) {
      const exists = await Withdrawal.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({
        success: false,
        message: exists ? 'Withdrawal request is no longer pending' : 'Withdrawal request not found'
      });
    }

    let driver;
    try {
      driver = await Driver.findByIdAndUpdate(
        withdrawal.driver,
        { $inc: { walletBalance: withdrawal.amount, totalWithdrawn: -withdrawal.amount } },
        { new: true }
      );
    } catch (error) {
      await Withdrawal.updateOne(
        { _id: withdrawal._id, status: 'Rejected' },
        { $set: { status: 'Pending', processedAt: null, adminNotes: 'Wallet refund failed; request returned to Pending.' } }
      );
      throw error;
    }
    if (!driver) {
      await Withdrawal.findByIdAndUpdate(withdrawal._id, {
        $set: { status: 'Pending', processedAt: null, adminNotes: 'Wallet refund failed; request returned to Pending.' }
      });
      return res.status(404).json({ success: false, message: 'Driver wallet not found; withdrawal remains pending' });
    }

    const updated = await Withdrawal.findById(withdrawal._id)
      .populate({ path: 'driver', select: 'name mobileNumber walletBalance' })
      .populate('user', 'name phone');
    res.json({ success: true, message: 'Withdrawal rejected and amount returned to driver wallet', data: updated });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 10. CANCELLATION MANAGEMENT
// ==========================================
exports.getCancellations = async (req, res, next) => {
  try {
    const cancellations = await Cancellation.find().populate('booking').sort({ createdAt: -1 });
    res.json({ success: true, count: cancellations.length, data: cancellations });
  } catch (error) {
    next(error);
  }
};

exports.processCancellationRefund = async (req, res, next) => {
  try {
    const cancellation = await Cancellation.findById(req.params.id);
    if (!cancellation) return res.status(404).json({ success: false, message: 'Cancellation record not found' });

    cancellation.refundStatus = 'Processed';
    cancellation.cancellationStatus = 'Completed';
    await cancellation.save();

    // Also update booking status
    if (cancellation.booking) {
      await Booking.findByIdAndUpdate(cancellation.booking, {
        cancellationStatus: 'Refunded',
        paymentStatus: 'Refunded'
      });
    }

    res.json({ success: true, message: 'Cancellation refund marked as processed', data: cancellation });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 11. 3% CUSTOMER SERVICE COMPENSATION MANAGEMENT (Disabled)
// ==========================================
exports.getCompensations = async (req, res, next) => {
  try {
    res.json({ success: true, count: 0, data: [] });
  } catch (error) {
    next(error);
  }
};

exports.updateCompensationStatus = async (req, res, next) => {
  try {
    res.json({ success: true, message: '3% Glitch Compensation feature disabled' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 12. ACCIDENT INSURANCE RECORDS
// ==========================================
exports.getInsuranceRecords = async (req, res, next) => {
  try {
    const records = await Insurance.find().populate('booking').sort({ createdAt: -1 });
    res.json({
      success: true,
      disclaimer: 'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.',
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

exports.updateInsuranceClaimStatus = async (req, res, next) => {
  try {
    const { claimStatus, activeStatus } = req.body;
    const record = await Insurance.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Insurance record not found' });

    if (claimStatus) record.claimStatus = claimStatus;
    if (activeStatus) record.activeStatus = activeStatus;

    await record.save();
    res.json({ success: true, message: 'Insurance claim status updated', data: record });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 13. NOTIFICATIONS
// ==========================================
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    next(error);
  }
};

exports.createNotification = async (req, res, next) => {
  try {
    const { title, message, recipient, recipientRole } = req.body;
    const notification = await Notification.create({
      title,
      message,
      recipient: recipient || 'All Users',
      recipientRole: recipientRole || 'all',
      status: 'Unread'
    });
    res.status(201).json({ success: true, message: 'Notification created', data: notification });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 14. CUSTOMER SUPPORT TICKETS
// ==========================================
exports.getSupportTickets = async (req, res, next) => {
  try {
    const tickets = await Support.find().sort({ createdAt: -1 });
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    next(error);
  }
};

exports.updateSupportTicket = async (req, res, next) => {
  try {
    const { status, resolutionNotes } = req.body;
    const ticket = await Support.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Support ticket not found' });

    if (status) ticket.status = status;
    if (resolutionNotes !== undefined) ticket.resolutionNotes = resolutionNotes;

    await ticket.save();
    res.json({ success: true, message: 'Support ticket updated', data: ticket });
  } catch (error) {
    next(error);
  }
};

exports.deleteSupportTicket = async (req, res, next) => {
  try {
    const ticket = await Support.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }
    
    await Support.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Support ticket deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 15. TERMS & POLICIES
// ==========================================
exports.getPolicies = async (req, res, next) => {
  try {
    const policies = await Policy.find().sort({ policyType: 1 });
    res.json({ success: true, count: policies.length, data: policies });
  } catch (error) {
    next(error);
  }
};

exports.updatePolicy = async (req, res, next) => {
  try {
    const { policyType } = req.params;
    const { title, content } = req.body;

    let policy = await Policy.findOne({ policyType });
    if (!policy) {
      policy = await Policy.create({
        policyType,
        title,
        content,
        lastUpdated: Date.now()
      });
    } else {
      policy.title = title || policy.title;
      policy.content = content || policy.content;
      policy.lastUpdated = Date.now();
      await policy.save();
    }

    res.json({ success: true, message: 'Policy updated successfully', data: policy });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 16. BASIC REPORTS & AUDIT LOGS
// ==========================================
exports.getBasicReports = async (req, res, next) => {
  try {
    const [
      bookings,
      payments,
      cancellations,
      compensations,
      insurances,
      hireExpenses,
      ownVehicleTripsCount,
      thirdPartyVehicleTripsCount,
      ownTrips,
      thirdPartyTrips
    ] = await Promise.all([
      Booking.find().populate('vehicle').populate('driver').sort({ createdAt: -1 }).limit(20),
      Payment.find().sort({ createdAt: -1 }).limit(20),
      Cancellation.find().sort({ createdAt: -1 }).limit(20),
      Compensation.find().sort({ createdAt: -1 }).limit(20),
      Insurance.find().sort({ createdAt: -1 }).limit(20),
      Expense.find({ expenseType: 'MARKET_VEHICLE_HIRE' }).populate('vehicle').populate('booking').sort({ hireDate: -1 }),
      Booking.countDocuments({ vehicleSource: { $ne: 'THIRD_PARTY' } }),
      Booking.countDocuments({ vehicleSource: 'THIRD_PARTY' }),
      Booking.find({ vehicleSource: { $ne: 'THIRD_PARTY' } }).populate('vehicle').populate('driver').sort({ createdAt: -1 }).limit(10),
      Booking.find({ vehicleSource: 'THIRD_PARTY' }).populate('vehicle').populate('driver').sort({ createdAt: -1 }).limit(10)
    ]);

    const totalThirdPartyHireExpense = hireExpenses.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const pendingThirdPartyPayments = hireExpenses
      .filter(item => item.paymentStatus === 'Pending')
      .reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const paidThirdPartyPayments = hireExpenses
      .filter(item => item.paymentStatus === 'Paid')
      .reduce((sum, item) => sum + (item.totalAmount || 0), 0);

    res.json({
      success: true,
      data: {
        bookings,
        payments,
        cancellations,
        compensations,
        insurances,
        hireExpenses,
        hireSummary: {
          ownVehicleTripsCount,
          thirdPartyVehicleTripsCount,
          totalThirdPartyHireExpense,
          pendingThirdPartyPayments,
          paidThirdPartyPayments,
          pendingCount: hireExpenses.filter(e => e.paymentStatus === 'Pending').length,
          paidCount: hireExpenses.filter(e => e.paymentStatus === 'Paid').length
        },
        ownTrips,
        thirdPartyTrips
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 17. SERVICE CONTROL (BUS / EV-SEWA / CAR TOGGLES)
// ==========================================
exports.getServiceControl = async (req, res, next) => {
  try {
    let serviceControl = await ServiceControl.findOne();
    if (!serviceControl) {
      serviceControl = await ServiceControl.create({
        busService: 'Active',
        evSewaService: 'Active',
        carService: 'Active'
      });
    }
    res.json({ success: true, data: serviceControl });
  } catch (error) {
    next(error);
  }
};

exports.updateServiceControl = async (req, res, next) => {
  try {
    const { busService, evSewaService, carService, instantBookingEnabled } = req.body;
    if (
      instantBookingEnabled !== undefined &&
      typeof instantBookingEnabled !== 'boolean'
    ) {
      return res.status(400).json({
        success: false,
        message: 'instantBookingEnabled must be a boolean'
      });
    }
    let serviceControl = await ServiceControl.findOne();
    if (!serviceControl) {
      serviceControl = new ServiceControl();
    }

    if (busService) serviceControl.busService = busService;
    if (evSewaService) serviceControl.evSewaService = evSewaService;
    if (carService) serviceControl.carService = carService;
    if (instantBookingEnabled !== undefined) {
      serviceControl.instantBookingEnabled = instantBookingEnabled;
    }

    await serviceControl.save();

    res.json({
      success: true,
      message: 'Service control statuses updated. Inactive services will not accept new bookings.',
      data: serviceControl
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 19. RESET DATABASE TO CLEAN DEMO STATE
// ==========================================
exports.resetDemoDatabase = async (req, res, next) => {
  try {
    // Clear in-memory cache
    if (dashboardCache && typeof dashboardCache.clear === 'function') {
      dashboardCache.clear();
    }

    // 1. Wipe all transactional records & history
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    await Cancellation.deleteMany({});
    await Compensation.deleteMany({});
    if (Withdrawal) await Withdrawal.deleteMany({});
    await Expense.deleteMany({});
    if (Incentive) await Incentive.deleteMany({});
    await Notification.deleteMany({});
    await Support.deleteMany({});

    // 2. Preserve Super Admin users & Default Customer Priya Nair
    const adminUsers = await User.find({ role: 'admin' });
    const adminUserIds = adminUsers.map(u => u._id);

    let priyaUser = await User.findOne({
      $or: [{ email: 'priya.nair@example.com' }, { phone: '+919844556677' }, { name: /Priya/i }]
    });

    if (!priyaUser) {
      priyaUser = await User.create({
        name: 'Priya Nair',
        email: 'priya.nair@example.com',
        phone: '+919844556677',
        password: 'user123',
        role: 'customer',
        status: 'Active'
      });
    } else {
      priyaUser.name = 'Priya Nair';
      priyaUser.email = 'priya.nair@example.com';
      priyaUser.phone = '+919844556677';
      priyaUser.password = 'user123'; // Pre-save hook hashes password
      priyaUser.role = 'customer';
      priyaUser.status = 'Active';
      await priyaUser.save();
    }

    const preserveUserIds = [priyaUser._id, ...adminUserIds];

    // Delete all other Users, Drivers & Vehicles
    await Driver.deleteMany({});
    await User.deleteMany({ _id: { $nin: preserveUserIds } });
    await Vehicle.deleteMany({});

    // 3. Create the 3 Demo Drivers (Harsh, Ayush, Pintu)
    const driverConfigs = [
      {
        name: 'Harsh',
        email: 'harsh.driver@platform.com',
        phone: '+919876500001',
        password: 'driver123',
        licence: 'DL-01-HARSH-2026',
        busName: 'Royal Intercity Deluxe Express',
        busNumber: 'DL 01 AB 4321'
      },
      {
        name: 'Ayush',
        email: 'ayush.driver@platform.com',
        phone: '+919876500002',
        password: 'driver123',
        licence: 'DL-02-AYUSH-2026',
        busName: 'Shivam Travels Premium',
        busNumber: 'DL 02 CD 5678'
      },
      {
        name: 'Pintu',
        email: 'pintu.driver@platform.com',
        phone: '+919876500003',
        password: 'driver123',
        licence: 'DL-03-PINTU-2026',
        busName: 'Rajputana Express',
        busNumber: 'DL 03 EF 9012'
      }
    ];

    const createdDrivers = [];
    const createdBuses = [];

    for (const d of driverConfigs) {
      const userDoc = await User.create({
        name: d.name,
        email: d.email,
        phone: d.phone,
        password: d.password,
        role: 'driver',
        status: 'Active'
      });

      const driverDoc = await Driver.create({
        user: userDoc._id,
        name: d.name,
        mobileNumber: d.phone,
        driverStatus: 'Active',
        isOnline: true,
        drivingLicenceNumber: d.licence,
        drivingLicenceStatus: 'Approved',
        citizenshipStatus: 'Approved',
        rcStatus: 'Approved',
        insuranceStatus: 'Approved',
        fitnessStatus: 'Approved',
        requiredDocumentsStatus: 'Approved',
        walletBalance: 0,
        totalEarnings: 0,
        totalBonus: 0,
        totalCommission: 0,
        totalWithdrawn: 0,
        rating: 4.9,
        totalRatingsCount: 15
      });

      const busDoc = await Vehicle.create({
        vehicleSource: 'OWN',
        vehicleNumber: d.busNumber,
        vehicleType: 'Bus',
        vehicleCategory: 'AC Sleeper 2+1',
        vehicleModel: 'Volvo 9600 Multi-Axle',
        vehicleName: d.busName,
        seatingCapacity: 36,
        ownerName: `${d.name} Transport`,
        ownerMobileNumber: d.phone,
        assignedDriver: driverDoc._id,
        vehicleStatus: 'Active',
        fareRate: 500,
        route: {
          origin: 'Delhi',
          destination: 'Jaipur',
          departureTime: '06:00 AM',
          arrivalTime: '11:30 AM',
          duration: '5h 30m',
          boardingPoints: ['ISBT Kashmiri Gate', 'Dhaula Kuan', 'Iffco Chowk Gurgaon'],
          droppingPoints: ['Kotputli', 'Amer Fort Cut', 'Sindhi Camp Jaipur']
        },
        busDetails: {
          busType: 'AC Sleeper',
          seatLayout: '2+1 Luxury Sleeper',
          availableSeats: 36
        },
        vehicleImages: [
          'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
        ]
      });

      driverDoc.assignedVehicle = busDoc._id;
      await driverDoc.save();

      createdDrivers.push(driverDoc);
      createdBuses.push(busDoc);
    }

    const customerCount = await User.countDocuments({ role: 'customer' });
    const driverCount = await Driver.countDocuments();
    const vehicleCount = await Vehicle.countDocuments();
    const bookingCount = await Booking.countDocuments();

    res.json({
      success: true,
      message: 'Database successfully reset to clean demo state.',
      summary: {
        customers: customerCount,
        drivers: driverCount,
        buses: vehicleCount,
        bookings: bookingCount,
        route: 'Delhi -> Jaipur'
      }
    });
  } catch (error) {
    next(error);
  }
};
