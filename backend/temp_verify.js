const mongoose = require('mongoose');
const crypto = require('crypto');
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
const getDriverVehicleOwnershipQuery = require('../utils/driverVehicleQuery');
const { validateRoutePricing } = require('../utils/routeFares');
const driverBookingResponse = require('../utils/driverBookingResponse');
const { vehicleMatchesBookingRoute } = require('../utils/notification');

const getBookingQuery = (idOrCode) => {
  return mongoose.isValidObjectId(idOrCode)
    ? { $or: [{ bookingId: idOrCode }, { _id: idOrCode }] }
    : { bookingId: idOrCode };
};

const omitCustomerPhonePermission = driver => {
  const profile = driver.toObject();
  delete profile.canViewCustomerPhone;
  return profile;
};


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

// Helper to check Driver data isolation / vehicle authorization & route eligibility
const verifyDriverVehicleAccess = async (driver, booking) => {
  if (!booking || !driver) return false;

  // Driver eligibility: must be Active
  if (driver.driverStatus && !['Active', 'Approved'].includes(driver.driverStatus)) {
    return false;
  }

  const driverIdStr = driver._id.toString();
  const userIdStr = driver.user ? (driver.user._id || driver.user).toString() : null;

  // Direct driver reference check (if already confirmed/assigned to a specific driver)
  if (booking.driver && (booking.driverConfirmationStatus === 'Confirmed' || booking.driverConfirmed)) {
    const bookingDriverStr = (booking.driver._id || booking.driver).toString();
    if (bookingDriverStr === driverIdStr || (userIdStr && bookingDriverStr === userIdStr)) {
      return true;
    } else {
      // Assigned and confirmed to another driver -> forbidden
      return false;
    }
  }

  if (booking.driver && booking.serviceType !== 'Bus') {
    const bookingDriverStr = (booking.driver._id || booking.driver).toString();
    if (bookingDriverStr !== driverIdStr && (!userIdStr || bookingDriverStr !== userIdStr)) {
      return false;
    }
  }

  if (booking.driverAssigned && (booking.driverConfirmationStatus === 'Confirmed' || booking.driverConfirmed)) {
    const bookingAssignedStr = (booking.driverAssigned._id || booking.driverAssigned).toString();
    if (bookingAssignedStr === driverIdStr || (userIdStr && bookingAssignedStr === userIdStr)) {
      return true;
    } else {
      // Assigned and confirmed to another driver -> forbidden
      return false;
    }
  }

  // If booking is already confirmed by another driver -> forbidden
  if (booking.driverConfirmationStatus === 'Confirmed' || booking.driverConfirmed) {
    return false;
  }

  // Unassigned booking -> Check Driver's Assigned Vehicle & Route Match
  let assignedVehicle = null;
  if (driver.assignedVehicle) {
    if (typeof driver.assignedVehicle === 'object' && (driver.assignedVehicle.route || driver.assignedVehicle.vehicleStatus)) {
      assignedVehicle = driver.assignedVehicle;
    } else {
      assignedVehicle = await Vehicle.findById(driver.assignedVehicle._id || driver.assignedVehicle).lean();
    }
  } else {
    assignedVehicle = await Vehicle.findOne({ assignedDriver: driver._id }).lean();
  }

  if (!assignedVehicle) {
    // Driver has no assigned vehicle -> not authorized
    return false;
  }

  if (assignedVehicle.vehicleStatus && assignedVehicle.vehicleStatus !== 'Active') {
    // Assigned vehicle is not active -> not authorized
    return false;
  }

  if (booking.bookingMode !== 'INSTANT' && booking.serviceType !== 'Any' && assignedVehicle.vehicleType !== booking.serviceType) return false;

  const isSelectedBusVehicle = (booking.bookingMode === 'INSTANT' || booking.serviceType === 'Bus' || booking.serviceType === 'Any')
    && booking.vehicle && String(assignedVehicle._id) === String(booking.vehicle?._id || booking.vehicle);
  return vehicleMatchesBookingRoute(assignedVehicle, booking, {
    requireRouteMatch: !isSelectedBusVehicle
  });
};

