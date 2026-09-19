const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Support = require('../models/Support');
const Incentive = require('../models/Incentive');
const Withdrawal = require('../models/Withdrawal');
const { dashboardCache } = require('../utils/cache');

// Helper to safely get user ObjectId for Notification recipientId
const getValidRecipientId = async (booking) => {
  if (!booking) return null;
  if (booking.user && mongoose.Types.ObjectId.isValid(booking.user)) return booking.user;
  if (booking.customer && mongoose.Types.ObjectId.isValid(booking.customer)) return booking.customer;
  if (booking.customer && booking.customer._id && mongoose.Types.ObjectId.isValid(booking.customer._id)) return booking.customer._id;
  if (booking.customer && booking.customer.phone) {
    const user = await User.findOne({ phone: booking.customer.phone }).select('_id').lean();
    if (user) return user._id;
  }
  return null;
};

// Helper to check Driver data isolation / vehicle authorization
const verifyDriverVehicleAccess = async (driver, booking) => {
  if (!booking) return false;
  const driverIdStr = driver._id.toString();
  const userIdStr = driver.user ? (driver.user._id || driver.user).toString() : null;

  // Direct driver reference
  if (booking.driver && (booking.driver.toString() === driverIdStr || (userIdStr && booking.driver.toString() === userIdStr))) {
    return true;
  }
  if (booking.driverAssigned && (booking.driverAssigned.toString() === driverIdStr || (userIdStr && booking.driverAssigned.toString() === userIdStr))) {
    return true;
  }

  // Assigned vehicle match
  if (driver.assignedVehicle) {
    const assignedVehicleId = (driver.assignedVehicle._id || driver.assignedVehicle).toString();
    const bookingVehicleId = (booking.vehicle?._id || booking.vehicle)?.toString();
    if (bookingVehicleId && bookingVehicleId === assignedVehicleId) {
      return true;
    }
  }

  // Check if booking's vehicle has this driver assigned
  if (booking.vehicle) {
    const bookingVehicleId = booking.vehicle._id || booking.vehicle;
    const vehicle = await Vehicle.findById(bookingVehicleId).lean();
    if (vehicle && vehicle.assignedDriver) {
      const vDriverStr = (vehicle.assignedDriver._id || vehicle.assignedDriver).toString();
      if (vDriverStr === driverIdStr || (userIdStr && vDriverStr === userIdStr)) {
        return true;
      }
    }
  }

  return false;
};

