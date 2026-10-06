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
const Schedule = require('../models/Schedule');
const ServiceControl = require('../models/ServiceControl');
const { dashboardCache } = require('../utils/cache');
const getDriverVehicleOwnershipQuery = require('../utils/driverVehicleQuery');
const BusOffer = require('../models/BusOffer');
const { validateRoutePricing, getRouteSegmentFare } = require('../utils/routeFares');
const driverBookingResponse = require('../utils/driverBookingResponse');
const { driverMatchesBookingRoute } = require('../utils/routeMatching');
const { getActiveInstantBookingQuery, getActiveReservedSeats } = require('../utils/activeInstantBooking');

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

// Helper to normalize vehicle category names
const normalizeVehicleType = (val) => {
  if (!val) return '';
  const s = String(val).trim().toLowerCase().replace(/[\s_\-]+/g, '');
  if (s.includes('bus')) return 'bus';
  if (s.includes('car') || s.includes('sedan') || s.includes('suv') || s.includes('hatchback')) return 'car';
  if (s.includes('evsewa') || s.includes('ev')) return 'ev-sewa';
  if (s.includes('truck')) return 'truck';
  return s;
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

  if (booking.bookingMode === 'SCHEDULE' && booking.driver) {
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

  const serviceControl = await ServiceControl.findOne().select('oppositeRouteNotifications').lean();
  return driverMatchesBookingRoute(driver, booking, {
    allowOpposite: serviceControl?.oppositeRouteNotifications === true
  });
};

const getActiveRequestVehiclesForDriver = async (driver) => {
  const driverId = driver?._id;
  if (!driverId) return [];

  const directlyAssignedVehicleId = driver.assignedVehicle
    ? (driver.assignedVehicle._id || driver.assignedVehicle)
    : null;
  const assignmentConditions = [{ assignedDriver: driverId }];
  if (directlyAssignedVehicleId) {
    assignmentConditions.push({ _id: directlyAssignedVehicleId });
  }

  const vehicles = await Vehicle.find({
    vehicleStatus: 'Active',
    $or: assignmentConditions
  }).lean();

  return vehicles.filter(vehicle => {
    if (!['bus', 'ev-sewa', 'car', 'truck'].includes(String(vehicle.vehicleType || '').trim().toLowerCase())) return false;

    const isDirectAssignment = directlyAssignedVehicleId
      && String(vehicle._id) === String(directlyAssignedVehicleId)
      && (!vehicle.assignedDriver || String(vehicle.assignedDriver) === String(driverId));
    const isReverseAssignment = vehicle.assignedDriver
      && String(vehicle.assignedDriver) === String(driverId);

    return Boolean(isDirectAssignment || isReverseAssignment);
  });
};

const getRequestValueVariants = (values) => [...new Set(values.flatMap(value => {
  const text = String(value);
  return [text, text.toLowerCase(), text.toUpperCase()];
}))];

const verifyClaimedInstantVehicleAccess = async (driver, booking) => {
  if (!driver || !booking?.driver || !booking.vehicle) return false;
  if (String(booking.driver._id || booking.driver) !== String(driver._id)) return false;

  const driverStatus = String(driver.driverStatus || '').trim().toLowerCase();
  if (!['active', 'approved'].includes(driverStatus) || driver.isOnline !== true) return false;

  const vehicles = await getActiveRequestVehiclesForDriver(driver);
  const assignedVehicleId = String(booking.vehicle._id || booking.vehicle);
  const vehicle = vehicles.find(candidate => String(candidate._id) === assignedVehicleId);
  if (!vehicle) return false;

  const serviceControl = await ServiceControl.findOne().select('oppositeRouteNotifications').lean();
  const allowOpposite = serviceControl?.oppositeRouteNotifications === true;
  if (!driverMatchesBookingRoute(driver, booking, { allowOpposite })) return false;

  const reservedSeats = await getActiveReservedSeats(vehicle._id);
  const capacity = vehicle.seatingCapacity || 4;
  return reservedSeats <= capacity;
};

const verifyAssignedBookingVehicleAccess = async (driver, booking) => {
  if (!driver || !booking?.vehicle) return false;

  const driverIds = [driver._id, driver.user?._id || driver.user]
    .filter(Boolean)
    .map(String);

  const assignedVehicleId = String(booking.vehicle._id || booking.vehicle);
  let assignedDriverId = booking.driver
    ? String(booking.driver._id || booking.driver)
    : null;

  const hasAssignedSchedule = booking.bookingMode === 'SCHEDULE';
  if (hasAssignedSchedule && booking.scheduleId) {
    const scheduleId = booking.scheduleId._id || booking.scheduleId;
    const schedule = await Schedule.findOne({
      _id: scheduleId,
      status: 'Active'
    }).select('driver vehicle').lean();
    if (!schedule || String(schedule.vehicle) !== assignedVehicleId) return false;

    const scheduleDriverId = String(schedule.driver);
    if (assignedDriverId && assignedDriverId !== scheduleDriverId) return false;
    assignedDriverId = scheduleDriverId;
  }

  const vehicle = await Vehicle.findOne({
    _id: assignedVehicleId,
    vehicleStatus: 'Active'
  }).lean();
  if (!vehicle) return false;

  if (hasAssignedSchedule && !booking.scheduleId && !assignedDriverId && vehicle.assignedDriver) {
    assignedDriverId = String(vehicle.assignedDriver);
  }
  if (!assignedDriverId || !driverIds.includes(assignedDriverId)) return false;

  if (hasAssignedSchedule && vehicle.assignedDriver && String(vehicle.assignedDriver) !== assignedDriverId) {
    return false;
  }

  if (!hasAssignedSchedule) {
    const directVehicleId = driver.assignedVehicle?._id || driver.assignedVehicle;
    const directlyAssigned = directVehicleId && String(directVehicleId) === assignedVehicleId;
    const reverseAssigned = vehicle.assignedDriver && String(vehicle.assignedDriver) === assignedDriverId;
    if (!directlyAssigned && !reverseAssigned) return false;
    if (vehicle.assignedDriver && String(vehicle.assignedDriver) !== assignedDriverId) return false;
  }

  const serviceControl = await ServiceControl.findOne().select('oppositeRouteNotifications').lean();
  return driverMatchesBookingRoute(driver, booking, {
    allowOpposite: serviceControl?.oppositeRouteNotifications === true
  });
};

const verifyDriverRouteOtpAccess = async (driver, booking) => {
  if (!driver || !booking) return false;

  const driverIds = [driver._id, driver.user?._id || driver.user]
    .filter(Boolean)
    .map(String);
  const bookingDriverId = booking.driver ? String(booking.driver._id || booking.driver) : null;
  const assignedToDriver = bookingDriverId && driverIds.includes(bookingDriverId);
  const recipientQuery = {
    recipientRole: 'driver',
    eventType: 'BOOKING_REQUEST',
    entityType: 'Booking',
    entityId: booking._id
  };
  const requestRecipientConditions = [{ driverId: driver._id }];
  const userId = driver.user?._id || driver.user;
  if (userId) requestRecipientConditions.push({ recipientId: userId });

  const [hasBookingRequests, isRequestRecipient] = await Promise.all([
    Notification.exists(recipientQuery),
    Notification.exists({ ...recipientQuery, $or: requestRecipientConditions })
  ]);

  let assignedBySchedule = false;
  if (booking.bookingMode === 'SCHEDULE' && booking.scheduleId) {
    const schedule = await Schedule.findOne({
      _id: booking.scheduleId._id || booking.scheduleId,
      status: 'Active'
    }).select('driver').lean();
    assignedBySchedule = Boolean(schedule && driverIds.includes(String(schedule.driver)));
  }

  let assignedByVehicle = false;
  if (!bookingDriverId && !booking.scheduleId && booking.vehicle) {
    const vehicleId = booking.vehicle._id || booking.vehicle;
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      vehicleStatus: 'Active'
    }).select('_id assignedDriver').lean();
    const driverVehicleId = driver.assignedVehicle?._id || driver.assignedVehicle;
    assignedByVehicle = Boolean(vehicle && (
      driverIds.includes(String(vehicle.assignedDriver || '')) ||
      String(driverVehicleId || '') === String(vehicle._id)
    ));
  }

  const authorizedRecipient = assignedToDriver || isRequestRecipient ||
    (!hasBookingRequests && (
      !bookingDriverId && (assignedBySchedule || assignedByVehicle)
    ));
  if (!authorizedRecipient) return false;

  const serviceControl = await ServiceControl.findOne().select('oppositeRouteNotifications').lean();
  return driverMatchesBookingRoute(driver, booking, {
    allowOpposite: serviceControl?.oppositeRouteNotifications === true
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
          const instantModeVariants = getRequestValueVariants(['INSTANT']);
          const otherModeVariants = getRequestValueVariants(['NORMAL', 'SCHEDULE']);
          const candidates = await Booking.find({
              bookingMode: { $in: [...instantModeVariants, ...otherModeVariants] },
              driverConfirmed: { $ne: true },
              driverConfirmationStatus: { $ne: 'Confirmed' },
              confirmationOtpVerifiedAt: null,
              otpVerified: { $ne: true },
              cashCollected: { $ne: true },
              rideStatus: { $ne: 'Accepted' },
              bookingStatus: {
                $in: ['Pending Driver Confirmation', 'Pending', 'Pending Admin Confirmation', 'Admin Confirmed', 'ADMIN_CONFIRMED']
              }
            })
              .select('bookingId bookingMode user customer serviceType pickupLocation dropLocation fare driverPaymentAmount paymentStatus bookingStatus rideStatus travelDate passengerDetails busSeatNumbers vehicle driver createdAt')
              .populate('user', 'phone')
              .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory vehicleStatus seatingCapacity fuelType route pickupDropDetails hireDetails assignedDriver')
              .sort({ createdAt: -1 })
              .limit(20)
              .lean();

            return candidates.filter(booking => {
              const b = booking;
              if (b.driverConfirmed || b.driverConfirmationStatus === 'Confirmed' || b.confirmationOtpVerifiedAt || b.otpVerified || b.cashCollected || b.rideStatus === 'Accepted') return false;
              if (['Awaiting Cash Collection', 'Confirmed', 'Completed', 'Cancelled', 'Rejected'].includes(b.bookingStatus)) return false;
              return driverMatchesBookingRoute(driver, b);
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
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
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
      address,
      emergencyContact,
      payoutMethods,
      language,
      route
    } = req.body;
    const profilePhoto = req.file ? `/uploads/${req.file.filename}` : req.body.profilePhoto;

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
    if (route !== undefined) {
      if (
        !route ||
        typeof route.origin !== 'string' ||
        typeof route.destination !== 'string' ||
        Boolean(route.origin.trim()) !== Boolean(route.destination.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: 'Driver route must include both origin and destination, or leave both empty.'
        });
      }
      driver.route = {
        origin: route.origin.trim(),
        destination: route.destination.trim()
      };
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
const getInstantBookingRequests = async (req, res, next) => {
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

    // Fetch candidate pending bookings
    const candidateBookings = await Booking.find({
      bookingMode: { $in: ['INSTANT', 'NORMAL', 'SCHEDULE'] },
      driverConfirmed: { $ne: true },
      driverConfirmationStatus: { $ne: 'Confirmed' },
      confirmationOtpVerifiedAt: null,
      otpVerified: { $ne: true },
      cashCollected: { $ne: true },
      rideStatus: { $ne: 'Accepted' },
      bookingStatus: {
        $in: ['Pending Driver Confirmation', 'Pending', 'Pending Admin Confirmation', 'Admin Confirmed', 'ADMIN_CONFIRMED']
      }
    })
      .populate('user', 'phone')
      .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory fuelType fareRate route pickupDropDetails hireDetails')
      .sort({ createdAt: -1 })
      .lean();

    // Filter candidate bookings by route match & eligibility
    const requests = candidateBookings.filter(reqItem => {
      // Direct canonical exclusion check
      if (reqItem.driverConfirmed || reqItem.driverConfirmationStatus === 'Confirmed' || reqItem.confirmationOtpVerifiedAt || reqItem.otpVerified || reqItem.cashCollected || reqItem.rideStatus === 'Accepted') {
        return false;
      }

      if (['Awaiting Cash Collection', 'Confirmed', 'Completed', 'Cancelled', 'Rejected'].includes(reqItem.bookingStatus)) {
        return false;
      }
      return driverMatchesBookingRoute(driver, reqItem);
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

const getScheduleBookingRequests = async (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

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

    const instantModeVariants = getRequestValueVariants(['INSTANT']);
    const otherModeVariants = getRequestValueVariants(['NORMAL', 'SCHEDULE']);
    const candidateBookings = await Booking.find({
      bookingMode: { $in: [...instantModeVariants, ...otherModeVariants] },
      driverConfirmed: { $ne: true },
      driverConfirmationStatus: { $ne: 'Confirmed' },
      confirmationOtpVerifiedAt: null,
      otpVerified: { $ne: true },
      cashCollected: { $ne: true },
      rideStatus: { $ne: 'Accepted' },
      bookingStatus: {
        $in: ['Pending Driver Confirmation', 'Pending', 'Pending Admin Confirmation', 'Admin Confirmed', 'ADMIN_CONFIRMED']
      },
    })
      .populate('user', 'phone')
      .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory fuelType fareRate route pickupDropDetails hireDetails assignedDriver')
      .sort({ createdAt: -1 })
      .lean();

    const candidateScheduleIds = candidateBookings
      .filter(booking => booking.bookingMode === 'SCHEDULE' && booking.scheduleId)
      .map(booking => booking.scheduleId._id || booking.scheduleId);
    const activeSchedules = candidateScheduleIds.length > 0
      ? await Schedule.find({ _id: { $in: candidateScheduleIds }, status: 'Active' })
        .select('_id driver vehicle origin destination travelDate departureTime')
        .lean()
      : [];
    const activeScheduleById = new Map(activeSchedules.map(schedule => [String(schedule._id), schedule]));

    // Read admin toggle for opposite-route eligibility
    const serviceControl = await ServiceControl.findOne().lean();
    const allowOpposite = serviceControl?.oppositeRouteNotifications === true;
    console.log(`[ROUTE-NOTIFICATION-TRACE] polling oppositeRouteNotifications flag = ${allowOpposite}`);

    // Filter candidate bookings by route match & eligibility
    const requests = candidateBookings.filter(reqItem => {
      const exclude = reason => {
        console.log(
          `[BOOKING_REQUESTS_FILTERED] bookingId=${reqItem.bookingId || reqItem._id} reason=${reason}`
        );
        console.log('[LIVE_REQUESTS_DEBUG]', {
          driverId: String(driver._id),
          bookingId: String(reqItem._id),
          count: 0,
          excludedReason: reason
        });
        return false;
      };
      // Direct canonical exclusion check
      if (reqItem.driverConfirmed || reqItem.driverConfirmationStatus === 'Confirmed' || reqItem.confirmationOtpVerifiedAt || reqItem.otpVerified || reqItem.cashCollected || reqItem.rideStatus === 'Accepted') {
        return exclude('already-confirmed-or-accepted');
      }
      
      const assignedDriver = reqItem.driver || reqItem.assignedDriverId;
      if (assignedDriver && String(assignedDriver._id || assignedDriver) !== String(driver._id)) {
        if (reqItem.bookingMode !== 'INSTANT' && reqItem.bookingMode !== 'NORMAL') {
          return exclude('assigned-to-another-driver');
        }
      }

      if (reqItem.rejectedDrivers && reqItem.rejectedDrivers.some(id => String(id) === String(driver._id))) {
        return exclude('rejected-by-this-driver');
      }

      if (reqItem.bookingMode === 'SCHEDULE') {
        const schedule = reqItem.scheduleId
          ? activeScheduleById.get(String(reqItem.scheduleId._id || reqItem.scheduleId))
          : null;
        if (reqItem.scheduleId && !schedule) return exclude('schedule-is-not-active');
        if (reqItem.serviceType === 'Car' && schedule) {
          const bookingDate = new Date(reqItem.travelDate);
          const scheduleDate = new Date(schedule.travelDate);
          if (
            Number.isNaN(bookingDate.getTime()) ||
            Number.isNaN(scheduleDate.getTime()) ||
            bookingDate.getFullYear() !== scheduleDate.getFullYear() ||
            bookingDate.getMonth() !== scheduleDate.getMonth() ||
            bookingDate.getDate() !== scheduleDate.getDate()
          ) return exclude('schedule-travel-date-mismatch');
        }
      }

      if (['Awaiting Cash Collection', 'Confirmed', 'Completed', 'Cancelled', 'Rejected'].includes(reqItem.bookingStatus)) {
        return exclude(`booking-status-${reqItem.bookingStatus}`);
      }

      const routeMatch = driverMatchesBookingRoute(driver, reqItem, { allowOpposite });
      if (reqItem.bookingMode === 'INSTANT' && (reqItem.serviceType === 'Car' || reqItem.serviceType === 'CAR' || reqItem.serviceType === 'car')) {
        console.log('[CAR_REQUEST_DEBUG]', {
          bookingId: reqItem.bookingId,
          bookingMode: reqItem.bookingMode,
          serviceType: reqItem.serviceType,
          pickup: reqItem.pickupLocation,
          drop: reqItem.dropLocation,
          assignedDriver: reqItem.driver || reqItem.assignedDriverId,
          assignedVehicle: reqItem.vehicle ? reqItem.vehicle._id : null,
          driverRoute: driver.route,
          candidateDriver: driver._id,
          eligible: routeMatch,
          excludedReason: !routeMatch ? 'driver-route-does-not-match-booking' : null
        });
      }

      return routeMatch || exclude('driver-route-does-not-match-booking');
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

    if (process.env.NODE_ENV !== 'production') {
      const latest = enrichedRequests[0];
      const scheduleId = latest?.scheduleId?._id || latest?.scheduleId;
      const schedule = scheduleId ? activeScheduleById.get(String(scheduleId)) : null;
      console.info(
        `[BOOKING_REQUESTS] count=${enrichedRequests.length}` +
        ` latest=${latest?.bookingId || latest?._id || 'none'}` +
        ` createdAt=${latest?.createdAt || 'none'}` +
        ` mode=${latest?.bookingMode || 'none'}` +
        ` scheduleId=${scheduleId || 'none'}` +
        ` route=${latest ? `${latest.pickupLocation || ''} -> ${latest.dropLocation || ''}` : 'none'}`
      );
      if (schedule) {
        console.info(
          `[BOOKING_REQUESTS_SCHEDULE] vehicle=${schedule.vehicle}` +
          ` driver=${schedule.driver}` +
          ` route=${schedule.origin} -> ${schedule.destination}` +
          ` travelDate=${schedule.travelDate}` +
          ` departureTime=${schedule.departureTime}`
        );
      }
    }

    console.log('[LIVE_REQUESTS_DEBUG]', {
      driverId: String(driver._id),
      bookingId: enrichedRequests.length > 0 ? String(enrichedRequests[0]._id) : 'none',
      count: enrichedRequests.length,
      excludedReason: null
    });

    res.json({
      success: true,
      count: enrichedRequests.length,
      data: enrichedRequests,
      latest: enrichedRequests[0] || null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Active Bookings for Driver (Accepted but OTP not yet verified, and ongoing)
// @route   GET /api/driver/active-bookings
// @access  Private (Driver Only)


exports.getBookingRequests = async (req, res, next) => {
  return getScheduleBookingRequests(req, res, next);
};

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
const acceptInstantBookingRequest = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;

    const booking = req.bookingObj;
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    if (booking.driver && String(booking.driver._id || booking.driver) !== String(driver._id)) {
      if (booking.driverConfirmed || booking.driverConfirmationStatus === 'Confirmed' || booking.rideStatus === 'Accepted') {
        return res.status(409).json({
          success: false,
          message: 'This booking request has already been accepted by another driver.'
        });
      } else if (booking.bookingMode !== 'INSTANT' && booking.bookingMode !== 'NORMAL') {
        return res.status(409).json({
          success: false,
          message: 'This booking request is assigned to another driver.'
        });
      }
    }

    const driverStatus = String(driver.driverStatus || '').trim().toLowerCase();
    const isEligibleDriver = ['active', 'approved'].includes(driverStatus) && driver.isOnline === true;
    
    const serviceControl = await ServiceControl.findOne().select('oppositeRouteNotifications').lean();
    const allowOpposite = serviceControl?.oppositeRouteNotifications === true;
    
    // Authorization is purely based on route matching and driver status
    const isAuthorized = isEligibleDriver && driverMatchesBookingRoute(driver, booking, { allowOpposite });

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept this booking based on your assigned route.'
      });
    }

    let requestVehicle = null;

    // Prevent accepting already accepted/confirmed bookings
    if (['Confirmed', 'Completed', 'Cancelled', 'Rejected'].includes(booking.bookingStatus) || booking.driverConfirmed || booking.confirmationOtpVerifiedAt || booking.rideStatus === 'Accepted') {
      if (booking.driver && booking.driver.toString() === driver._id.toString()) {
        return res.json({
          success: true,
          message: 'Booking already accepted by this driver',
          data: driverBookingResponse(booking, driver.canViewCustomerPhone === true)
        });
      }
      return res.status(409).json({
        success: false,
        message: 'Booking no longer available.'
      });
    }

    // Explicit bookingMode branching for active conflict evaluation
    const isInstant = true;

    if (isInstant) {
      // INSTANT BOOKING CONFLICT RULE:
      // Capacity check instead of single active booking check
      const reqSeats = booking.passengerDetails ? booking.passengerDetails.length : 1;
      
      let vehicleId = requestVehicle?._id || (driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null);
      if (!vehicleId) {
        let vByDriver = await Vehicle.findOne({ assignedDriver: driver._id, vehicleStatus: 'Active' }).select('_id').lean();
        if (!vByDriver) {
           vByDriver = await Vehicle.findOne({ assignedDriver: driver._id }).sort({ createdAt: -1 }).select('_id').lean();
        }
        if (vByDriver) vehicleId = vByDriver._id;
      }
      
      if (!vehicleId) {
        return res.status(409).json({
          success: false,
          code: 'DRIVER_NO_VEHICLE',
          message: 'No assigned vehicle found to calculate capacity.'
        });
      }
      
      if (!requestVehicle) {
        const vDoc = await Vehicle.findById(vehicleId).lean();
        const activeReservedSeats = await getActiveReservedSeats(vehicleId);
        const capacity = vDoc.seatingCapacity || 4;

        if (activeReservedSeats + reqSeats > capacity) {
          return res.status(409).json({
            success: false,
            code: 'VEHICLE_CAPACITY_FULL',
            message: 'Vehicle does not have enough available seats.'
          });
        }
      }
    } else {
      // SCHEDULE BOOKING CONFLICT RULE:
      // Schedule bookings are NOT blocked by active instant bookings.
      // Pending schedule requests remain claimable by every driver matching the configured route.
    }

    let assignedVehicle = requestVehicle;
    if (!assignedVehicle) {
      let assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;
      if (!assignedVehicleId) {
        let vByDriver = await Vehicle.findOne({ assignedDriver: driver._id, vehicleStatus: 'Active' }).select('_id').lean();
        if (!vByDriver) {
           vByDriver = await Vehicle.findOne({ assignedDriver: driver._id }).sort({ createdAt: -1 }).select('_id').lean();
        }
        if (vByDriver) assignedVehicleId = vByDriver._id;
      }
      assignedVehicle = assignedVehicleId ? await Vehicle.findById(assignedVehicleId).lean() : null;
    }

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

    // STALE INSTANT BOOKING CLEANUP
    if (booking.bookingMode === 'INSTANT') {
      const staleThresholdTime = new Date(Date.now() - 6 * 60 * 60 * 1000);
      const staleCleanupQuery = getActiveInstantBookingQuery(driver._id);
      delete staleCleanupQuery.createdAt; // Override the >= 6h check with < 6h check
      staleCleanupQuery.createdAt = { $lt: staleThresholdTime };

      const staleRecords = await Booking.find(staleCleanupQuery).select('bookingId driver createdAt bookingStatus rideStatus paymentStatus completedAt').lean();
      for (const stale of staleRecords) {
        console.log('--- STALE INSTANT BOOKING CLEANUP DIAGNOSTIC ---');
        console.log(`stale bookingId: ${stale.bookingId}`);
        console.log(`driver ID: ${stale.driver}`);
        console.log(`createdAt: ${stale.createdAt}`);
        console.log(`previous bookingStatus: ${stale.bookingStatus}`);
        console.log(`previous rideStatus: ${stale.rideStatus}`);
        console.log(`previous paymentStatus: ${stale.paymentStatus}`);
        console.log(`previous completedAt: ${stale.completedAt}`);
      }

      if (staleRecords.length > 0) {
        await Booking.updateMany(staleCleanupQuery, {
          $set: {
            bookingStatus: 'Cancelled',
            rideStatus: 'Cancelled',
            cancellationReason: 'System auto-cancelled stale uncompleted Instant ride',
            cancelledBy: 'System',
            cancelledAt: new Date()
          }
        });
      }
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
                body: `Driver ${driver.name} accepted. Final fare is â‚¹${updateSet.finalFare}. Tap to view.`,
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

const acceptScheduleBookingRequest = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;

    const booking = req.bookingObj;
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    const driverStatus = String(driver.driverStatus || '').trim().toLowerCase();
    const isEligibleDriver = ['active', 'approved'].includes(driverStatus) && driver.isOnline === true;
    
    const serviceControl = await ServiceControl.findOne().select('oppositeRouteNotifications').lean();
    const allowOpposite = serviceControl?.oppositeRouteNotifications === true;
    
    // Authorization is purely based on route matching and driver status
    const isAuthorized = isEligibleDriver && driverMatchesBookingRoute(driver, booking, { allowOpposite });

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept this booking based on your assigned route.'
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
      return res.status(409).json({
        success: false,
        message: 'Booking no longer available.'
      });
    }

    // Explicit bookingMode branching for active conflict evaluation
    const isInstant = false;

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
      // SCHEDULE requests remain bound to their configured schedule assignment.
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
                body: `Driver ${driver.name} accepted. Final fare is â‚¹${updateSet.finalFare}. Tap to view.`,
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


exports.acceptBookingRequest = async (req, res, next) => {
  const { id } = req.params;
  const booking = await Booking.findOne(getBookingQuery(id));
  if (!booking) return res.status(404).json({ success: false, message: 'Booking request not found' });
  req.bookingObj = booking; // pass down

  if (booking.bookingMode === 'INSTANT') return acceptInstantBookingRequest(req, res, next);
  return acceptScheduleBookingRequest(req, res, next);
};

exports.rejectBookingRequest = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findOne(getBookingQuery(id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    // Request-level authorization (NOT vehicle management)
    let isAuthorized = false;
    const driverIdStr = String(driver._id);
    const userIdStr = driver.user ? String(driver.user._id || driver.user) : null;
    
    // 1. Direct driver assignment
    if (booking.driver && String(booking.driver) === driverIdStr) {
      isAuthorized = true;
    }
    
    // 2. Assigned via vehicle
    if (!isAuthorized && driver.assignedVehicle) {
      const vehicleIdStr = String(driver.assignedVehicle._id || driver.assignedVehicle);
      if (booking.vehicle && String(booking.vehicle) === vehicleIdStr) {
        isAuthorized = true;
      }
    }
    
    // 3. Notified via request pool
    if (!isAuthorized) {
      const recipientIds = [driverIdStr];
      if (userIdStr) recipientIds.push(userIdStr);
      const notification = await Notification.findOne({
        recipientId: { $in: recipientIds },
        entityId: booking._id,
        eventType: 'BOOKING_REQUEST'
      });
      if (notification) isAuthorized = true;
    }
    
    // 4. Route matching fallback
    if (!isAuthorized) {
       const serviceControl = await ServiceControl.findOne().select('oppositeRouteNotifications').lean();
       const { driverMatchesBookingRoute } = require('../utils/routeMatching');
       isAuthorized = driverMatchesBookingRoute(driver, booking, {
         allowOpposite: serviceControl?.oppositeRouteNotifications === true
       });
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to manage bookings for this vehicle'
      });
    }

    if (!booking.rejectedDrivers) {
      booking.rejectedDrivers = [];
    }
    if (!booking.rejectedDrivers.some(id => String(id) === String(driver._id))) {
      booking.rejectedDrivers.push(driver._id);
    }
    booking.rejectedBy = driver._id;
    booking.rejectedAt = new Date();

    await booking.save();

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
const verifyInstantRideOtp = async (req, res, next) => {
  try {
    const driver = req.driver;
    const instantDriverStatus = String(driver?.driverStatus || '').trim().toLowerCase();
    console.log('[OTP_DEBUG] Instant OTP status check', { driverId: driver && driver._id ? driver._id.toString() : null, driverStatus: driver?.driverStatus, instantDriverStatus });
    if (
      !driver ||
      !['active', 'approved'].includes(instantDriverStatus)
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden: Only active/approved drivers can verify customer OTP' });
    }

    const { id } = req.params;
    const targetBookingId = id || req.body.bookingId || req.body.id;
    const { otp, confirmationOtp } = req.body;
    const suppliedOtp = (otp || confirmationOtp || '').toString().trim();

    if (!suppliedOtp) {
      return res.status(400).json({ success: false, message: 'Customer 6-digit OTP is required' });
    }

    if (!targetBookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required for OTP verification' });
    }

    // Retrieve booking with confirmationOtpHash explicitly selected
    const booking = await Booking.findOne(getBookingQuery(targetBookingId)).select('+confirmationOtpHash');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    // 1. Check if OTP was already used / verified or booking already confirmed by another driver
    if (booking.confirmationOtpVerifiedAt || booking.otpVerified) {
      return res.status(400).json({
        success: false,
        message: 'Booking OTP already verified.'
      });
    }

    if (booking.driverConfirmed && (booking.driver && (booking.driver._id || booking.driver).toString() !== driver._id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'Booking already confirmed by another driver.'
      });
    }

    console.log('[OTP_DEBUG] verifyDriverRouteOtpAccess called', { driverId: driver && driver._id ? driver._id.toString() : null, driverStatus: driver?.driverStatus, bookingId: booking._id.toString(), route: driver.route, bookingRoute: booking.route });
    const isAuthorized = await verifyDriverRouteOtpAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Driver route does not match this booking or driver is not an authorized recipient.'
      });
    }

    // 3. Check if OTP has expired
    const now = new Date();
    const otpExpiresAt = booking.confirmationOtpExpiresAt ? new Date(booking.confirmationOtpExpiresAt) : null;
    const remainingMs = otpExpiresAt ? (otpExpiresAt - now) : null;
    console.log(`[OTP DEBUG] bookingId: ${booking.bookingId} | generatedAt: ${booking.createdAt} | expiresAt: ${otpExpiresAt} | now: ${now} | remainingMs: ${remainingMs} | remainingHours: ${remainingMs != null ? (remainingMs / 3600000).toFixed(2) : 'N/A (no expiry set)'}`);

    if (otpExpiresAt && otpExpiresAt < now) {
      return res.status(400).json({
        success: false,
        message: 'Customer OTP has expired. Please request a new OTP.'
      });
    }


    // 4. Verify OTP Hash or raw match
    const suppliedHash = crypto.createHash('sha256').update(suppliedOtp).digest('hex');
    const isMatch = (suppliedHash === booking.confirmationOtpHash) ||
                    (booking.customerViewOtp && suppliedOtp === String(booking.customerViewOtp).trim()) ||
                    (booking.confirmationOtp && suppliedOtp === String(booking.confirmationOtp).trim());

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check the 6-digit code with the customer.'
      });
    }

    // 5. Successful OTP Verification - Update Booking State & Invalidate OTP immediately
    booking.confirmationOtpVerifiedAt = new Date();
    booking.confirmationOtpVerifiedBy = driver._id;
    booking.confirmationOtpHash = null; // Single-use: invalidate OTP immediately!
    booking.customerViewOtp = null; // Single-use: clear raw OTP
    booking.otpVerified = true;

    booking.driver = driver._id;
    booking.assignedDriverId = driver._id;

    if (booking.bookingMode !== 'INSTANT' && driver.assignedVehicle) {
      const vId = driver.assignedVehicle._id || driver.assignedVehicle;
      booking.vehicle = vId;
      booking.assignedVehicleId = vId;
    }

    booking.driverConfirmationStatus = 'Confirmed';
    booking.driverConfirmed = true;
    booking.driverConfirmedAt = new Date();
    booking.driverConfirmedBy = driver._id;

    // Calculate and finalize real fare upon driver OTP verification
    const targetVehicleId = booking.vehicle || driver.assignedVehicle;
    if (targetVehicleId) {
      const targetVehicle = await Vehicle.findById(targetVehicleId);
      if (targetVehicle) {
        const fareUnitCount = booking.serviceType === 'Bus' && booking.busSeatNumbers && booking.busSeatNumbers.length > 0
          ? booking.busSeatNumbers.length
          : booking.serviceType === 'EV-Sewa'
          ? (booking.passengerDetails?.length || 1)
          : 1;
        let routeSegmentFare = null;
        if (Array.isArray(targetVehicle.route?.stops) && targetVehicle.route.stops.length > 0) {
          routeSegmentFare = getRouteSegmentFare(targetVehicle.route, booking.pickupLocation, booking.dropLocation);
        }
        const unitFare = routeSegmentFare == null ? (targetVehicle.fareRate || targetVehicle.fare || 500) : routeSegmentFare;
        const computedBaseFare = unitFare * fareUnitCount;
        let originalFare = computedBaseFare;
        let discountPercentage = 0;
        let discountAmount = 0;
        let finalPayableFare = computedBaseFare;

        if (booking.serviceType === 'Bus') {
          const busOffer = await BusOffer.findOne({ service: 'bus' });
          const currentStatus = busOffer ? (busOffer.offerStatus || busOffer.discountStatus || 'active') : 'inactive';
          if (busOffer && currentStatus === 'active' && Number(busOffer.discountPercentage) > 0) {
            discountPercentage = Number(busOffer.discountPercentage);
            discountAmount = Math.round(((originalFare * discountPercentage) / 100) * 100) / 100;
            finalPayableFare = Math.max(0, originalFare - discountAmount);
          }
        }
        booking.fare = finalPayableFare;
        booking.originalFare = originalFare;
        booking.discountPercentage = discountPercentage;
        booking.discountAmount = discountAmount;
        booking.finalFare = finalPayableFare;
        booking.driverPaymentAmount = Math.round(finalPayableFare * 0.8);

        let pRec = await Payment.findOne({ booking: booking._id });
        if (pRec) {
          pRec.bookingAmount = finalPayableFare;
          pRec.driverPayment = Math.round(finalPayableFare * 0.8);
          await pRec.save();
        }
      }
    }

    const isBus = booking.serviceType === 'Bus';
    const isOfflineCash = booking.paymentMethod === 'Offline Cash' || booking.paymentMethod === 'Cash';
    const isPaid = booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Successful';

    if (isPaid) {
      booking.bookingStatus = 'Confirmed';
    } else if (isOfflineCash) {
      booking.bookingStatus = 'Awaiting Cash Collection';
      booking.rideStatus = 'Accepted';
    } else {
      booking.bookingStatus = 'Pending';
      booking.rideStatus = 'Accepted';
    }

    await booking.save();

    // Send customer notification
    const recipientId = await getValidRecipientId(booking);
    if (recipientId) {
      await Notification.create({
        recipientId,
        recipient: `Customer: ${booking.customer?.name || 'Customer'}`,
        title: 'Booking Confirmed by Driver',
        message: `Your booking #${booking.bookingId} has been confirmed by your assigned driver.`,
        recipientRole: 'customer',
        status: 'Unread'
      }).catch(err => console.error('Notification error:', err));
    }

    res.json({
      success: true,
      message: 'Customer OTP verified successfully. Booking confirmed!',
      data: driverBookingResponse(booking, driver.canViewCustomerPhone === true)
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

    const booking = await Booking.findOne(getBookingQuery(id));
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
        ...driverBookingResponse(booking, driver.canViewCustomerPhone === true),
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

// Duplicate exports.verifyRideOtp removed - canonical implementation defined above

// @desc    Start Active Ride
// @route   POST /api/driver/rides/:id/start
// @access  Private (Driver Only)
exports.startRide = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;
    const { otp } = req.body;

    const booking = await Booking.findOne(getBookingQuery(id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this ride' });
    }

    // Verify OTP if passed or ensure otpVerified/driverConfirmationStatus is confirmed
    if (otp) {
      if (String(booking.rideOtp).trim() !== String(otp).trim() && String(booking.customerViewOtp).trim() !== String(otp).trim()) {
        return res.status(400).json({ success: false, message: 'Invalid customer OTP/PIN' });
      }
      booking.otpVerified = true;
    } else if (!booking.otpVerified && booking.driverConfirmationStatus !== 'Confirmed' && !booking.confirmationOtpVerifiedAt) {
      return res.status(400).json({
        success: false,
        message: 'Customer OTP verification is required before starting the ride'
      });
    }

    booking.otpVerified = true;

    booking.rideStatus = 'Started';
    booking.bookingStatus = 'Ongoing';
    booking.startedAt = new Date();
    await booking.save();

    res.json({
      success: true,
      message: 'Ride started successfully',
      data: {
        ...driverBookingResponse(booking, driver.canViewCustomerPhone === true),
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

    const booking = await Booking.findOne(getBookingQuery(id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this ride' });
    }

    // Idempotency & cancellation checks
    if (booking.bookingStatus === 'Completed' || booking.rideStatus === 'Completed') {
      return res.json({
        success: true,
        message: 'Ride is already completed.',
        data: {
          ...driverBookingResponse(booking, driver.canViewCustomerPhone === true),
          bookingId: booking.bookingId,
          rideStatus: 'Completed',
          bookingStatus: 'Completed'
        }
      });
    }

    if (['Cancelled', 'Rejected'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: `Booking is ${booking.bookingStatus} and cannot be completed.`
      });
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
        ...driverBookingResponse(booking, driver.canViewCustomerPhone === true),
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

    const booking = await Booking.findOne(getBookingQuery(id));
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
      data: driverBookingResponse(booking, driver.canViewCustomerPhone === true)
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

    // Handle duplicate cash collection gracefully
    if (booking.cashCollected || booking.paymentStatus === 'Paid') {
      return res.json({
        success: true,
        message: 'Cash already collected and verified for this booking.',
        data: driverBookingResponse(booking, driver.canViewCustomerPhone === true)
      });
    }

    booking.cashCollected = true;
    booking.cashCollectedAt = new Date();
    booking.cashCollectedBy = driver._id;
    booking.paymentStatus = 'Paid';
    booking.driverConfirmationStatus = 'Confirmed';
    booking.driverConfirmed = true;
    booking.driverConfirmedAt = booking.driverConfirmedAt || new Date();
    booking.driverConfirmedBy = booking.driverConfirmedBy || driver._id;
    booking.bookingStatus = 'Confirmed';

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
      message: `Driver ${driver.name} has confirmed cash payment of â‚¹${booking.fare} for booking #${booking.bookingId}. Your ticket is now fully confirmed.`,
      recipient: `Customer: ${customerName}`,
      recipientRole: 'customer',
      ...(customerId ? { recipientId: customerId } : {}),
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Cash collection confirmed. Payment status updated to Paid.',
      data: {
        booking: driverBookingResponse(booking, driver.canViewCustomerPhone === true),
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
      ...(driver.canViewCustomerPhone === true && b.customer?.phone ? { customerPhone: b.customer.phone } : {}),
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
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }
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

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
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
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }
    const { amount, payoutDetails, accountDetails } = req.body;
    const methodInput = req.body.payoutMethod || req.body.method || '';

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is â‚¹100'
      });
    }

    const availableBalance = driver.walletBalance || 0;
    if (availableBalance < withdrawAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Current balance: â‚¹${availableBalance}`
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

    const updatedDriver = await Driver.findOneAndUpdate(
      { _id: driver._id, walletBalance: { $gte: withdrawAmount } },
      { $inc: { walletBalance: -withdrawAmount, totalWithdrawn: withdrawAmount } },
      { new: true }
    );
    if (!updatedDriver) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Current balance: â‚¹${driver.walletBalance || 0}`
      });
    }

    const isEsewaConfigured = Boolean(process.env.ESEWA_MERCHANT_CODE);
    const isKhaltiConfigured = Boolean(process.env.KHALTI_SECRET_KEY);
    const gatewayStatus = payoutMethod === 'eSewa' && !isEsewaConfigured
      ? 'BLOCKED â€” PAYMENT PROVIDER CONFIGURATION REQUIRED (eSewa merchant credentials missing)'
      : payoutMethod === 'Khalti' && !isKhaltiConfigured
      ? 'BLOCKED â€” PAYMENT PROVIDER CONFIGURATION REQUIRED (Khalti merchant secret key missing)'
      : 'READY';

    let withdrawal;
    try {
      withdrawal = await Withdrawal.create({
        driver: driver._id,
        user: driver.user,
        amount: withdrawAmount,
        payoutMethod,
        payoutDetails: payoutDetails || accountDetails || driver.payoutMethods,
        status: 'Pending',
        adminNotes: gatewayStatus === 'READY' ? 'Withdrawal request logged.' : gatewayStatus
      });
    } catch (error) {
      await Driver.findByIdAndUpdate(driver._id, {
        $inc: { walletBalance: withdrawAmount, totalWithdrawn: -withdrawAmount }
      });
      throw error;
    }

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully.',
      data: {
        ...withdrawal.toObject(),
        status: withdrawal.status.toLowerCase(),
        gatewayStatus
      },
      newWalletBalance: updatedDriver.walletBalance
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
      title: 'ðŸš¨ DRIVER SOS EMERGENCY ALERT',
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
    const driverUserId = driver.user ? (driver.user._id || driver.user) : null;
    const reqUserId = req.user ? (req.user._id || req.user) : null;

    const recipientIds = [driverUserId, driver._id, reqUserId].filter(Boolean);

    const notifications = await Notification.find({
      $or: [
        { recipientRole: 'all' },
        { recipient: 'All Drivers' },
        { recipientRole: 'driver', recipientId: { $in: recipientIds } },
        { recipientRole: 'driver', recipient: `Driver: ${driver.name}` },
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

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

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

// @desc    Register or Update Driver Push Token (FCM / Expo)
// @route   POST /api/driver/push-token
// @access  Private (Driver Only)
exports.registerPushToken = async (req, res, next) => {
  try {
    const { pushToken, fcmToken, token, expoPushToken } = req.body;
    
    // Support separated tokens or legacy fallback
    const finalExpoToken = expoPushToken || pushToken || token;
    const finalFcmToken = fcmToken || pushToken || token;

    if (!finalExpoToken && !finalFcmToken) {
      return res.status(400).json({ success: false, message: 'Push token is required' });
    }

    await Driver.findByIdAndUpdate(
      req.driver._id,
      { $set: { pushToken: finalExpoToken, fcmToken: finalFcmToken } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      data: { expoPushToken: finalExpoToken, fcmToken: finalFcmToken }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Driver Vehicle Fare
// @route   PUT /api/driver/vehicle/fare
// Note: updateVehicleFare is exported near the bottom of this file.
const verifyScheduleRideOtp = async (req, res, next) => {
  try {
    const driver = req.driver;
    const scheduleDriverStatus = String(driver?.driverStatus || '').trim().toLowerCase();
    if (!driver || !['active', 'approved'].includes(scheduleDriverStatus)) {
    console.log('[OTP_DEBUG_403] schedule driver status check failed', { driverId: driver && driver._id ? driver._id.toString() : null, driverStatus: driver?.driverStatus, scheduleDriverStatus });
      return res.status(403).json({ success: false, message: 'Forbidden: Only active/approved drivers can verify customer OTP' });
    }

    const { id } = req.params;
    const targetBookingId = id || req.body.bookingId || req.body.id;
    const { otp, confirmationOtp } = req.body;
    const suppliedOtp = (otp || confirmationOtp || '').toString().trim();

    if (!suppliedOtp) {
      return res.status(400).json({ success: false, message: 'Customer 6-digit OTP is required' });
    }

    if (!targetBookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required for OTP verification' });
    }

    // Retrieve booking with confirmationOtpHash explicitly selected
    const booking = await Booking.findOne(getBookingQuery(targetBookingId)).select('+confirmationOtpHash');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    // 1. Check if OTP was already used / verified or booking already confirmed by another driver
    if (booking.confirmationOtpVerifiedAt || booking.otpVerified) {
      return res.status(400).json({
        success: false,
        message: 'Booking OTP already verified.'
      });
    }

    if (booking.driverConfirmed && (booking.driver && (booking.driver._id || booking.driver).toString() !== driver._id.toString())) {
      return res.status(400).json({
        success: false,
        message: 'Booking already confirmed by another driver.'
      });
    }

    const isAuthorized = await verifyDriverRouteOtpAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Driver route does not match this booking or driver is not an authorized recipient.'
      });
    }

    // 3. Check if OTP has expired
    const now = new Date();
    const otpExpiresAt = booking.confirmationOtpExpiresAt ? new Date(booking.confirmationOtpExpiresAt) : null;
    const remainingMs = otpExpiresAt ? (otpExpiresAt - now) : null;
    console.log(`[OTP DEBUG] bookingId: ${booking.bookingId} | generatedAt: ${booking.createdAt} | expiresAt: ${otpExpiresAt} | now: ${now} | remainingMs: ${remainingMs} | remainingHours: ${remainingMs != null ? (remainingMs / 3600000).toFixed(2) : 'N/A (no expiry set)'}`);

    if (otpExpiresAt && otpExpiresAt < now) {
      return res.status(400).json({
        success: false,
        message: 'Customer OTP has expired. Please request a new OTP.'
      });
    }


    // 4. Verify OTP Hash or raw match
    const suppliedHash = crypto.createHash('sha256').update(suppliedOtp).digest('hex');
    const isMatch = (suppliedHash === booking.confirmationOtpHash) ||
                    (booking.customerViewOtp && suppliedOtp === String(booking.customerViewOtp).trim()) ||
                    (booking.confirmationOtp && suppliedOtp === String(booking.confirmationOtp).trim());

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check the 6-digit code with the customer.'
      });
    }

    // 5. Successful OTP Verification - Update Booking State & Invalidate OTP immediately
    booking.confirmationOtpVerifiedAt = new Date();
    booking.confirmationOtpVerifiedBy = driver._id;
    booking.confirmationOtpHash = null; // Single-use: invalidate OTP immediately!
    booking.customerViewOtp = null; // Single-use: clear raw OTP
    booking.otpVerified = true;

    booking.driver = driver._id;
    booking.assignedDriverId = driver._id;

    if (booking.bookingMode !== 'SCHEDULE' && driver.assignedVehicle) {
      const vId = driver.assignedVehicle._id || driver.assignedVehicle;
      booking.vehicle = vId;
      booking.assignedVehicleId = vId;
    }

    booking.driverConfirmationStatus = 'Confirmed';
    booking.driverConfirmed = true;
    booking.driverConfirmedAt = new Date();
    booking.driverConfirmedBy = driver._id;

    // Calculate and finalize real fare upon driver OTP verification
    const targetVehicleId = booking.vehicle || driver.assignedVehicle;
    if (targetVehicleId) {
      const targetVehicle = await Vehicle.findById(targetVehicleId);
      if (targetVehicle) {
        const fareUnitCount = booking.serviceType === 'Bus' && booking.busSeatNumbers && booking.busSeatNumbers.length > 0
          ? booking.busSeatNumbers.length
          : booking.serviceType === 'EV-Sewa'
          ? (booking.passengerDetails?.length || 1)
          : 1;
        let routeSegmentFare = null;
        if (Array.isArray(targetVehicle.route?.stops) && targetVehicle.route.stops.length > 0) {
          routeSegmentFare = getRouteSegmentFare(targetVehicle.route, booking.pickupLocation, booking.dropLocation);
        }
        const unitFare = routeSegmentFare == null ? (targetVehicle.fareRate || targetVehicle.fare || 500) : routeSegmentFare;
        const computedBaseFare = unitFare * fareUnitCount;
        let originalFare = computedBaseFare;
        let discountPercentage = 0;
        let discountAmount = 0;
        let finalPayableFare = computedBaseFare;

        if (booking.serviceType === 'Bus') {
          const busOffer = await BusOffer.findOne({ service: 'bus' });
          const currentStatus = busOffer ? (busOffer.offerStatus || busOffer.discountStatus || 'active') : 'inactive';
          if (busOffer && currentStatus === 'active' && Number(busOffer.discountPercentage) > 0) {
            discountPercentage = Number(busOffer.discountPercentage);
            discountAmount = Math.round(((originalFare * discountPercentage) / 100) * 100) / 100;
            finalPayableFare = Math.max(0, originalFare - discountAmount);
          }
        }
        booking.fare = finalPayableFare;
        booking.originalFare = originalFare;
        booking.discountPercentage = discountPercentage;
        booking.discountAmount = discountAmount;
        booking.finalFare = finalPayableFare;
        booking.driverPaymentAmount = Math.round(finalPayableFare * 0.8);

        let pRec = await Payment.findOne({ booking: booking._id });
        if (pRec) {
          pRec.bookingAmount = finalPayableFare;
          pRec.driverPayment = Math.round(finalPayableFare * 0.8);
          await pRec.save();
        }
      }
    }

    const isBus = booking.serviceType === 'Bus';
    const isOfflineCash = booking.paymentMethod === 'Offline Cash' || booking.paymentMethod === 'Cash';
    const isPaid = booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Successful';

    if (isPaid) {
      booking.bookingStatus = 'Confirmed';
    } else if (isOfflineCash) {
      booking.bookingStatus = 'Awaiting Cash Collection';
      booking.rideStatus = 'Accepted';
    } else {
      booking.bookingStatus = 'Pending';
      booking.rideStatus = 'Accepted';
    }

    await booking.save();

    // Send customer notification
    const recipientId = await getValidRecipientId(booking);
    if (recipientId) {
      await Notification.create({
        recipientId,
        recipient: `Customer: ${booking.customer?.name || 'Customer'}`,
        title: 'Booking Confirmed by Driver',
        message: `Your booking #${booking.bookingId} has been confirmed by your assigned driver.`,
        recipientRole: 'customer',
        status: 'Unread'
      }).catch(err => console.error('Notification error:', err));
    }

    res.json({
      success: true,
      message: 'Customer OTP verified successfully. Booking confirmed!',
      data: driverBookingResponse(booking, driver.canViewCustomerPhone === true)
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

    const booking = await Booking.findOne(getBookingQuery(id));
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
        ...driverBookingResponse(booking, driver.canViewCustomerPhone === true),
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

// Duplicate exports.verifyRideOtp removed - canonical implementation defined above

// @desc    Start Active Ride
// @route   POST /api/driver/rides/:id/start
// @access  Private (Driver Only)
exports.startRide = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;
    const { otp } = req.body;

    const booking = await Booking.findOne(getBookingQuery(id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this ride' });
    }

    // Verify OTP if passed or ensure otpVerified/driverConfirmationStatus is confirmed
    if (otp) {
      if (String(booking.rideOtp).trim() !== String(otp).trim() && String(booking.customerViewOtp).trim() !== String(otp).trim()) {
        return res.status(400).json({ success: false, message: 'Invalid customer OTP/PIN' });
      }
      booking.otpVerified = true;
    } else if (!booking.otpVerified && booking.driverConfirmationStatus !== 'Confirmed' && !booking.confirmationOtpVerifiedAt) {
      return res.status(400).json({
        success: false,
        message: 'Customer OTP verification is required before starting the ride'
      });
    }

    booking.otpVerified = true;

    booking.rideStatus = 'Started';
    booking.bookingStatus = 'Ongoing';
    booking.startedAt = new Date();
    await booking.save();

    res.json({
      success: true,
      message: 'Ride started successfully',
      data: {
        ...driverBookingResponse(booking, driver.canViewCustomerPhone === true),
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

    const booking = await Booking.findOne(getBookingQuery(id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Unauthorized for this ride' });
    }

    // Idempotency & cancellation checks
    if (booking.bookingStatus === 'Completed' || booking.rideStatus === 'Completed') {
      return res.json({
        success: true,
        message: 'Ride is already completed.',
        data: {
          ...driverBookingResponse(booking, driver.canViewCustomerPhone === true),
          bookingId: booking.bookingId,
          rideStatus: 'Completed',
          bookingStatus: 'Completed'
        }
      });
    }

    if (['Cancelled', 'Rejected'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: `Booking is ${booking.bookingStatus} and cannot be completed.`
      });
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
        ...driverBookingResponse(booking, driver.canViewCustomerPhone === true),
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

    const booking = await Booking.findOne(getBookingQuery(id));
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
      data: driverBookingResponse(booking, driver.canViewCustomerPhone === true)
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

    // Handle duplicate cash collection gracefully
    if (booking.cashCollected || booking.paymentStatus === 'Paid') {
      return res.json({
        success: true,
        message: 'Cash already collected and verified for this booking.',
        data: driverBookingResponse(booking, driver.canViewCustomerPhone === true)
      });
    }

    booking.cashCollected = true;
    booking.cashCollectedAt = new Date();
    booking.cashCollectedBy = driver._id;
    booking.paymentStatus = 'Paid';
    booking.driverConfirmationStatus = 'Confirmed';
    booking.driverConfirmed = true;
    booking.driverConfirmedAt = booking.driverConfirmedAt || new Date();
    booking.driverConfirmedBy = booking.driverConfirmedBy || driver._id;
    booking.bookingStatus = 'Confirmed';

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
      message: `Driver ${driver.name} has confirmed cash payment of â‚¹${booking.fare} for booking #${booking.bookingId}. Your ticket is now fully confirmed.`,
      recipient: `Customer: ${customerName}`,
      recipientRole: 'customer',
      ...(customerId ? { recipientId: customerId } : {}),
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Cash collection confirmed. Payment status updated to Paid.',
      data: {
        booking: driverBookingResponse(booking, driver.canViewCustomerPhone === true),
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
      ...(driver.canViewCustomerPhone === true && b.customer?.phone ? { customerPhone: b.customer.phone } : {}),
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
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }
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

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
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
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }
    const { amount, payoutDetails, accountDetails } = req.body;
    const methodInput = req.body.payoutMethod || req.body.method || '';

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is â‚¹100'
      });
    }

    const availableBalance = driver.walletBalance || 0;
    if (availableBalance < withdrawAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Current balance: â‚¹${availableBalance}`
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

    const updatedDriver = await Driver.findOneAndUpdate(
      { _id: driver._id, walletBalance: { $gte: withdrawAmount } },
      { $inc: { walletBalance: -withdrawAmount, totalWithdrawn: withdrawAmount } },
      { new: true }
    );
    if (!updatedDriver) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Current balance: â‚¹${driver.walletBalance || 0}`
      });
    }

    const isEsewaConfigured = Boolean(process.env.ESEWA_MERCHANT_CODE);
    const isKhaltiConfigured = Boolean(process.env.KHALTI_SECRET_KEY);
    const gatewayStatus = payoutMethod === 'eSewa' && !isEsewaConfigured
      ? 'BLOCKED â€” PAYMENT PROVIDER CONFIGURATION REQUIRED (eSewa merchant credentials missing)'
      : payoutMethod === 'Khalti' && !isKhaltiConfigured
      ? 'BLOCKED â€” PAYMENT PROVIDER CONFIGURATION REQUIRED (Khalti merchant secret key missing)'
      : 'READY';

    let withdrawal;
    try {
      withdrawal = await Withdrawal.create({
        driver: driver._id,
        user: driver.user,
        amount: withdrawAmount,
        payoutMethod,
        payoutDetails: payoutDetails || accountDetails || driver.payoutMethods,
        status: 'Pending',
        adminNotes: gatewayStatus === 'READY' ? 'Withdrawal request logged.' : gatewayStatus
      });
    } catch (error) {
      await Driver.findByIdAndUpdate(driver._id, {
        $inc: { walletBalance: withdrawAmount, totalWithdrawn: -withdrawAmount }
      });
      throw error;
    }

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully.',
      data: {
        ...withdrawal.toObject(),
        status: withdrawal.status.toLowerCase(),
        gatewayStatus
      },
      newWalletBalance: updatedDriver.walletBalance
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
      title: 'ðŸš¨ DRIVER SOS EMERGENCY ALERT',
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
    const driverUserId = driver.user ? (driver.user._id || driver.user) : null;
    const reqUserId = req.user ? (req.user._id || req.user) : null;

    const recipientIds = [driverUserId, driver._id, reqUserId].filter(Boolean);

    const notifications = await Notification.find({
      $or: [
        { recipientRole: 'all' },
        { recipient: 'All Drivers' },
        { recipientRole: 'driver', recipientId: { $in: recipientIds } },
        { recipientRole: 'driver', recipient: `Driver: ${driver.name}` },
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

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

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

// @desc    Register or Update Driver Push Token (FCM / Expo)
// @route   POST /api/driver/push-token
// @access  Private (Driver Only)
exports.registerPushToken = async (req, res, next) => {
  try {
    const { pushToken, fcmToken, token, expoPushToken } = req.body;
    
    // Support separated tokens or legacy fallback
    const finalExpoToken = expoPushToken || pushToken || token;
    const finalFcmToken = fcmToken || pushToken || token;

    if (!finalExpoToken && !finalFcmToken) {
      return res.status(400).json({ success: false, message: 'Push token is required' });
    }

    await Driver.findByIdAndUpdate(
      req.driver._id,
      { $set: { pushToken: finalExpoToken, fcmToken: finalFcmToken } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      data: { expoPushToken: finalExpoToken, fcmToken: finalFcmToken }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Driver Vehicle Fare
// @route   PUT /api/driver/vehicle/fare
// @access  Private (Driver Only)
exports.updateVehicleFare = async (req, res, next) => {
  try {
    const { fareRate, fare, vehicleId, route, travelDate, departureTime, arrivalTime } = req.body;
    const finalFare = fare !== undefined && fare !== null ? fare : fareRate;
    const hasSegmentPricing = Array.isArray(route?.stops) && route.stops.length > 0;
    const routePricing = hasSegmentPricing ? validateRoutePricing(route) : null;
    if (hasSegmentPricing && !routePricing.valid) {
      return res.status(400).json({ success: false, message: routePricing.message });
    }
    if (!hasSegmentPricing && (finalFare === undefined || finalFare === null || Number(finalFare) <= 0 || isNaN(Number(finalFare)))) {
      return res.status(400).json({ success: false, message: 'Please provide a valid positive fare amount' });
    }
    if (vehicleId && !mongoose.isValidObjectId(vehicleId)) {
      return res.status(400).json({ success: false, message: 'Invalid vehicleId' });
    }

    const ownershipQuery = getDriverVehicleOwnershipQuery(req.driver);
    let vehicle;
    if (vehicleId) {
      vehicle = await Vehicle.findOne({ _id: vehicleId, ...ownershipQuery });
    } else {
      vehicle = await Vehicle.findOne({ assignedDriver: req.driver._id });
      const assignedVehicleId = req.driver.assignedVehicle?._id || req.driver.assignedVehicle;
      if (!vehicle && assignedVehicleId) {
        vehicle = await Vehicle.findOne({ _id: assignedVehicleId, ...ownershipQuery });
      }
      if (!vehicle) {
        vehicle = await Vehicle.findOne({ 'submission.submittedByDriver': req.driver._id });
      }
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Assigned vehicle not found or you are not authorized to edit this vehicle' });
    }

    let isRouteReversed = false;
    if (route && vehicle.route?.origin && vehicle.route?.destination) {
      if (
        String(route.origin).trim().toLowerCase() === String(vehicle.route.destination).trim().toLowerCase() &&
        String(route.destination).trim().toLowerCase() === String(vehicle.route.origin).trim().toLowerCase()
      ) {
        isRouteReversed = true;
      }
    }

    if (hasSegmentPricing) {
      vehicle.route = { ...(vehicle.route?.toObject?.() || vehicle.route || {}), ...route };
      vehicle.fareRate = routePricing.totalFare;
    } else {
      if (Array.isArray(vehicle.route?.stops) && vehicle.route.stops.length > 0) {
        return res.status(400).json({ success: false, message: 'Update each route segment fare for a vehicle with route stops.' });
      }
      vehicle.fareRate = Number(finalFare);
      if (route) {
        vehicle.route = { ...(vehicle.route?.toObject?.() || vehicle.route || {}), ...route };
      }
    }
    
    await vehicle.save();

    if (vehicle.route?.origin && vehicle.route?.destination) {
      const driverRouteUpdate = {
        'route.origin': vehicle.route.origin,
        'route.destination': vehicle.route.destination
      };
      if (req.driver?._id) {
        await Driver.updateOne({ _id: req.driver._id }, { $set: driverRouteUpdate });
      }
      if (vehicle.assignedDriver) {
        await Driver.updateOne({ _id: vehicle.assignedDriver }, { $set: driverRouteUpdate });
      }
    }

    if (isRouteReversed) {
      const updatePayload = {
        origin: route.origin,
        destination: route.destination
      };
      if (travelDate) updatePayload.travelDate = new Date(travelDate);
      if (departureTime) updatePayload.departureTime = departureTime;
      if (arrivalTime) updatePayload.arrivalTime = arrivalTime;
      
      await Schedule.updateMany(
        { vehicle: vehicle._id, status: { $in: ['Pending', 'Active'] } },
        { $set: updatePayload }
      );
    }

    res.json({
      success: true,
      message: 'Vehicle fare updated successfully',
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyRideOtp = async (req, res, next) => {
  console.log('[OTP_DEBUG] verifyRideOtp entry', { driverId: req.driver && req.driver._id ? req.driver._id.toString() : null, driverStatus: req.driver?.driverStatus, isOnline: req.driver?.isOnline, bookingIdParam: req.params.id, bookingIdBody: req.body.bookingId || req.body.id, endpoint: req.originalUrl, method: req.method });
  console.log('[OTP_DEBUG] verifyRideOtp called', {
    driverId: req.driver && req.driver._id ? req.driver._id.toString() : null,
    driverStatus: req.driver?.driverStatus,
    isOnline: req.driver?.isOnline,
    bookingIdParam: req.params.id,
    bookingIdBody: req.body.bookingId || req.body.id,
    endpoint: req.originalUrl,
    method: req.method
  });
  const { id } = req.params;
  const targetBookingId = id || req.body.bookingId || req.body.id;
  const booking = await Booking.findOne(getBookingQuery(targetBookingId));
  if (!booking) return res.status(404).json({ success: false, message: 'Booking request not found' });
  req.bookingObj = booking;

  if (booking.bookingMode === 'INSTANT') return verifyInstantRideOtp(req, res, next);
  return verifyScheduleRideOtp(req, res, next);
};

// @desc    Update Driver Vehicle Operating Route (Triggers Admin Approval on Change)
// @route   PUT /api/driver/vehicle/operating-route
// @access  Private (Driver Only)
exports.updateOperatingRoute = async (req, res, next) => {
  try {
    const { vehicleId, origin, destination, stops } = req.body;
    if (!origin || !origin.toString().trim() || !destination || !destination.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Please provide both Origin and Destination' });
    }

    const cleanOrigin = origin.toString().trim();
    const cleanDestination = destination.toString().trim();

    // Standardize stops array (preserving order, removing empty entries)
    const cleanStops = Array.isArray(stops)
      ? stops
          .map(s => (typeof s === 'string' ? { name: s.trim() } : { name: (s?.name || '').toString().trim() }))
          .filter(s => s.name.length > 0)
      : [];

    const ownershipQuery = getDriverVehicleOwnershipQuery(req.driver);
    let vehicle;
    if (vehicleId && mongoose.isValidObjectId(vehicleId)) {
      vehicle = await Vehicle.findOne({ _id: vehicleId, ...ownershipQuery });
    } else {
      vehicle = await Vehicle.findOne({ assignedDriver: req.driver._id });
      if (!vehicle) {
        vehicle = await Vehicle.findOne({ 'submission.submittedByDriver': req.driver._id });
      }
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Assigned vehicle not found or unauthorized' });
    }

    // Compare requested route against current active/approved route
    const currentOrigin = (vehicle.route?.origin || '').trim().toLowerCase();
    const currentDest = (vehicle.route?.destination || '').trim().toLowerCase();
    const currentStops = Array.isArray(vehicle.route?.stops)
      ? vehicle.route.stops.map(s => (s.name || '').trim().toLowerCase())
      : [];
    const requestedStops = cleanStops.map(s => s.name.toLowerCase());

    const isOriginSame = cleanOrigin.toLowerCase() === currentOrigin;
    const isDestSame = cleanDestination.toLowerCase() === currentDest;
    const areStopsSame =
      currentStops.length === requestedStops.length &&
      currentStops.every((val, index) => val === requestedStops[index]);

    const isSameRoute = isOriginSame && isDestSame && areStopsSame;

    if (isSameRoute && vehicle.routeApprovalStatus !== 'Pending Approval') {
      return res.json({
        success: true,
        message: 'No route changes detected.',
        data: vehicle
      });
    }

    // Route modified -> Create a fresh Pending Approval Request every single time
    vehicle.pendingRoute = {
      origin: cleanOrigin,
      destination: cleanDestination,
      stops: cleanStops,
      requestedAt: new Date(),
      status: 'Pending Approval',
      rejectionReason: ''
    };
    vehicle.routeApprovalStatus = 'Pending Approval';

    await vehicle.save();

    res.json({
      success: true,
      message: 'Route change submitted for admin approval.',
      data: vehicle
    });
  } catch (error) {
    next(error);
  }
};