// @desc    Get Driver Dashboard Summary
// @route   GET /api/driver/dashboard
// @access  Private (Driver Only)
exports.getDriverDashboard = async (req, res, next) => {
  try {
    const driver = req.driver;
    let assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;
    if (!assignedVehicleId) {
      let vByDriver = await Vehicle.findOne({ assignedDriver: driver._id, vehicleStatus: 'Active' }).select('_id').lean();
      if (!vByDriver) {
        vByDriver = await Vehicle.findOne({ assignedDriver: driver._id }).sort({ createdAt: -1 }).select('_id').lean();
      }
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
      driver.isOnline && ['Active', 'Approved'].includes(driver.driverStatus)
        ? (async () => {
            const candidates = await Booking.find({
              serviceType: { $in: ['Bus', 'EV-Sewa', 'Car'] },
              driverConfirmed: { $ne: true },
              driverConfirmationStatus: { $ne: 'Confirmed' },
              confirmationOtpVerifiedAt: null,
              otpVerified: { $ne: true },
              cashCollected: { $ne: true },
              rideStatus: { $ne: 'Accepted' },
              bookingStatus: {
                $in: ['Pending Driver Confirmation', 'Pending', 'Pending Admin Confirmation', 'Admin Confirmed', 'ADMIN_CONFIRMED']
              },
              bookingMode: { $ne: 'INSTANT' },
              driver: { $in: [null, driver._id] }
            })
              .select('bookingId user customer serviceType pickupLocation dropLocation fare driverPaymentAmount paymentStatus bookingStatus rideStatus travelDate passengerDetails busSeatNumbers vehicle driver createdAt')
              .populate('user', 'phone')
              .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory vehicleStatus seatingCapacity fuelType route pickupDropDetails hireDetails')
              .sort({ createdAt: -1 })
              .limit(20)
              .lean();

            const driverVeh = assignedVehicleId ? await Vehicle.findById(assignedVehicleId).lean() : null;

            return candidates.filter(b => {
              if (b.driverConfirmed || b.driverConfirmationStatus === 'Confirmed' || b.confirmationOtpVerifiedAt || b.otpVerified || b.cashCollected || b.rideStatus === 'Accepted') return false;
              if (['Awaiting Cash Collection', 'Confirmed', 'Completed', 'Cancelled', 'Rejected'].includes(b.bookingStatus)) return false;
              if (b.serviceType !== driverVeh?.vehicleType) return false;
              if (b.serviceType !== 'Bus' && b.driver && (b.driver._id || b.driver).toString() !== driver._id.toString()) return false;
              if (driverVeh) {
                const isSelectedBusVehicle = b.serviceType === 'Bus'
                  && String(driverVeh._id) === String(b.vehicle?._id || b.vehicle);
                return vehicleMatchesBookingRoute(driverVeh, b, {
                  requireRouteMatch: !isSelectedBusVehicle
                });
              }
              return false;
            }).slice(0, 10);
          })()
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
        ...driverBookingResponse(activeRide, driver.canViewCustomerPhone === true),
        // External navigation URL to pickup or drop (strictly NO GPS tracking)
        pickupNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeRide.pickupLocation)}`,
        dropNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeRide.dropLocation)}`
      } : null,
      bookingRequests: bookingRequests.map(booking => driverBookingResponse(booking, driver.canViewCustomerPhone === true)),
      recentHistory: recentHistory.map(booking => driverBookingResponse(booking, driver.canViewCustomerPhone === true)),
      documentSummary,
      evDetails: isEV ? {
        batteryPercentage: driver.batteryPercentage || 85,
        estimatedRangeKm: driver.estimatedRangeKm || 180,
        lastChargedAt: driver.lastChargedAt
      } : null,
      activeIncentives
    };

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

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

    delete driver.canViewCustomerPhone;
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
      const userUpdates = {
        name: driver.name,
        phone: driver.mobileNumber,
        ...(profilePhoto ? { profilePhoto } : {})
      };
      if (req.body.email) userUpdates.email = req.body.email.toLowerCase().trim();
      await User.findByIdAndUpdate(driver.user, userUpdates);
    }

    res.json({
      success: true,
      message: 'Driver profile updated successfully',
      data: omitCustomerPhonePermission(driver)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change Driver Login ID (Email or Mobile Phone Number)
// @route   PUT /api/driver/account/login-id
// @access  Private (Driver Only)
exports.changeDriverLoginId = async (req, res, next) => {
  try {
    const { newLoginId, loginType } = req.body;
    if (!newLoginId || !newLoginId.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide new email or mobile phone number' });
    }

    const cleanId = newLoginId.trim();
    const isEmail = loginType === 'email' || cleanId.includes('@');

    const driver = await Driver.findById(req.driver._id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const userId = driver.user || req.user?._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Driver user account not found' });
    }

    if (isEmail) {
      const emailLower = cleanId.toLowerCase();
      const existing = await User.findOne({ email: emailLower, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'This email is already registered with another account' });
      }
      user.email = emailLower;
    } else {
      const existingUser = await User.findOne({ phone: cleanId, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'This mobile number is already registered with another account' });
      }
      user.phone = cleanId;
      driver.mobileNumber = cleanId;
    }

    await user.save();
    await driver.save();

    res.json({
      success: true,
      message: `Driver login ID changed successfully to ${cleanId}`,
      data: {
        driverId: driver._id,
        userId: user._id,
        email: user.email,
        phone: user.phone,
        mobileNumber: driver.mobileNumber
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change Driver Password
// @route   PUT /api/driver/account/password
// @access  Private (Driver Only)
exports.changeDriverPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    if (confirmNewPassword && newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match' });
    }

    const driver = await Driver.findById(req.driver._id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const userId = driver.user || req.user?._id;
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect. Please try again.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
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
    if (req.query.vehicleId) {
      if (!mongoose.isValidObjectId(req.query.vehicleId)) {
        return res.status(400).json({ success: false, message: 'Invalid vehicleId' });
      }

      const selectedVehicle = await Vehicle.findOne({
        _id: req.query.vehicleId,
        ...getDriverVehicleOwnershipQuery(driver)
      }).lean();
      if (!selectedVehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found or you are not authorized to view it' });
      }

      const isEV = selectedVehicle.vehicleType === 'EV-Sewa' || selectedVehicle.fuelType === 'EV';
      return res.json({
        success: true,
        data: {
          ...selectedVehicle,
          isEV,
          fuelType: selectedVehicle.fuelType || (isEV ? 'EV' : 'Diesel'),
          batteryPercentage: isEV ? (driver.batteryPercentage || 85) : null,
          estimatedRangeKm: isEV ? (driver.estimatedRangeKm || 180) : null
        }
      });
    }

    let assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;
    if (!assignedVehicleId) {
      let vByDriver = await Vehicle.findOne({ assignedDriver: driver._id, vehicleStatus: 'Active' }).select('_id').lean();
      if (!vByDriver) {
        vByDriver = await Vehicle.findOne({ assignedDriver: driver._id }).sort({ createdAt: -1 }).select('_id').lean();
      }
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
        docUrl: driver.citizenshipDocFront || driver.citizenshipDoc || '',
        docFront: driver.citizenshipDocFront || driver.citizenshipDoc || '',
        docBack: driver.citizenshipDocBack || '',
        issueDate: driver.citizenshipIssueDate || 'N/A',
        citizenshipIssueDate: driver.citizenshipIssueDate || '',
        status: driver.citizenshipStatus || 'Pending Verification',
        rejectionReason: driver.citizenshipStatus === 'Rejected' ? (driver.rejectionReason || '') : ''
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
        rcNumber: driver.rcNumber || 'N/A',
        vehicleNumber: driver.vehicleNumber || '',
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
      },
      {
        type: 'Route Permit',
        key: 'routePermit',
        description: driver.routePermit?.description || driver.routePermitDescription || 'N/A',
        documentNumber: driver.routePermit?.description || driver.routePermitDescription || 'N/A',
        docUrl: driver.routePermit?.document || driver.routePermitDoc || '',
        status: driver.routePermit?.status || driver.routePermitStatus || 'Not Submitted',
        rejectionReason: (driver.routePermit?.status === 'Rejected' || driver.routePermitStatus === 'Rejected') ? (driver.routePermit?.rejectionReason || driver.rejectionReason || '') : ''
      }
    ];

    const docsDictionary = {
      citizenship: {
        number: driver.citizenshipNumber || '',
        documentNumber: driver.citizenshipNumber || '',
        url: driver.citizenshipDocFront || driver.citizenshipDoc || '',
        docFront: driver.citizenshipDocFront || driver.citizenshipDoc || '',
        docBack: driver.citizenshipDocBack || '',
        issueDate: driver.citizenshipIssueDate || '',
        citizenshipIssueDate: driver.citizenshipIssueDate || '',
        status: driver.citizenshipStatus || 'Pending Verification',
        rejectionReason: driver.citizenshipStatus === 'Rejected' ? (driver.rejectionReason || '') : ''
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
        documentNumber: driver.rcNumber || '',
        rcNumber: driver.rcNumber || '',
        vehicleNumber: driver.vehicleNumber || '',
        url: driver.rcDoc || '',
        expiry: driver.rcExpiry || '',
        expiryDate: driver.rcExpiry || '',
        status: driver.rcStatus || 'Pending'
      },
      vehicleRc: {
        number: driver.rcNumber || '',
        documentNumber: driver.rcNumber || '',
        rcNumber: driver.rcNumber || '',
        vehicleNumber: driver.vehicleNumber || '',
        url: driver.rcDoc || '',
        expiry: driver.rcExpiry || '',
        expiryDate: driver.rcExpiry || '',
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
      },
      routePermit: {
        description: driver.routePermit?.description || driver.routePermitDescription || '',
        documentNumber: driver.routePermit?.description || driver.routePermitDescription || '',
        url: driver.routePermit?.document || driver.routePermitDoc || '',
        document: driver.routePermit?.document || driver.routePermitDoc || '',
        status: driver.routePermit?.status || driver.routePermitStatus || 'Not Submitted',
        rejectionReason: (driver.routePermit?.status === 'Rejected' || driver.routePermitStatus === 'Rejected') ? (driver.routePermit?.rejectionReason || driver.rejectionReason || '') : ''
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
        fitnessCertificate: docsDictionary.fitnessCertificate,
        routePermit: docsDictionary.routePermit
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
    const issueDate = req.body.citizenshipIssueDate || req.body.issueDate || req.body.issue_date;

    if (!docType) {
      return res.status(400).json({ success: false, message: 'Document type is required' });
    }

    switch (docType) {
      case 'citizenship':
      case 'citizenshipdoc': {
        const citizenshipNum = req.body.citizenshipNumber || documentNumber;
        let frontUrl = req.body.citizenshipDocFront || req.body.docFront || req.body.documentFront || docUrl;
        let backUrl = req.body.citizenshipDocBack || req.body.docBack || req.body.documentBack;

        if (req.files && req.files.length > 0) {
          const frontFile = req.files.find(f => ['docFront', 'documentFront', 'front', 'citizenshipDocFront', 'document', 'file'].includes(f.fieldname)) || req.files[0];
          const backFile = req.files.find(f => ['docBack', 'documentBack', 'back', 'citizenshipDocBack'].includes(f.fieldname)) || (req.files.length > 1 ? req.files[1] : null);

          if (frontFile) frontUrl = `/uploads/${frontFile.filename}`;
          if (backFile) backUrl = `/uploads/${backFile.filename}`;
        } else if (req.file && !frontUrl) {
          frontUrl = `/uploads/${req.file.filename}`;
        }

        if (!frontUrl) {
          return res.status(400).json({ success: false, message: 'Front side document is required' });
        }

        if (citizenshipNum) driver.citizenshipNumber = citizenshipNum;
        if (frontUrl) {
          driver.citizenshipDoc = frontUrl;
          driver.citizenshipDocFront = frontUrl;
        }
        if (backUrl) {
          driver.citizenshipDocBack = backUrl;
        }
        if (issueDate) {
          driver.citizenshipIssueDate = issueDate;
        }
        driver.citizenshipStatus = 'Pending Verification';
        break;
      }
      case 'drivinglicence':
      case 'drivinglicense':
      case 'driving_licence':
      case 'license':
        if (documentNumber) driver.drivingLicenceNumber = documentNumber;
        driver.drivingLicenceDoc = docUrl;
        if (expiryDate) driver.drivingLicenceExpiry = expiryDate;
        driver.drivingLicenceStatus = 'Pending Verification';
        break;
      case 'rc':
      case 'vehiclerc':
      case 'bluebook':
      case 'vehicleregistration':
      case 'vehicleregistrationcertificate': {
        const vNum = (req.body.vehicleNumber || '').trim();
        if (!vNum) {
          return res.status(400).json({ success: false, message: 'Vehicle Number is required' });
        }
        if (documentNumber) driver.rcNumber = documentNumber.trim();
        driver.vehicleNumber = vNum;
        driver.rcDoc = docUrl;
        if (expiryDate) driver.rcExpiry = expiryDate.trim();
        driver.rcStatus = 'Pending Verification';
        break;
      }
      case 'insurance':
        if (documentNumber) driver.insurancePolicyNumber = documentNumber;
        driver.insuranceDoc = docUrl;
        if (expiryDate) driver.insuranceExpiryDetails = expiryDate;
        driver.insuranceStatus = 'Pending Verification';
        break;
      case 'fitness':
      case 'fitnesscertificate':
      case 'permit':
        if (documentNumber) driver.fitnessDetails = documentNumber;
        driver.fitnessDoc = docUrl;
        if (expiryDate) driver.fitnessExpiry = expiryDate;
        driver.fitnessStatus = 'Pending Verification';
        break;
      case 'routepermit':
      case 'route_permit':
      case 'routepermitdoc': {
        const description = req.body.description || req.body.routePermitDescription || req.body.details || req.body.documentNumber || documentNumber || '';
        if (!description || !description.trim()) {
          return res.status(400).json({ success: false, message: 'Please enter route permit description.' });
        }
        if (description.trim().length > 200) {
          return res.status(400).json({ success: false, message: 'Description must be at most 200 characters.' });
        }
        if (!docUrl) {
          return res.status(400).json({ success: false, message: 'Route permit document is required' });
        }

        driver.routePermit = {
          description: description.trim(),
          document: docUrl,
          status: 'Pending Verification',
          rejectionReason: ''
        };
        driver.routePermitDescription = description.trim();
        driver.routePermitDoc = docUrl;
        driver.routePermitStatus = 'Pending Verification';
        break;
      }
      default:
        return res.status(400).json({ success: false, message: `Invalid document type '${docType}'` });
    }

    driver.driverStatus = 'Pending Verification';
    driver.requiredDocumentsStatus = 'Pending Verification';

    await driver.save();

    res.json({
      success: true,
      message: `${docType} submitted for review and set to Pending verification`,
      data: {
        ...omitCustomerPhonePermission(driver),
        docType,
        docUrl,
        fileUrl: docUrl,
        documentUrl: docUrl,
        url: docUrl,
        citizenshipStatus: driver.citizenshipStatus?.toLowerCase(),
        drivingLicenceStatus: driver.drivingLicenceStatus?.toLowerCase(),
        rcStatus: driver.rcStatus?.toLowerCase(),
        insuranceStatus: driver.insuranceStatus?.toLowerCase(),
        fitnessStatus: driver.fitnessStatus?.toLowerCase(),
        routePermitStatus: (driver.routePermit?.status || driver.routePermitStatus)?.toLowerCase()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload Driver Vehicle Images (Front + Back)
// @route   POST /api/driver/vehicle-images
// @access  Private (Driver Only)
exports.uploadDriverVehicleImages = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Use exact vehicleId provided by the client, fallback to driver's assigned vehicle if missing.
    let vehicleId = req.body.vehicleId || null;
    
    if (!vehicleId) {
      vehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;
    }

    if (!vehicleId) {
      return res.status(404).json({ success: false, message: 'vehicleId is required or no vehicle assigned to this driver' });
    }
    if (!mongoose.isValidObjectId(vehicleId)) {
      return res.status(400).json({ success: false, message: 'Invalid vehicleId' });
    }

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      ...getDriverVehicleOwnershipQuery(driver)
    });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found or you are not authorized to update it' });
    }

    // req.files is populated by handleMultipleUpload / upload.any()
    // Field names: vehicleImages (sent as array from driver app)
    const files = req.files || [];
    if (files.length !== 4) {
      return res.status(400).json({ success: false, message: 'Exactly 4 vehicle images (Front, Back, Left, Right) are required' });
    }

    const frontUrl = `/uploads/${files[0].filename}`;
    const backUrl  = `/uploads/${files[1].filename}`;
    const leftUrl  = `/uploads/${files[2].filename}`;
    const rightUrl = `/uploads/${files[3].filename}`;

    // Replace all existing images with the new 4 exactly
    vehicle.vehicleImages = [frontUrl, backUrl, leftUrl, rightUrl];

    await vehicle.save();

    res.json({
      success: true,
      message: 'Vehicle images uploaded successfully',
      data: {
        vehicleImages: vehicle.vehicleImages
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

    // Suspended, Blocked, Rejected, or Pending Verification drivers cannot go online
    if (['Blocked', 'Suspended', 'Rejected', 'Pending Verification', 'Pending'].includes(driver.driverStatus)) {
      if (req.body.isOnline) {
        return res.status(403).json({
          success: false,
          message: `Your driver account is currently '${driver.driverStatus}'. You cannot go online or accept ride requests until Admin approves your documents.`
        });
      }
    }

    const updateFields = {};
    if (req.body.isOnline !== undefined) {
      updateFields.isOnline = Boolean(req.body.isOnline);
      if (['Active', 'Inactive'].includes(driver.driverStatus)) {
        updateFields.driverStatus = updateFields.isOnline ? 'Active' : 'Inactive';
      }
    } else if (req.body.status) {
      updateFields.driverStatus = req.body.status;
      updateFields.isOnline = req.body.status === 'Active';
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      driver._id,
      { $set: updateFields },
      { new: true }
    );

    res.json({
      success: true,
      message: `Driver status updated to ${updatedDriver ? (updatedDriver.isOnline ? 'ONLINE' : 'OFFLINE') : 'OFFLINE'}`,
      data: {
        driverStatus: updatedDriver ? updatedDriver.driverStatus : driver.driverStatus,
        isOnline: updatedDriver ? updatedDriver.isOnline : driver.isOnline
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

    // Driver eligibility check: must be Active and Online
    if (!driver || !['Active', 'Approved'].includes(driver.driverStatus)) {
      return res.json({ success: true, count: 0, data: [], reason: 'DRIVER_NOT_ACTIVE', driverStatus: driver ? driver.driverStatus : null });
    }

    if (!driver.isOnline) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        reason: 'DRIVER_OFFLINE',
        message: 'Driver is currently OFFLINE. Switch to ONLINE to receive ride requests.'
      });
    }

    // Load driver's assigned vehicle guaranteed via fresh DB lookup & type-coerced reverse match
    let assignedVehicle = null;

    const currentDriverDoc = await Driver.findById(driver._id).lean();
    if (currentDriverDoc && currentDriverDoc.assignedVehicle) {
      assignedVehicle = await Vehicle.findById(currentDriverDoc.assignedVehicle).lean();
    }

    if (!assignedVehicle) {
      const driverObjId = mongoose.Types.ObjectId.isValid(driver._id)
        ? new mongoose.Types.ObjectId(driver._id)
        : driver._id;

      assignedVehicle = await Vehicle.findOne({
        $or: [
          { assignedDriver: driver._id },
          { assignedDriver: driver._id.toString() },
          { assignedDriver: driverObjId }
        ]
      }).lean();
    }

    if (!assignedVehicle || (assignedVehicle.vehicleStatus && assignedVehicle.vehicleStatus !== 'Active')) {
      return res.json({ success: true, count: 0, data: [], reason: 'NO_ACTIVE_ASSIGNED_VEHICLE', assignedVehicle, driverId: driver._id });
    }
    if (!['Bus', 'EV-Sewa', 'Car'].includes(assignedVehicle.vehicleType)) {
      return res.json({ success: true, count: 0, data: [], reason: 'UNSUPPORTED_VEHICLE_TYPE' });
    }

    // Fetch candidate pending bookings
    const candidateBookings = await Booking.find({
      $or: [
        { serviceType: assignedVehicle.vehicleType },
        { bookingMode: 'INSTANT' },
        { serviceType: 'Any' }
      ],
      driverConfirmed: { $ne: true },
      driverConfirmationStatus: { $ne: 'Confirmed' },
      confirmationOtpVerifiedAt: null,
      otpVerified: { $ne: true },
      cashCollected: { $ne: true },
      rideStatus: { $ne: 'Accepted' },
      bookingStatus: {
        $in: ['Pending Driver Confirmation', 'Pending', 'Pending Admin Confirmation', 'Admin Confirmed', 'ADMIN_CONFIRMED']
      },
      driver: { $in: [null, driver._id] }
    })
      .populate('user', 'phone')
      .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory fuelType fareRate route pickupDropDetails hireDetails')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[getBookingRequests Debug] Driver ${driver.name} candidateBookings count: ${candidateBookings.length}`);

    // Check if this driver currently has an active Instant Booking
    const hasActiveInstantBooking = Boolean(await Booking.exists({
      driver: driver._id,
      bookingMode: 'INSTANT',
      rideStatus: { $in: ['Accepted', 'Arrived', 'Started'] }
    }));

    // Filter candidate bookings by route match & eligibility
    const requests = candidateBookings.filter(reqItem => {
      // Direct canonical exclusion check
      if (reqItem.driverConfirmed || reqItem.driverConfirmationStatus === 'Confirmed' || reqItem.confirmationOtpVerifiedAt || reqItem.otpVerified || reqItem.cashCollected || reqItem.rideStatus === 'Accepted') {
        return false;
      }

      // If driver already has an active instant booking, do not offer more instant booking requests
      if (hasActiveInstantBooking && reqItem.bookingMode === 'INSTANT') {
        return false;
      }
      
      // If directly assigned to another driver, exclude it for ALL booking modes (first driver wins)
      if (reqItem.driver && (reqItem.driver._id || reqItem.driver).toString() !== driver._id.toString()) {
        return false;
      }

      if (['Awaiting Cash Collection', 'Confirmed', 'Completed', 'Cancelled', 'Rejected'].includes(reqItem.bookingStatus)) {
        return false;
      }
      // Bus, Any, or INSTANT requests remain broadcast; non-Bus requests cannot be claimed by another assigned driver unless they are 'Any' or 'INSTANT' broadcast.
      if (reqItem.bookingMode === 'INSTANT' || reqItem.serviceType === 'Bus' || reqItem.serviceType === 'Any') {
        if (assignedVehicle) {
          const isSelectedBusVehicle = reqItem.vehicle && String(assignedVehicle._id) === String(reqItem.vehicle?._id || reqItem.vehicle);
          const matches = vehicleMatchesBookingRoute(assignedVehicle, reqItem, {
            requireRouteMatch: !isSelectedBusVehicle
          });
          console.log(`[getBookingRequests Debug] Driver ${driver.name} vehicle ${assignedVehicle.vehicleNumber} (${assignedVehicle.route?.origin}->${assignedVehicle.route?.destination}) matches booking ${reqItem.bookingId} (${reqItem.pickupLocation}->${reqItem.dropLocation}): ${matches}`);
          return matches;
        }
        return false;
      }
      // If pending/unconfirmed request, check route match between driver's assigned vehicle and booking
      if (assignedVehicle) {
        const matches = vehicleMatchesBookingRoute(assignedVehicle, reqItem, { requireRouteMatch: true });
        console.log(`[getBookingRequests Debug] Driver ${driver.name} vehicle ${assignedVehicle.vehicleNumber} (${assignedVehicle.route?.origin}->${assignedVehicle.route?.destination}) matches booking ${reqItem.bookingId} (${reqItem.pickupLocation}->${reqItem.dropLocation}): ${matches}`);
        return matches;
      }
      return false;
    });

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
      }

      return {
        ...driverBookingResponse(reqItem, driver.canViewCustomerPhone === true),
        hiredVehicleDetails: safeHiredDetails,
        countdownSeconds,
        remainingSeconds: countdownSeconds > 0 ? countdownSeconds : 45,
        isExpired: countdownSeconds === 0 && reqItem.bookingStatus === 'Pending',
        customerRating: 4.9,
        estimatedDistance: '12.5 km',
        pickupNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(reqItem.pickupLocation)}`,
        dropNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(reqItem.dropLocation)}`,
        acceptUrl: `/api/driver/bookings/${reqItem._id}/accept`,
        otpVerifyUrl: `/api/driver/bookings/${reqItem._id}/verify-otp`
      };
    });

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
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

// @desc    Get Active Bookings for Driver (Accepted but OTP not yet verified, and ongoing)
// @route   GET /api/driver/active-bookings
// @access  Private (Driver Only)
exports.getActiveBookingsForDriver = async (req, res, next) => {
  try {
    const driver = req.driver;
    const assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;

    const query = {
      $or: [
        { driver: driver._id },
        { assignedDriverId: driver._id },
        ...(assignedVehicleId ? [{ vehicle: assignedVehicleId }, { assignedVehicleId }] : [])
      ],
      bookingStatus: { $nin: ['Cancelled', 'Rejected'] }
    };

    const bookings = await Booking.find(query)
      .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory fuelType fareRate seatingCapacity')
      .sort({ createdAt: -1 })
      .lean();

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings.map(booking => driverBookingResponse(booking, driver.canViewCustomerPhone === true))
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

    const booking = await Booking.findOne(getBookingQuery(id));
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
    if (['Confirmed', 'Completed', 'Cancelled', 'Rejected'].includes(booking.bookingStatus) || booking.driverConfirmed || booking.confirmationOtpVerifiedAt || booking.rideStatus === 'Accepted') {
      if (booking.driver && booking.driver.toString() === driver._id.toString()) {
        return res.json({
          success: true,
          message: 'Booking already accepted by this driver',
          data: driverBookingResponse(booking, driver.canViewCustomerPhone === true)
        });
      }
      return res.status(400).json({
        success: false,
        message: `Booking is already in '${booking.bookingStatus}' status and cannot be accepted again.`
      });
    }

    // Explicit bookingMode branching for active conflict evaluation
    const isInstant = booking.bookingMode === 'INSTANT';

    if (isInstant) {
      // INSTANT BOOKING CONFLICT RULE:
      // A driver cannot accept multiple simultaneous active instant bookings.
      const activeInstantBooking = await Booking.findOne({
        _id: { $ne: booking._id },
        driver: driver._id,
        bookingMode: 'INSTANT',
        rideStatus: { $in: ['Accepted', 'Arrived', 'Started'] }
      }).select('bookingId bookingStatus rideStatus').lean();

      if (activeInstantBooking) {
        return res.status(409).json({
          success: false,
          code: 'DRIVER_HAS_ACTIVE_INSTANT_BOOKING',
          message: 'This driver has already accepted another instant booking.'
        });
      }
    } else {
      // SCHEDULE BOOKING CONFLICT RULE:
      // Schedule bookings are NOT blocked by active instant bookings.
      // Schedule bookings are evaluated using their own booking mode, travel date/time,
      // assigned vehicle/driver, and existing schedule availability rules.
      if (booking.driver && booking.driver.toString() !== driver._id.toString()) {
        return res.status(409).json({
          success: false,
          message: 'This schedule booking request has already been assigned to another driver.'
        });
      }
    }

    let assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;
    if (!assignedVehicleId) {
      let vByDriver = await Vehicle.findOne({ assignedDriver: driver._id, vehicleStatus: 'Active' }).select('_id').lean();
      if (!vByDriver) {
         vByDriver = await Vehicle.findOne({ assignedDriver: driver._id }).sort({ createdAt: -1 }).select('_id').lean();
      }
      if (vByDriver) assignedVehicleId = vByDriver._id;
    }
    const assignedVehicle = assignedVehicleId ? await Vehicle.findById(assignedVehicleId).lean() : null;

    const finalServiceType = booking.serviceType === 'Any' && assignedVehicle ? assignedVehicle.vehicleType : booking.serviceType;
    const isBus = finalServiceType === 'Bus';
    const isOfflineCash = booking.paymentMethod === 'Offline Cash' || booking.paymentMethod === 'Cash';
    const isPaid = booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Successful';

    let nextBookingStatus;
    if (isBus) {
      if (isPaid) {
        nextBookingStatus = 'Confirmed';
      } else {
        nextBookingStatus = 'Pending Driver Confirmation';
      }
    } else {
      // Car / EV-Sewa ride flow
      nextBookingStatus = 'Ongoing';
    }


    const updateSet = {
      driver: driver._id,
      assignedDriverId: driver._id,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      rideStatus: 'Accepted',
      bookingStatus: nextBookingStatus
    };

    if (booking.bookingMode === 'INSTANT' && (booking.serviceType === 'Any' || !booking.vehicle) && assignedVehicle) {
      updateSet.vehicle = assignedVehicle._id;
      updateSet.serviceType = assignedVehicle.vehicleType;
      
      const { getRouteSegmentFare } = require('../utils/routeFares');
      let fare = assignedVehicle.fareRate || assignedVehicle.fare || 0;
      if (Array.isArray(assignedVehicle.route?.stops) && assignedVehicle.route.stops.length > 0) {
        const segFare = getRouteSegmentFare(assignedVehicle.route, booking.pickupLocation, booking.dropLocation);
        if (segFare != null) fare = segFare;
      }
      
      const passCount = booking.passengerDetails?.length || 1;
      updateSet.fare = fare * passCount;
      updateSet.originalFare = fare * passCount;
      updateSet.finalFare = fare * passCount;
    }

    let claimedBooking;
    try {
      claimedBooking = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          driverConfirmed: { $ne: true },
          driverConfirmationStatus: { $ne: 'Confirmed' },
          confirmationOtpVerifiedAt: null,
          otpVerified: { $ne: true },
          cashCollected: { $ne: true },
          rideStatus: { $ne: 'Accepted' },
          bookingStatus: {
            $in: ['Pending Driver Confirmation', 'Pending', 'Pending Admin Confirmation', 'Admin Confirmed', 'ADMIN_CONFIRMED']
          },
          driver: { $in: [null, driver._id] }
        },
        { $set: updateSet },
        { new: true }
      );
    } catch (error) {
      console.error('!!! ACCEPT RIDE DB ERROR:', error);
      console.error('!!! DRIVER ID:', driver._id);
      require('fs').writeFileSync('accept_ride_error.json', JSON.stringify({
        error: error.message,
        code: error.code,
        driverId: driver._id,
        bookingMode: booking.bookingMode,
        rawError: error
      }, null, 2));
      if (
        booking.bookingMode === 'INSTANT' &&
        error.code === 11000 &&
        error.message.includes('one_active_instant_booking_per_driver')
      ) {
        return res.status(409).json({
          success: false,
          message: 'This driver has already accepted another instant booking.'
        });
      }
      throw error;
    }
    if (!claimedBooking) {
      const freshBooking = await Booking.findById(booking._id).lean();
      if (freshBooking && freshBooking.driver && freshBooking.driver.toString() === driver._id.toString()) {
        return res.json({
          success: true,
          message: 'Booking already accepted by this driver',
          data: driverBookingResponse(freshBooking, driver.canViewCustomerPhone === true)
        });
      }
      return res.status(409).json({
        success: false,
        message: 'This booking request has already been accepted by another driver.'
      });
    }
    booking.set(claimedBooking.toObject());

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

    // Send push notification to Customer for real-time fare update
    if (customerId && booking.bookingMode === 'INSTANT') {
      try {
        const User = require('../models/User');
        const custUser = await User.findById(customerId).select('pushToken fcmToken');
        if (custUser && (custUser.pushToken || custUser.fcmToken)) {
          const custToken = (custUser.pushToken || custUser.fcmToken).trim();
          if (custToken) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                to: custToken,
                title: 'Instant Booking Fare Calculated',
                body: `Driver ${driver.name} accepted. Final fare is ₹${updateSet.finalFare}. Tap to view.`,
                data: {
                  type: 'INSTANT_BOOKING_FARE_UPDATED',
                  bookingId: booking._id.toString()
                },
                sound: 'default',
                priority: 'high',
                channelId: 'customer-booking-updates'
              })
            });
          }
        }
      } catch (pushErr) {
        console.warn('Customer push notification failed:', pushErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Booking request accepted successfully',
      data: {
        ...driverBookingResponse(booking, driver.canViewCustomerPhone === true),
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

    const booking = await Booking.findOne(getBookingQuery(id));
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
      data: driverBookingResponse(booking, driver.canViewCustomerPhone === true)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Customer Booking OTP by Assigned Driver
// @route   POST /api/driver/bookings/:id/verify-otp, POST /api/driver/verify-otp
// @access  Private (Driver Only)