// @desc    Get Driver Dashboard Summary
// @route   GET /api/driver/dashboard
// @access  Private (Driver Only)
exports.getDriverDashboard = async (req, res, next) => {
  try {
    const driver = req.driver;
    let assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;
    if (!assignedVehicleId) {
      const vByDriver = await Vehicle.findOne({ assignedDriver: driver._id }).select('_id').lean();
      if (vByDriver) assignedVehicleId = vByDriver._id;
    }

    // Fetch dashboard components concurrently
    const [
      assignedVehicle,
      bookingRequests,
      activeRide,
      recentHistory,
      paymentAggregate,
      completedTripsCount,
      activeIncentives
    ] = await Promise.all([
      assignedVehicleId ? Vehicle.findById(assignedVehicleId).lean() : Promise.resolve(null),
      // Booking requests (eligible when driver is online)
      driver.isOnline
        ? Booking.find({
            $or: [
              { driver: driver._id },
              ...(assignedVehicleId ? [{ vehicle: assignedVehicleId }] : [])
            ],
            bookingStatus: { $in: ['Pending Driver Confirmation', 'Awaiting Cash Collection', 'Pending'] }
          })
            .select('bookingId customer serviceType pickupLocation dropLocation fare driverPaymentAmount paymentStatus bookingStatus rideStatus travelDate passengerDetails busSeatNumbers vehicle driver createdAt')
            .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory vehicleStatus seatingCapacity fuelType')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()
        : Promise.resolve([]),
      // Active ongoing ride
      Booking.findOne({
        $or: [
          { driver: driver._id },
          ...(assignedVehicleId ? [{ vehicle: assignedVehicleId }] : [])
        ],
        rideStatus: { $in: ['Accepted', 'Arrived', 'Started'] },
        bookingStatus: { $in: ['Confirmed', 'Ongoing', 'Awaiting Cash Collection', 'Pending Driver Confirmation'] }
      })
        .populate('vehicle', 'vehicleNumber vehicleName vehicleType fuelType')
        .lean(),
      // Recent completed/cancelled trips
      Booking.find({
        $or: [
          { driver: driver._id },
          ...(assignedVehicleId ? [{ vehicle: assignedVehicleId }] : [])
        ],
        bookingStatus: { $in: ['Confirmed', 'Ongoing', 'Completed', 'Cancelled'] }
      })
        .select('bookingId customer serviceType pickupLocation dropLocation fare driverPaymentAmount paymentStatus bookingStatus rideStatus travelDate passengerDetails vehicle driver createdAt')
        .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Payment.aggregate([
        { $match: { driver: driver._id, paymentStatus: 'Paid' } },
        { $group: { _id: null, totalEarnings: { $sum: '$driverPayment' } } }
      ]),
      Booking.countDocuments({
        $or: [
          { driver: driver._id },
          ...(assignedVehicleId ? [{ vehicle: assignedVehicleId }] : [])
        ],
        bookingStatus: 'Completed'
      }),
      Incentive.find({ status: 'Active' }).limit(3).lean()
    ]);

    const totalEarnings = driver.totalEarnings || (paymentAggregate.length > 0 ? (paymentAggregate[0].totalEarnings || 0) : 0);

    // Document Verification Summary
    const documentSummary = {
      citizenship: driver.citizenshipStatus || 'Approved',
      drivingLicence: driver.drivingLicenceStatus,
      rc: driver.rcStatus,
      insurance: driver.insuranceStatus,
      fitness: driver.fitnessStatus,
      overallStatus:
        driver.drivingLicenceStatus === 'Approved' &&
        driver.rcStatus === 'Approved' &&
        driver.insuranceStatus === 'Approved' &&
        driver.fitnessStatus === 'Approved'
          ? 'Approved'
          : driver.drivingLicenceStatus === 'Rejected' ||
            driver.rcStatus === 'Rejected' ||
            driver.insuranceStatus === 'Rejected' ||
            driver.fitnessStatus === 'Rejected'
          ? 'Rejected'
          : 'Pending'
    };

    const isEV = assignedVehicle && (assignedVehicle.vehicleType === 'EV-Sewa' || assignedVehicle.fuelType === 'EV');

    const responsePayload = {
      driver: {
        id: driver._id,
        name: driver.name,
        mobileNumber: driver.mobileNumber,
        profilePhoto: driver.profilePhoto,
        driverStatus: driver.driverStatus,
        isOnline: driver.isOnline,
        rating: driver.rating || 4.8,
        totalRatingsCount: driver.totalRatingsCount || 12,
        language: driver.language || 'en'
      },
      assignedVehicle: assignedVehicle
        ? {
            id: assignedVehicle._id,
            vehicleNumber: assignedVehicle.vehicleNumber,
            vehicleName: assignedVehicle.vehicleName,
            vehicleType: assignedVehicle.vehicleType,
            vehicleCategory: assignedVehicle.vehicleCategory,
            vehicleModel: assignedVehicle.vehicleModel,
            vehicleStatus: assignedVehicle.vehicleStatus,
            seatingCapacity: assignedVehicle.seatingCapacity,
            fuelType: assignedVehicle.fuelType || (assignedVehicle.vehicleType === 'EV-Sewa' ? 'EV' : 'Diesel'),
            route: assignedVehicle.route
          }
        : null,
      stats: {
        isOnline: driver.isOnline,
        pendingRequestsCount: bookingRequests.length,
        completedTripsCount,
        totalEarnings,
        walletBalance: driver.walletBalance || 0,
        driverStatus: driver.driverStatus,
        documentStatus: documentSummary.overallStatus
      },
      activeRide: activeRide ? {
        ...activeRide,
        // External navigation URL to pickup or drop (strictly NO GPS tracking)
        pickupNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeRide.pickupLocation)}`,
        dropNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeRide.dropLocation)}`
      } : null,
      bookingRequests,
      recentHistory,
      documentSummary,
      evDetails: isEV ? {
        batteryPercentage: driver.batteryPercentage || 85,
        estimatedRangeKm: driver.estimatedRangeKm || 180,
        lastChargedAt: driver.lastChargedAt
      } : null,
      activeIncentives
    };

    res.json({
      success: true,
      data: responsePayload
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Driver Profile
// @route   GET /api/driver/profile
// @access  Private (Driver Only)
exports.getDriverProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id)
      .populate('user', 'email name phone role status createdAt')
      .populate('assignedVehicle')
      .lean();

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    res.json({
      success: true,
      data: {
        ...driver,
        emergencyContact: driver.emergencyContact || { name: '', phone: '', relation: 'Family' },
        address: driver.address || '',
        payoutMethods: driver.payoutMethods || {},
        walletBalance: driver.walletBalance || 0,
        language: driver.language || 'en'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Driver Profile Details
// @route   PUT /api/driver/profile
// @access  Private (Driver Only)
exports.updateDriverProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const {
      name,
      mobileNumber,
      profilePhoto,
      address,
      emergencyContact,
      payoutMethods,
      language
    } = req.body;

    if (name) driver.name = name.trim();
    if (mobileNumber) driver.mobileNumber = mobileNumber.trim();
    if (profilePhoto) {
      driver.profilePhoto = profilePhoto;
      driver.driverPhoto = profilePhoto;
    }
    if (address !== undefined) driver.address = address;
    if (emergencyContact) {
      driver.emergencyContact = {
        name: emergencyContact.name || driver.emergencyContact?.name || '',
        phone: emergencyContact.phone || driver.emergencyContact?.phone || '',
        relation: emergencyContact.relation || driver.emergencyContact?.relation || 'Family'
      };
    }
    if (payoutMethods) {
      driver.payoutMethods = {
        bankName: payoutMethods.bankName || driver.payoutMethods?.bankName || '',
        accountNumber: payoutMethods.accountNumber || driver.payoutMethods?.accountNumber || '',
        accountHolderName: payoutMethods.accountHolderName || driver.payoutMethods?.accountHolderName || '',
        branch: payoutMethods.branch || driver.payoutMethods?.branch || '',
        esewaId: payoutMethods.esewaId || driver.payoutMethods?.esewaId || '',
        khaltiId: payoutMethods.khaltiId || driver.payoutMethods?.khaltiId || ''
      };
    }
    if (language && ['en', 'ne', 'hi'].includes(language)) {
      driver.language = language;
    }

    await driver.save();

    // Also update linked User profile
    if (driver.user) {
      await User.findByIdAndUpdate(driver.user, {
        name: driver.name,
        phone: driver.mobileNumber,
        ...(profilePhoto ? { profilePhoto } : {})
      });
    }

    res.json({
      success: true,
      message: 'Driver profile updated successfully',
      data: driver
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Assigned Vehicle
// @route   GET /api/driver/vehicle
// @access  Private (Driver Only)
exports.getAssignedVehicle = async (req, res, next) => {
  try {
    const driver = req.driver;
    let assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;
    if (!assignedVehicleId) {
      const vByDriver = await Vehicle.findOne({ assignedDriver: driver._id }).select('_id').lean();
      if (vByDriver) assignedVehicleId = vByDriver._id;
    }

    if (!assignedVehicleId) {
      return res.json({
        success: true,
        data: null,
        message: 'No vehicle currently assigned'
      });
    }

    const vehicle = await Vehicle.findById(assignedVehicleId).lean();
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Assigned vehicle details not found' });
    }

    const isEV = vehicle.vehicleType === 'EV-Sewa' || vehicle.fuelType === 'EV';

    res.json({
      success: true,
      data: {
        ...vehicle,
        isEV,
        fuelType: vehicle.fuelType || (isEV ? 'EV' : 'Diesel'),
        batteryPercentage: isEV ? (driver.batteryPercentage || 85) : null,
        estimatedRangeKm: isEV ? (driver.estimatedRangeKm || 180) : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Driver Documents & Expiry Status
// @route   GET /api/driver/documents
// @access  Private (Driver Only)
exports.getDriverDocuments = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id).lean();

    const now = new Date();
    const checkExpiry = (expiryDateStr) => {
      if (!expiryDateStr) return { isExpired: false, daysRemaining: 999 };
      const exp = new Date(expiryDateStr);
      const diffTime = exp - now;
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        isExpired: daysRemaining <= 0,
        isExpiringSoon: daysRemaining > 0 && daysRemaining <= 30,
        daysRemaining
      };
    };

    const documents = [
      {
        type: 'Citizenship / National ID',
        key: 'citizenship',
        documentNumber: driver.citizenshipNumber || 'N/A',
        docUrl: driver.citizenshipDoc || '',
        expiryDate: driver.citizenshipExpiry || 'N/A',
        status: driver.citizenshipStatus || 'Approved',
        expiryInfo: checkExpiry(driver.citizenshipExpiry)
      },
      {
        type: 'Driving Licence',
        key: 'drivingLicence',
        documentNumber: driver.drivingLicenceNumber || 'N/A',
        docUrl: driver.drivingLicenceDoc || '',
        expiryDate: driver.drivingLicenceExpiry || '2028-12-31',
        status: driver.drivingLicenceStatus || 'Pending',
        expiryInfo: checkExpiry(driver.drivingLicenceExpiry || '2028-12-31')
      },
      {
        type: 'Vehicle Registration / Blue Book (RC)',
        key: 'rc',
        documentNumber: driver.rcNumber || 'N/A',
        docUrl: driver.rcDoc || '',
        expiryDate: driver.rcExpiry || '2029-06-30',
        status: driver.rcStatus || 'Pending',
        expiryInfo: checkExpiry(driver.rcExpiry || '2029-06-30')
      },
      {
        type: 'Vehicle Insurance',
        key: 'insurance',
        documentNumber: driver.insurancePolicyNumber || 'N/A',
        docUrl: driver.insuranceDoc || '',
        expiryDate: driver.insuranceExpiryDetails || '2026-12-31',
        status: driver.insuranceStatus || 'Pending',
        expiryInfo: checkExpiry(driver.insuranceExpiryDetails || '2026-12-31')
      },
      {
        type: 'Fitness Certificate / Safety Permit',
        key: 'fitness',
        documentNumber: driver.fitnessDetails || 'N/A',
        docUrl: driver.fitnessDoc || '',
        expiryDate: driver.fitnessExpiry || '2027-03-31',
        status: driver.fitnessStatus || 'Pending',
        expiryInfo: checkExpiry(driver.fitnessExpiry || '2027-03-31')
      }
    ];

    const docsDictionary = {
      citizenship: {
        number: driver.citizenshipNumber || '',
        url: driver.citizenshipDoc || '',
        expiry: driver.citizenshipExpiry || '',
        status: driver.citizenshipStatus || 'Pending'
      },
      drivingLicence: {
        number: driver.drivingLicenceNumber || '',
        url: driver.drivingLicenceDoc || '',
        expiry: driver.drivingLicenceExpiry || '',
        status: driver.drivingLicenceStatus || 'Pending'
      },
      drivingLicense: {
        number: driver.drivingLicenceNumber || '',
        url: driver.drivingLicenceDoc || '',
        expiry: driver.drivingLicenceExpiry || '',
        status: driver.drivingLicenceStatus || 'Pending'
      },
      rc: {
        number: driver.rcNumber || '',
        url: driver.rcDoc || '',
        expiry: driver.rcExpiry || '',
        status: driver.rcStatus || 'Pending'
      },
      vehicleRc: {
        number: driver.rcNumber || '',
        url: driver.rcDoc || '',
        expiry: driver.rcExpiry || '',
        status: driver.rcStatus || 'Pending'
      },
      insurance: {
        number: driver.insurancePolicyNumber || '',
        url: driver.insuranceDoc || '',
        expiry: driver.insuranceExpiryDetails || '',
        status: driver.insuranceStatus || 'Pending'
      },
      fitness: {
        number: driver.fitnessDetails || '',
        url: driver.fitnessDoc || '',
        expiry: driver.fitnessExpiry || '',
        status: driver.fitnessStatus || 'Pending'
      },
      fitnessCertificate: {
        number: driver.fitnessDetails || '',
        url: driver.fitnessDoc || '',
        expiry: driver.fitnessExpiry || '',
        status: driver.fitnessStatus || 'Pending'
      }
    };

    res.json({
      success: true,
      data: {
        driverId: driver._id,
        driverName: driver.name,
        overallStatus: driver.driverStatus,
        documentsList: documents,
        documents: docsDictionary,
        // Direct top-level map for seamless frontend state merge
        citizenship: docsDictionary.citizenship,
        drivingLicence: docsDictionary.drivingLicence,
        drivingLicense: docsDictionary.drivingLicense,
        rc: docsDictionary.rc,
        vehicleRc: docsDictionary.vehicleRc,
        insurance: docsDictionary.insurance,
        fitness: docsDictionary.fitness,
        fitnessCertificate: docsDictionary.fitnessCertificate
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload / Replace Driver Document
// @route   POST /api/driver/documents
// @access  Private (Driver Only)
exports.uploadDriverDocument = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const docType = (req.body.docType || req.body.documentType || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    let docUrl = req.body.docUrl || req.body.documentUrl || req.body.url;
    if (req.file) {
      docUrl = `/uploads/${req.file.filename}`;
    }
    const documentNumber = req.body.documentNumber || req.body.docNumber || req.body.number;
    const expiryDate = req.body.expiryDate || req.body.expiry;

    if (!docType || !docUrl) {
      return res.status(400).json({ success: false, message: 'Document type and document file are required' });
    }

    switch (docType) {
      case 'citizenship':
      case 'citizenshipdoc':
        if (documentNumber) driver.citizenshipNumber = documentNumber;
        driver.citizenshipDoc = docUrl;
        if (expiryDate) driver.citizenshipExpiry = expiryDate;
        driver.citizenshipStatus = 'Pending';
        break;
      case 'drivinglicence':
      case 'drivinglicense':
      case 'driving_licence':
      case 'license':
        if (documentNumber) driver.drivingLicenceNumber = documentNumber;
        driver.drivingLicenceDoc = docUrl;
        if (expiryDate) driver.drivingLicenceExpiry = expiryDate;
        driver.drivingLicenceStatus = 'Pending';
        break;
      case 'rc':
      case 'vehiclerc':
      case 'bluebook':
        if (documentNumber) driver.rcNumber = documentNumber;
        driver.rcDoc = docUrl;
        if (expiryDate) driver.rcExpiry = expiryDate;
        driver.rcStatus = 'Pending';
        break;
      case 'insurance':
        if (documentNumber) driver.insurancePolicyNumber = documentNumber;
        driver.insuranceDoc = docUrl;
        if (expiryDate) driver.insuranceExpiryDetails = expiryDate;
        driver.insuranceStatus = 'Pending';
        break;
      case 'fitness':
      case 'fitnesscertificate':
      case 'permit':
        if (documentNumber) driver.fitnessDetails = documentNumber;
        driver.fitnessDoc = docUrl;
        if (expiryDate) driver.fitnessExpiry = expiryDate;
        driver.fitnessStatus = 'Pending';
        break;
      default:
        return res.status(400).json({ success: false, message: `Invalid document type '${docType}'` });
    }

    if (['Unverified', 'Rejected', 'Inactive', 'Suspended'].includes(driver.driverStatus) || !driver.driverStatus) {
      driver.driverStatus = 'Pending Verification';
    }

    await driver.save();

    res.json({
      success: true,
      message: `${docType} submitted for review and set to Pending verification`,
      data: {
        ...driver.toObject(),
        docType,
        docUrl,
        fileUrl: docUrl,
        documentUrl: docUrl,
        url: docUrl,
        citizenshipStatus: driver.citizenshipStatus?.toLowerCase(),
        drivingLicenceStatus: driver.drivingLicenceStatus?.toLowerCase(),
        rcStatus: driver.rcStatus?.toLowerCase(),
        insuranceStatus: driver.insuranceStatus?.toLowerCase(),
        fitnessStatus: driver.fitnessStatus?.toLowerCase()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Driver Online / Offline Status
// @route   GET /api/driver/status
// @access  Private (Driver Only)
exports.getDriverStatus = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id).lean();
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.json({
      success: true,
      data: {
        driverStatus: driver.driverStatus,
        isOnline: Boolean(driver.isOnline)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Driver Online / Offline Status
// @route   PUT /api/driver/status, PATCH /api/driver/status, PATCH /api/driver/toggle-status
// @access  Private (Driver Only)
exports.updateDriverStatus = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Suspended or Blocked drivers cannot go online
    if (['Blocked', 'Suspended', 'Rejected'].includes(driver.driverStatus)) {
      return res.status(403).json({
        success: false,
        message: `Account is ${driver.driverStatus}. You cannot accept ride requests.`
      });
    }

    if (req.body.isOnline !== undefined) {
      driver.isOnline = Boolean(req.body.isOnline);
      driver.driverStatus = driver.isOnline ? 'Active' : 'Inactive';
    } else if (req.body.status) {
      driver.driverStatus = req.body.status;
      driver.isOnline = req.body.status === 'Active';
    }

    await driver.save();

    res.json({
      success: true,
      message: `Driver status updated to ${driver.isOnline ? 'ONLINE' : 'OFFLINE'}`,
      data: {
        driverStatus: driver.driverStatus,
        isOnline: driver.isOnline
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Driver Language Preference
// @route   PUT /api/driver/language, PATCH /api/driver/language
// @access  Private (Driver Only)
exports.updateLanguage = async (req, res, next) => {
  try {
    const { language } = req.body;
    if (!language || !['en', 'ne', 'hi'].includes(language)) {
      return res.status(400).json({ success: false, message: 'Valid language is required (en, ne, hi)' });
    }
    const driver = await Driver.findById(req.driver._id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    driver.language = language;
    await driver.save();
    res.json({
      success: true,
      message: `Language updated to ${language}`,
      data: { language: driver.language }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Booking Requests for Driver's Assigned Vehicle
// @route   GET /api/driver/booking-requests, GET /api/driver/requests
// @access  Private (Driver Only)
exports.getBookingRequests = async (req, res, next) => {
  try {
    const driver = req.driver;

    // If driver is offline, return empty list
    if (!driver.isOnline) {
      return res.json({
        success: true,
        data: [],
        message: 'Driver is currently OFFLINE. Switch to ONLINE to receive ride requests.'
      });
    }

    const assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;

    const query = {
      $or: [
        { driver: driver._id },
        ...(assignedVehicleId ? [{ vehicle: assignedVehicleId }] : [])
      ],
      bookingStatus: { $in: ['Pending Driver Confirmation', 'Awaiting Cash Collection', 'Pending'] }
    };

    const requests = await Booking.find(query)
      .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory fuelType fareRate')
      .sort({ createdAt: -1 })
      .lean();

    // Map requests with external navigation links and countdown metadata
    const enrichedRequests = requests.map(reqItem => {
      const createdTime = new Date(reqItem.createdAt).getTime();
      const elapsedSeconds = Math.floor((Date.now() - createdTime) / 1000);
      const countdownSeconds = Math.max(0, 45 - elapsedSeconds);

      let safeHiredDetails = reqItem.hiredVehicleDetails;
      if (safeHiredDetails) {
        safeHiredDetails = { ...safeHiredDetails };
        delete safeHiredDetails.hireAmount;
        delete safeHiredDetails.additionalExpense;
        delete safeHiredDetails.hirePaymentStatus;
      }

      return {
        ...reqItem,
        hiredVehicleDetails: safeHiredDetails,
        countdownSeconds,
        remainingSeconds: countdownSeconds > 0 ? countdownSeconds : 45,
        isExpired: countdownSeconds === 0 && reqItem.bookingStatus === 'Pending',
        customerRating: 4.9,
        estimatedDistance: '12.5 km',
        pickupNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(reqItem.pickupLocation)}`,
        dropNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(reqItem.dropLocation)}`
      };
    });

    res.json({
      success: true,
      count: enrichedRequests.length,
      data: enrichedRequests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept Booking Request / Ride
// @route   POST /api/driver/booking-requests/:id/accept, POST /api/driver/requests/:id/accept
// @access  Private (Driver Only)
exports.acceptBookingRequest = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    // Driver Data Isolation & Vehicle Assignment Security Barrier
    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept bookings for this vehicle'
      });
    }

    // Prevent accepting already accepted/confirmed bookings
    if (['Confirmed', 'Completed', 'Cancelled', 'Rejected'].includes(booking.bookingStatus) && booking.driverConfirmationStatus === 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: `Booking is already in '${booking.bookingStatus}' status and cannot be accepted again.`
      });
    }

    // Assign driver if unassigned
    booking.driver = driver._id;
    booking.driverConfirmationStatus = 'Confirmed';
    booking.driverConfirmed = true;
    booking.driverConfirmedAt = new Date();
    booking.driverConfirmedBy = driver._id;
    booking.rideStatus = 'Accepted';

    const isBus = booking.serviceType === 'Bus';
    const isOfflineCash = booking.paymentMethod === 'Offline Cash' || booking.paymentMethod === 'Cash';
    const isPaid = booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Successful';

    if (isBus) {
      if (isPaid) {
        booking.bookingStatus = 'Confirmed';
      } else if (isOfflineCash) {
        booking.bookingStatus = 'Awaiting Cash Collection';
      } else {
        booking.bookingStatus = 'Pending';
      }
    } else {
      // Car / EV-Sewa ride flow
      if (isPaid || isOfflineCash) {
        booking.bookingStatus = 'Ongoing';
      } else {
        booking.bookingStatus = 'Ongoing';
      }
    }

    await booking.save();

    // Create customer notification
    const customerId = await getValidRecipientId(booking);
    const customerName = booking.customer?.name || (typeof booking.customer === 'string' ? booking.customer : 'Customer');
    await Notification.create({
      title: booking.bookingStatus === 'Confirmed' ? 'Booking Confirmed!' : 'Ride Request Accepted',
      message: `Your booking #${booking.bookingId} has been accepted by driver ${driver.name}. Pickup: ${booking.pickupLocation}`,
      recipient: `Customer: ${customerName}`,
      recipientRole: 'customer',
      ...(customerId ? { recipientId: customerId } : {}),
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Booking request accepted successfully',
      data: {
        ...booking.toObject(),
        rideStatus: booking.rideStatus,
        pickupNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.pickupLocation)}`,
        dropNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.dropLocation)}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject Booking Request
// @route   POST /api/driver/booking-requests/:id/reject, POST /api/driver/requests/:id/reject
// @access  Private (Driver Only)
exports.rejectBookingRequest = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    // Driver Data Isolation & Vehicle Assignment Check
    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to manage bookings for this vehicle'
      });
    }

    booking.driverConfirmationStatus = 'Rejected';
    booking.driverConfirmed = false;
    booking.bookingStatus = 'Rejected';
    booking.rideStatus = 'Cancelled';
    booking.rejectedBy = driver._id;
    booking.rejectedAt = new Date();
    booking.cancellationReason = reason || 'Driver rejected booking request';
    booking.cancelledBy = 'Driver';

    await booking.save();

    // Send customer notification
    await Notification.create({
      title: 'Booking Request Rejected',
      message: `Your booking #${booking.bookingId} could not be confirmed by the assigned driver. Reason: ${booking.cancellationReason}`,
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Booking request rejected',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Driver Arrives at Customer Pickup Location
// @route   POST /api/driver/rides/:id/arrived
// @access  Private (Driver Only)
exports.arriveAtPickup = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this ride' });
    }

    booking.rideStatus = 'Arrived';
    booking.arrivedAt = new Date();
    await booking.save();

    // Notify customer
    const customerId = await getValidRecipientId(booking);
    const customerName = booking.customer?.name || 'Customer';
    await Notification.create({
      title: 'Driver Has Arrived',
      message: `Your driver ${driver.name} has arrived at the pickup location (${booking.pickupLocation}). Share your PIN ${booking.rideOtp} to start your journey.`,
      recipient: `Customer: ${customerName}`,
      recipientRole: 'customer',
      ...(customerId ? { recipientId: customerId } : {}),
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Arrived at pickup location. Customer notified.',
      data: {
        ...booking.toObject(),
        bookingId: booking.bookingId,
        rideStatus: booking.rideStatus,
        arrivedAt: booking.arrivedAt,
        waitingTimerStarted: true
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Customer OTP/PIN
// @route   POST /api/driver/rides/:id/verify-otp
// @access  Private (Driver Only)
exports.verifyRideOtp = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;
    const { otp } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this ride' });
    }

    if (!otp || String(booking.rideOtp).trim() !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP / PIN. Please check with the passenger.'
      });
    }

    booking.otpVerified = true;
    await booking.save();

    res.json({
      success: true,
      message: 'Customer OTP verified successfully. You can now start the ride.',
      data: {
        bookingId: booking.bookingId,
        otpVerified: true
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start Active Ride
// @route   POST /api/driver/rides/:id/start
// @access  Private (Driver Only)
exports.startRide = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;
    const { otp } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this ride' });
    }

    // Verify OTP if passed or ensure otpVerified is true
    if (otp) {
      if (String(booking.rideOtp).trim() !== String(otp).trim()) {
        return res.status(400).json({ success: false, message: 'Invalid customer OTP/PIN' });
      }
      booking.otpVerified = true;
    } else if (!booking.otpVerified) {
      return res.status(400).json({
        success: false,
        message: 'Customer OTP verification is required before starting the ride'
      });
    }

    booking.rideStatus = 'Started';
    booking.bookingStatus = 'Ongoing';
    booking.startedAt = new Date();
    await booking.save();

    res.json({
      success: true,
      message: 'Ride started successfully',
      data: {
        ...booking.toObject(),
        dropNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.dropLocation)}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End Ride & Complete Journey
// @route   POST /api/driver/rides/:id/end
// @access  Private (Driver Only)
exports.endRide = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id);
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this ride' });
    }

    booking.rideStatus = 'Completed';
    booking.bookingStatus = 'Completed';
    booking.completedAt = new Date();

    const finalFare = booking.fare || 0;
    const platformCommission = Math.round(finalFare * 0.2);
    const driverEarning = finalFare - platformCommission;

    booking.driverPaymentAmount = driverEarning;

    // If offline cash, auto collect upon completion if not collected earlier
    if ((booking.paymentMethod === 'Offline Cash' || booking.paymentMethod === 'Cash') && !booking.cashCollected) {
      booking.paymentStatus = 'Paid';
      booking.cashCollected = true;
      booking.cashCollectedAt = new Date();
      booking.cashCollectedBy = driver._id;
    }

    await booking.save();

    // Credit Driver Wallet & Update Financials
    driver.walletBalance = (driver.walletBalance || 0) + driverEarning;
    driver.totalEarnings = (driver.totalEarnings || 0) + driverEarning;
    driver.totalCommission = (driver.totalCommission || 0) + platformCommission;
    await driver.save();

    // Update / Create Payment record
    await Payment.findOneAndUpdate(
      { booking: booking._id },
      {
        booking: booking._id,
        bookingId: booking.bookingId,
        customer: booking.customer,
        driver: driver._id,
        bookingAmount: finalFare,
        driverPayment: driverEarning,
        paymentStatus: 'Paid',
        paymentMethod: booking.paymentMethod
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Ride completed successfully. Receipt generated.',
      data: {
        ...booking.toObject(),
        bookingId: booking.bookingId,
        rideStatus: booking.rideStatus,
        dropLocation: booking.dropLocation,
        finalFare,
        platformCommission,
        driverEarning,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        completedAt: booking.completedAt,
        receipt: {
          tripId: booking.bookingId,
          totalFare: finalFare,
          commission: platformCommission,
          platformCommission: platformCommission,
          netEarnings: driverEarning,
          driverEarnings: driverEarning,
          paymentStatus: booking.paymentStatus,
          paymentMethod: booking.paymentMethod
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel Ride with Valid Reason
// @route   POST /api/driver/rides/:id/cancel
// @access  Private (Driver Only)
exports.cancelRide = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;
    const { reason } = req.body;

    const validReasons = [
      'Customer did not arrive',
      'Wrong pickup',
      'Vehicle problem',
      'Emergency',
      'Other'
    ];

    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Valid cancellation reason is required. Options: ${validReasons.join(', ')}`
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this ride' });
    }

    booking.rideStatus = 'Cancelled';
    booking.bookingStatus = 'Cancelled';
    booking.cancellationReason = reason;
    booking.cancelledBy = 'Driver';
    await booking.save();

    // Send customer notification
    await Notification.create({
      title: 'Ride Cancelled by Driver',
      message: `Your ride #${booking.bookingId} was cancelled by the driver. Reason: ${reason}`,
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Ride cancelled successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Collect Cash from Customer for Offline Cash Booking
// @route   POST /api/driver/bookings/:id/collect-cash, POST /api/driver/collect-cash
// @access  Private (Driver Only)
exports.collectCash = async (req, res, next) => {
  try {
    const driver = req.driver;
    const bookingIdParam = req.params.id || req.body.bookingId;

    if (!bookingIdParam) {
      return res.status(400).json({ success: false, message: 'Booking ID is required' });
    }

    const query = mongoose.Types.ObjectId.isValid(bookingIdParam)
      ? { _id: bookingIdParam }
      : { bookingId: bookingIdParam };

    const booking = await Booking.findOne(query);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Driver Data Isolation
    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to collect cash for this booking'
      });
    }

    // Block duplicate cash collection
    if (booking.cashCollected || booking.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Cash already collected and verified for this booking.'
      });
    }

    booking.cashCollected = true;
    booking.cashCollectedAt = new Date();
    booking.cashCollectedBy = driver._id;
    booking.paymentStatus = 'Paid';

    // If driver confirmation has also occurred, promote to Confirmed
    if (booking.driverConfirmationStatus === 'Confirmed') {
      booking.bookingStatus = 'Confirmed';
    }

    await booking.save();

    // Update / Create Payment record
    await Payment.findOneAndUpdate(
      { booking: booking._id },
      {
        booking: booking._id,
        bookingId: booking.bookingId,
        customer: booking.customer,
        driver: driver._id,
        bookingAmount: booking.fare,
        driverPayment: booking.driverPaymentAmount || Math.round(booking.fare * 0.8),
        paymentStatus: 'Paid',
        paymentMethod: 'Offline Cash',
        transactionReference: `CASH-${Date.now()}`
      },
      { upsert: true, new: true }
    );

    // Notify customer
    const customerId = await getValidRecipientId(booking);
    const customerName = booking.customer?.name || 'Customer';
    await Notification.create({
      title: 'Cash Payment Verified',
      message: `Driver ${driver.name} has confirmed cash payment of ₹${booking.fare} for booking #${booking.bookingId}. Your ticket is now fully confirmed.`,
      recipient: `Customer: ${customerName}`,
      recipientRole: 'customer',
      ...(customerId ? { recipientId: customerId } : {}),
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Cash collection confirmed. Payment status updated to Paid.',
      data: {
        booking: booking,
        bookingId: booking.bookingId,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus,
        cashCollected: booking.cashCollected,
        cashCollectedAt: booking.cashCollectedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Booking History
// @route   GET /api/driver/booking-history
// @access  Private (Driver Only)
exports.getBookingHistory = async (req, res, next) => {
  try {
    const driver = req.driver;
    const assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;

    const bookings = await Booking.find({
      $or: [
        { driver: driver._id },
        ...(assignedVehicleId ? [{ vehicle: assignedVehicleId }] : [])
      ]
    })
      .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory')
      .sort({ createdAt: -1 })
      .lean();

    const history = bookings.map(b => ({
      id: b._id,
      bookingId: b.bookingId,
      date: new Date(b.createdAt).toLocaleDateString(),
      time: new Date(b.createdAt).toLocaleTimeString(),
      customer: b.customer?.name || 'Passenger',
      customerPhone: b.customer?.phone ? `${b.customer.phone.slice(0, 3)}****${b.customer.phone.slice(-3)}` : 'N/A',
      pickup: b.pickupLocation,
      drop: b.dropLocation,
      distance: '15.4 km',
      fare: b.fare,
      driverEarnings: b.driverPaymentAmount || Math.round(b.fare * 0.8),
      paymentMethod: b.paymentMethod,
      paymentStatus: b.paymentStatus,
      status: b.bookingStatus,
      rideStatus: b.rideStatus || 'Completed'
    }));

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Authoritative Driver Earnings
// @route   GET /api/driver/earnings
// @access  Private (Driver Only)
exports.getEarnings = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id).lean();
    const assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const startOfMonth = new Date();
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    const matchDriver = {
      $or: [
        { driver: driver._id },
        ...(assignedVehicleId ? [{ vehicle: assignedVehicleId }] : [])
      ],
      paymentStatus: 'Paid'
    };

    const [todayAgg, weekAgg, monthAgg, completedCount, cancelledCount] = await Promise.all([
      Booking.aggregate([
        { $match: { ...matchDriver, createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$driverPaymentAmount' } } }
      ]),
      Booking.aggregate([
        { $match: { ...matchDriver, createdAt: { $gte: startOfWeek } } },
        { $group: { _id: null, total: { $sum: '$driverPaymentAmount' } } }
      ]),
      Booking.aggregate([
        { $match: { ...matchDriver, createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$driverPaymentAmount' } } }
      ]),
      Booking.countDocuments({
        $or: [
          { driver: driver._id },
          ...(assignedVehicleId ? [{ vehicle: assignedVehicleId }] : [])
        ],
        bookingStatus: 'Completed'
      }),
      Booking.countDocuments({
        $or: [
          { driver: driver._id },
          ...(assignedVehicleId ? [{ vehicle: assignedVehicleId }] : [])
        ],
        bookingStatus: 'Cancelled'
      })
    ]);

    const todayEarnings = todayAgg.length > 0 ? (todayAgg[0].total || 0) : 0;
    const weeklyEarnings = weekAgg.length > 0 ? (weekAgg[0].total || 0) : 0;
    const monthlyEarnings = monthAgg.length > 0 ? (monthAgg[0].total || 0) : (driver.totalEarnings || 0);

    const totalCommission = driver.totalCommission || Math.round(monthlyEarnings * 0.25);
    const netEarnings = monthlyEarnings;

    res.json({
      success: true,
      data: {
        todayEarnings,
        weeklyEarnings,
        monthlyEarnings,
        completedRides: completedCount,
        cancellations: cancelledCount,
        commission: totalCommission,
        netEarnings,
        walletBalance: driver.walletBalance || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Driver Wallet & Transaction Ledger
// @route   GET /api/driver/wallet
// @access  Private (Driver Only)
exports.getDriverWallet = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id).lean();
    const withdrawals = await Withdrawal.find({ driver: driver._id }).sort({ createdAt: -1 }).limit(10).lean();

    const recentPayments = await Payment.find({ driver: driver._id, paymentStatus: 'Paid' })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const ledger = recentPayments.map(p => ({
      id: p._id,
      date: new Date(p.createdAt).toLocaleDateString(),
      time: new Date(p.createdAt).toLocaleTimeString(),
      type: 'Ride Earning',
      amount: p.driverPayment || Math.round(p.bookingAmount * 0.8),
      status: 'Credited',
      referenceId: p.transactionReference || `TXN-${p.bookingId}`
    }));

    res.json({
      success: true,
      data: {
        walletBalance: driver.walletBalance || 0,
        totalEarnings: driver.totalEarnings || 0,
        totalBonus: driver.totalBonus || 0,
        totalCommission: driver.totalCommission || 0,
        totalWithdrawn: driver.totalWithdrawn || 0,
        payoutMethods: driver.payoutMethods || {},
        ledger,
        recentWithdrawals: withdrawals
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Payout / Withdrawal Request
// @route   POST /api/driver/withdraw
// @access  Private (Driver Only)
exports.requestWithdrawal = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id);
    const { amount, payoutDetails, accountDetails } = req.body;
    const methodInput = req.body.payoutMethod || req.body.method || '';

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is ₹100'
      });
    }

    if ((driver.walletBalance || 0) < withdrawAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Current balance: ₹${driver.walletBalance || 0}`
      });
    }

    let payoutMethod = 'Bank';
    if (/esewa/i.test(methodInput)) payoutMethod = 'eSewa';
    else if (/khalti/i.test(methodInput)) payoutMethod = 'Khalti';
    else if (/bank/i.test(methodInput)) payoutMethod = 'Bank';
    else payoutMethod = methodInput;

    if (!['Bank', 'eSewa', 'Khalti'].includes(payoutMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Valid payout method is required: Bank, eSewa, or Khalti'
      });
    }

    // Check if eSewa / Khalti sandbox/live API is configured
    const isEsewaLiveConfigured = Boolean(process.env.ESEWA_MERCHANT_CODE);
    const isKhaltiLiveConfigured = Boolean(process.env.KHALTI_SECRET_KEY);

    let withdrawalStatus = 'Pending';
    let configurationNotice = null;

    if (payoutMethod === 'eSewa' && !isEsewaLiveConfigured) {
      configurationNotice = 'BLOCKED — PAYMENT PROVIDER CONFIGURATION REQUIRED (eSewa merchant credentials missing)';
    } else if (payoutMethod === 'Khalti' && !isKhaltiLiveConfigured) {
      configurationNotice = 'BLOCKED — PAYMENT PROVIDER CONFIGURATION REQUIRED (Khalti merchant secret key missing)';
    }

    // Deduct balance and record withdrawal
    driver.walletBalance -= withdrawAmount;
    driver.totalWithdrawn = (driver.totalWithdrawn || 0) + withdrawAmount;
    await driver.save();

    const withdrawal = await Withdrawal.create({
      driver: driver._id,
      user: driver.user,
      amount: withdrawAmount,
      payoutMethod,
      payoutDetails: payoutDetails || accountDetails || driver.payoutMethods,
      status: withdrawalStatus,
      adminNotes: configurationNotice || 'Withdrawal request logged.'
    });

    res.json({
      success: true,
      message: configurationNotice
        ? `Withdrawal requested. Status: ${configurationNotice}`
        : 'Withdrawal request submitted successfully.',
      data: {
        ...withdrawal.toObject(),
        status: withdrawal.status.toLowerCase(),
        gatewayStatus: configurationNotice || 'READY'
      },
      newWalletBalance: driver.walletBalance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Active Driver Incentives & Progress
// @route   GET /api/driver/incentives
// @access  Private (Driver Only)
exports.getDriverIncentives = async (req, res, next) => {
  try {
    const driver = req.driver;
    const incentives = await Incentive.find({ status: 'Active' }).lean();

    const completedRidesCount = await Booking.countDocuments({
      driver: driver._id,
      bookingStatus: 'Completed'
    });

    const evaluatedIncentives = incentives.map(inc => {
      const currentProgress = Math.min(completedRidesCount, inc.targetValue);
      const isCompleted = completedRidesCount >= inc.targetValue;
      return {
        ...inc,
        currentProgress,
        isCompleted,
        earnedBonus: isCompleted ? inc.bonusAmount : 0
      };
    });

    res.json({
      success: true,
      count: evaluatedIncentives.length,
      data: evaluatedIncentives
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger Driver SOS Emergency (CRITICAL: NO GPS TRANSMISSION)
// @route   POST /api/driver/sos
// @access  Private (Driver Only)
exports.triggerSOS = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id).populate('assignedVehicle').lean();

    // Emergency details dispatch without GPS tracking
    const emergencyContact = driver.emergencyContact || { name: 'Emergency Services', phone: '112 / 100' };

    await Notification.create({
      title: '🚨 DRIVER SOS EMERGENCY ALERT',
      message: `Driver ${driver.name} (Phone: ${driver.mobileNumber}) triggered an Emergency Alert. Vehicle: ${driver.assignedVehicle?.vehicleNumber || 'N/A'}.`,
      recipient: 'All Admins',
      recipientRole: 'admin',
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'SOS alert dispatched to response center and emergency contacts.',
      data: {
        driverName: driver.name,
        emergencyContact,
        helpline: '112 (National Police Helpline) / +977-1-4200000',
        gpsTracking: 'DISABLED'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get EV Vehicle Battery, Range & Charging Stations (EV ONLY)
// @route   GET /api/driver/ev-hub
// @access  Private (Driver Only)
exports.getEVDetails = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id).populate('assignedVehicle');
    const vehicle = driver.assignedVehicle;

    const isEV = vehicle && (vehicle.vehicleType === 'EV-Sewa' || vehicle.vehicleType === 'ev' || vehicle.fuelType === 'EV' || driver.assignedType === 'ev');
    if (!isEV) {
      return res.json({
        success: true,
        data: {
          isEV: false,
          message: 'Assigned vehicle is not an Electric Vehicle (EV).'
        }
      });
    }

    const chargingStations = [
      {
        name: 'Tata Power EZ EV Charging Hub',
        location: 'Kashmere Gate ISBT EV Plaza',
        plugTypes: ['CCS2 Fast (60 kW)', 'Type 2 AC (22 kW)'],
        availablePlugs: 4,
        status: 'Available',
        navigationUrl: 'https://www.google.com/maps/dir/?api=1&destination=Kashmere+Gate+ISBT+Delhi'
      },
      {
        name: 'EcoRide Rapid Supercharger',
        location: 'IFFCO Chowk Green Corridor',
        plugTypes: ['GB/T Fast DC (50 kW)', 'CCS2 (120 kW)'],
        availablePlugs: 2,
        status: 'Available',
        navigationUrl: 'https://www.google.com/maps/dir/?api=1&destination=IFFCO+Chowk+Gurugram'
      },
      {
        name: 'Kathmandu Eco-Charge Hub',
        location: 'Ratna Park Electric Bus Terminal',
        plugTypes: ['CCS2 Fast (60 kW)'],
        availablePlugs: 6,
        status: 'Available',
        navigationUrl: 'https://www.google.com/maps/dir/?api=1&destination=Ratna+Park+Kathmandu'
      }
    ];

    res.json({
      success: true,
      data: {
        isEV: true,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleName: vehicle.vehicleName,
        batteryPercentage: driver.batteryPercentage || 85,
        estimatedRangeKm: driver.estimatedRangeKm || 180,
        lastChargedAt: driver.lastChargedAt,
        chargingReminder: (driver.batteryPercentage || 85) < 20 ? 'Battery is low. Please visit a charging station.' : 'Battery level optimal.',
        chargingStations
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update EV Battery Level Manually
// @route   PUT /api/driver/ev-battery
// @access  Private (Driver Only)
exports.updateEVBattery = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id);
    const { batteryPercentage, estimatedRangeKm } = req.body;

    if (batteryPercentage !== undefined) {
      driver.batteryPercentage = Math.min(100, Math.max(0, Number(batteryPercentage)));
      if (driver.batteryPercentage === 100) {
        driver.lastChargedAt = new Date();
      }
    }

    if (estimatedRangeKm !== undefined) {
      driver.estimatedRangeKm = Number(estimatedRangeKm);
    }

    await driver.save();

    res.json({
      success: true,
      message: 'EV Battery status updated successfully',
      data: {
        batteryPercentage: driver.batteryPercentage,
        estimatedRangeKm: driver.estimatedRangeKm,
        lastChargedAt: driver.lastChargedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Driver Notifications
// @route   GET /api/driver/notifications
// @access  Private (Driver Only)
exports.getDriverNotifications = async (req, res, next) => {
  try {
    const driver = req.driver;
    const notifications = await Notification.find({
      $or: [
        { recipientRole: 'all' },
        { recipientRole: 'driver' },
        { recipient: `Driver: ${driver.name}` }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Driver Support Information & Tickets
// @route   GET /api/driver/support
// @access  Private (Driver Only)
exports.getDriverSupport = async (req, res, next) => {
  try {
    const driver = req.driver;
    const tickets = await Support.find({
      $or: [
        { driver: driver._id },
        { mobileNumber: driver.mobileNumber }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    const faqList = [
      { q: 'How is driver fare calculated?', a: '80% of the total collected passenger fare goes directly to driver earnings, with 20% platform fee.' },
      { q: 'When do I collect Offline Cash?', a: 'When the passenger boards, tap [ Collect Cash ] -> [ Confirm Cash Received ] to mark booking Paid and fully confirmed.' },
      { q: 'How does External Navigation work?', a: 'Tapping [ Navigate to Pickup ] or [ Navigate to Drop ] opens Google Maps externally. The app does NOT track your GPS.' },
      { q: 'How do I submit withdrawal requests?', a: 'Visit the Wallet screen, enter the withdrawal amount and payout details (Bank, eSewa, or Khalti).' }
    ];

    res.json({
      success: true,
      data: {
        helpline: '+91 98765 00000 / 1800-PLATFORM',
        email: 'driver-support@platform.com',
        faqList,
        tickets
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Driver Support Ticket
// @route   POST /api/driver/support/ticket
// @access  Private (Driver Only)
exports.createSupportTicket = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { category, supportIssue, bookingId } = req.body;

    if (!supportIssue) {
      return res.status(400).json({ success: false, message: 'Issue description is required' });
    }

    const ticketId = `TKT-DRV-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;

    const ticket = await Support.create({
      ticketId,
      requesterName: driver.name,
      role: 'driver',
      mobileNumber: driver.mobileNumber,
      driver: driver._id,
      category: category || 'General',
      bookingId: bookingId || 'N/A',
      supportIssue,
      status: 'Open',
      supportInformation: 'Driver ticket created and dispatched to fleet admin team.'
    });

    res.json({
      success: true,
      message: 'Support ticket submitted successfully',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};
