const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { dashboardCache } = require('../utils/cache');

// @desc    Get Driver Dashboard Summary
// @route   GET /api/driver/dashboard
// @access  Private (Driver Only)
exports.getDriverDashboard = async (req, res, next) => {
  try {
    const driver = req.driver;
    const cacheKey = `driver_dashboard_${driver._id}`;
    const cachedData = dashboardCache.get(cacheKey);
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData
      });
    }

    const assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;

    // Concurrent fetching
    const [
      assignedVehicle,
      bookingRequests,
      recentHistory,
      paymentAggregate,
      recentPayments,
      completedTripsCount
    ] = await Promise.all([
      assignedVehicleId ? Vehicle.findById(assignedVehicleId).lean() : Promise.resolve(null),
      Booking.find({
        $or: [
          { driver: driver._id },
          ...(assignedVehicleId ? [{ vehicle: assignedVehicleId }] : [])
        ],
        bookingStatus: { $in: ['Pending Driver Confirmation', 'Pending'] }
      })
        .select('bookingId customer serviceType pickupLocation dropLocation fare driverPaymentAmount paymentStatus bookingStatus travelDate passengerDetails busSeatNumbers vehicle driver createdAt')
        .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory vehicleStatus seatingCapacity')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Booking.find({
        driver: driver._id,
        bookingStatus: { $in: ['Confirmed', 'Ongoing', 'Completed', 'Cancelled'] }
      })
        .select('bookingId customer serviceType pickupLocation dropLocation fare driverPaymentAmount paymentStatus bookingStatus travelDate passengerDetails busSeatNumbers vehicle driver createdAt')
        .populate('vehicle', 'vehicleNumber vehicleName vehicleType vehicleCategory vehicleStatus seatingCapacity')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Payment.aggregate([
        { $match: { driver: driver._id } },
        { $group: { _id: null, totalEarnings: { $sum: '$driverPayment' } } }
      ]),
      Payment.find({ driver: driver._id })
        .select('booking bookingId customer driver bookingAmount driverPayment paymentStatus transactionReference createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Booking.countDocuments({
        driver: driver._id,
        bookingStatus: 'Completed'
      })
    ]);

    const totalEarnings = paymentAggregate.length > 0 ? (paymentAggregate[0].totalEarnings || 0) : 0;

    // Document Verification Summary
    const documentSummary = {
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

    const responsePayload = {
      driver: {
        id: driver._id,
        name: driver.name,
        mobileNumber: driver.mobileNumber,
        profilePhoto: driver.profilePhoto,
        driverStatus: driver.driverStatus
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
            seatingCapacity: assignedVehicle.seatingCapacity
          }
        : null,
      stats: {
        pendingRequestsCount: bookingRequests.length,
        completedTripsCount,
        totalEarnings,
        driverStatus: driver.driverStatus,
        documentStatus: documentSummary.overallStatus
      },
      documentSummary,
      recentBookingRequests: bookingRequests,
      recentHistory,
      recentPayments
    };

    // Cache driver-specific dashboard data for 15s
    dashboardCache.set(cacheKey, responsePayload, 15000);

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
    const driver = await Driver.findById(req.driver._id).populate('assignedVehicle');
    res.json({
      success: true,
      data: {
        driverId: driver._id,
        name: driver.name,
        mobileNumber: driver.mobileNumber,
        profilePhoto: driver.profilePhoto,
        driverStatus: driver.driverStatus,
        assignedVehicle: driver.assignedVehicle,
        drivingLicenceNumber: driver.drivingLicenceNumber,
        drivingLicenceStatus: driver.drivingLicenceStatus,
        rcStatus: driver.rcStatus,
        insuranceStatus: driver.insuranceStatus,
        fitnessStatus: driver.fitnessStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Driver Profile
// @route   PUT /api/driver/profile
// @access  Private (Driver Only)
exports.updateDriverProfile = async (req, res, next) => {
  try {
    const { name, mobileNumber, profilePhoto } = req.body;
    const driver = await Driver.findById(req.driver._id);

    if (name) driver.name = name;
    if (mobileNumber) driver.mobileNumber = mobileNumber;
    if (profilePhoto) driver.profilePhoto = profilePhoto;

    await driver.save();

    // Also sync User model
    const user = await User.findById(driver.user);
    if (user) {
      if (name) user.name = name;
      if (mobileNumber) user.phone = mobileNumber;
      if (profilePhoto) user.profilePhoto = profilePhoto;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: driver
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Assigned Vehicle Details
// @route   GET /api/driver/vehicle
// @access  Private (Driver Only)
exports.getAssignedVehicle = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id).populate('assignedVehicle');

    if (!driver.assignedVehicle) {
      return res.json({
        success: true,
        data: null,
        message: 'No vehicle currently assigned to this driver'
      });
    }

    const vehicle = await Vehicle.findById(driver.assignedVehicle._id);

    res.json({
      success: true,
      data: {
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        vehicleCategory: vehicle.vehicleCategory,
        vehicleModel: vehicle.vehicleModel,
        vehicleName: vehicle.vehicleName,
        seatingCapacity: vehicle.seatingCapacity,
        ownerName: vehicle.ownerName,
        ownerMobileNumber: vehicle.ownerMobileNumber,
        vehicleStatus: vehicle.vehicleStatus,
        vehicleImages: vehicle.vehicleImages,
        rcNumber: vehicle.rcNumber,
        rcDocument: vehicle.rcDocument,
        insurancePolicyNumber: vehicle.insurancePolicyNumber,
        insuranceDocument: vehicle.insuranceDocument,
        insuranceExpiryDetails: vehicle.insuranceExpiryDetails,
        fitnessDetails: vehicle.fitnessDetails,
        fitnessDocument: vehicle.fitnessDocument,
        fareRate: vehicle.fareRate,
        route: vehicle.route,
        busDetails: vehicle.busDetails,
        evDetails: vehicle.evDetails,
        carDetails: vehicle.carDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Driver Booking Requests & Assigned Trips (including Offline Cash collection trips)
// @route   GET /api/driver/booking-requests
// @access  Private (Driver Only)
exports.getBookingRequests = async (req, res, next) => {
  try {
    const driver = req.driver;
    const vehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;

    const requests = await Booking.find({
      $or: [
        { driver: driver._id },
        ...(vehicleId ? [{ vehicle: vehicleId }] : [])
      ],
      bookingStatus: { $in: ['Pending Driver Confirmation', 'Pending', 'Confirmed', 'Ongoing'] }
    })
      .populate('vehicle')
      .populate('driver')
      .populate('cashCollectedBy')
      .sort({ createdAt: -1 });

    const sanitized = requests.map(b => {
      const doc = b.toObject ? b.toObject() : { ...b };
      if (doc.hiredVehicleDetails) {
        delete doc.hiredVehicleDetails.hireAmount;
        delete doc.hiredVehicleDetails.additionalExpense;
        delete doc.hiredVehicleDetails.hirePaymentStatus;
      }
      return doc;
    });

    res.json({
      success: true,
      count: sanitized.length,
      data: sanitized
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept / Confirm Booking Request (Assigned Driver / Conductor)
// @route   POST /api/driver/booking-requests/:id/accept
// @access  Private (Driver Only)
exports.acceptBookingRequest = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('vehicle');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    // 1. Cross-Driver Authorization Security Barrier
    const driverId = req.driver._id.toString();
    const driverAssignedVehicleId = req.driver.assignedVehicle
      ? (req.driver.assignedVehicle._id || req.driver.assignedVehicle).toString()
      : null;

    const bookingVehicleId = booking.vehicle
      ? (booking.vehicle._id || booking.vehicle).toString()
      : null;

    const bookingDriverId = booking.driver
      ? (booking.driver._id || booking.driver).toString()
      : null;

    const vehicleAssignedDriverId = (booking.vehicle && booking.vehicle.assignedDriver)
      ? (booking.vehicle.assignedDriver._id || booking.vehicle.assignedDriver).toString()
      : null;

    const isAssignedDriver = bookingDriverId === driverId || vehicleAssignedDriverId === driverId;
    const isAssignedVehicle = driverAssignedVehicleId && bookingVehicleId && driverAssignedVehicleId === bookingVehicleId;

    if (!isAssignedDriver && !isAssignedVehicle) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not authorized to confirm bookings for another driver or vehicle.'
      });
    }

    if (req.driver.driverStatus !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept bookings while status is ${req.driver.driverStatus}. Please set status to Active.`
      });
    }

    const now = new Date();
    booking.bookingStatus = 'Confirmed';
    booking.driverConfirmationStatus = 'Confirmed';
    booking.driverConfirmed = true;
    booking.driverConfirmedAt = now;
    booking.driverConfirmedBy = req.driver._id;
    booking.driver = req.driver._id;
    await booking.save();

    // Create Notification for Customer
    let customerUserId = null;
    if (booking.customer && (booking.customer.phone || booking.customer.email)) {
      const orConditions = [];
      if (booking.customer.phone) orConditions.push({ phone: booking.customer.phone });
      if (booking.customer.email) orConditions.push({ email: booking.customer.email });
      if (orConditions.length > 0) {
        const custUser = await User.findOne({ $or: orConditions });
        if (custUser) customerUserId = custUser._id;
      }
    }

    await Notification.create({
      title: 'Booking Confirmed!',
      message: `Your bus booking #${booking.bookingId} has been confirmed. Your digital ticket is active.`,
      recipient: `Customer: ${booking.customer?.name || 'Passenger'}`,
      recipientRole: 'customer',
      recipientId: customerUserId,
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Booking request confirmed successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject Booking Request (Assigned Driver / Conductor)
// @route   POST /api/driver/booking-requests/:id/reject
// @access  Private (Driver Only)
exports.rejectBookingRequest = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('vehicle');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    // 1. Cross-Driver Authorization Security Barrier
    const driverId = req.driver._id.toString();
    const driverAssignedVehicleId = req.driver.assignedVehicle
      ? (req.driver.assignedVehicle._id || req.driver.assignedVehicle).toString()
      : null;

    const bookingVehicleId = booking.vehicle
      ? (booking.vehicle._id || booking.vehicle).toString()
      : null;

    const bookingDriverId = booking.driver
      ? (booking.driver._id || booking.driver).toString()
      : null;

    const vehicleAssignedDriverId = (booking.vehicle && booking.vehicle.assignedDriver)
      ? (booking.vehicle.assignedDriver._id || booking.vehicle.assignedDriver).toString()
      : null;

    const isAssignedDriver = bookingDriverId === driverId || vehicleAssignedDriverId === driverId;
    const isAssignedVehicle = driverAssignedVehicleId && bookingVehicleId && driverAssignedVehicleId === bookingVehicleId;

    if (!isAssignedDriver && !isAssignedVehicle) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not authorized to reject bookings for another driver or vehicle.'
      });
    }

    const now = new Date();
    booking.bookingStatus = 'Rejected';
    booking.driverConfirmationStatus = 'Rejected';
    booking.driverConfirmed = false;
    booking.rejectedBy = req.driver._id;
    booking.rejectedAt = now;
    await booking.save();

    // Create Notification for Customer
    let customerUserId = null;
    if (booking.customer && (booking.customer.phone || booking.customer.email)) {
      const orConditions = [];
      if (booking.customer.phone) orConditions.push({ phone: booking.customer.phone });
      if (booking.customer.email) orConditions.push({ email: booking.customer.email });
      if (orConditions.length > 0) {
        const custUser = await User.findOne({ $or: orConditions });
        if (custUser) customerUserId = custUser._id;
      }
    }

    await Notification.create({
      title: 'Booking Rejected',
      message: `Your bus booking #${booking.bookingId} has been rejected by driver.`,
      recipient: `Customer: ${booking.customer?.name || 'Passenger'}`,
      recipientRole: 'customer',
      recipientId: customerUserId,
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

// @desc    Get Driver Booking History
// @route   GET /api/driver/booking-history
// @access  Private (Driver Only)
exports.getBookingHistory = async (req, res, next) => {
  try {
    const history = await Booking.find({
      driver: req.driver._id,
      bookingStatus: { $in: ['Confirmed', 'Ongoing', 'Completed', 'Cancelled', 'Rejected'] }
    })
      .populate('vehicle')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Driver Earnings / Payment Records
// @route   GET /api/driver/earnings
// @access  Private (Driver Only)
exports.getEarnings = async (req, res, next) => {
  try {
    const payments = await Payment.find({ driver: req.driver._id }).populate('booking').sort({ createdAt: -1 });

    const totalEarnings = payments.reduce((sum, item) => sum + (item.driverPayment || 0), 0);

    res.json({
      success: true,
      totalEarnings,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Driver Documents Verification Status
// @route   GET /api/driver/documents
// @access  Private (Driver Only)
exports.getDriverDocuments = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.driver._id).populate('assignedVehicle');

    res.json({
      success: true,
      data: {
        drivingLicence: {
          title: 'Driving Licence',
          number: driver.drivingLicenceNumber,
          documentUrl: driver.drivingLicenceDoc,
          status: driver.drivingLicenceStatus
        },
        rcDetails: {
          title: 'RC Details (Registration Certificate)',
          number: driver.rcNumber || (driver.assignedVehicle ? driver.assignedVehicle.rcNumber : 'N/A'),
          details: driver.rcDetails,
          documentUrl: driver.rcDoc || (driver.assignedVehicle ? driver.assignedVehicle.rcDocument : ''),
          status: driver.rcStatus
        },
        vehicleInsurance: {
          title: 'Vehicle Insurance',
          policyNumber:
            driver.insurancePolicyNumber || (driver.assignedVehicle ? driver.assignedVehicle.insurancePolicyNumber : 'N/A'),
          expiryDetails: driver.insuranceExpiryDetails || '2026-12-31',
          documentUrl: driver.insuranceDoc || (driver.assignedVehicle ? driver.assignedVehicle.insuranceDocument : ''),
          status: driver.insuranceStatus
        },
        fitnessCertificate: {
          title: 'Fitness / Vehicle Check Certificate',
          details: driver.fitnessDetails || 'State Transport Safety Certified',
          documentUrl: driver.fitnessDoc || (driver.assignedVehicle ? driver.assignedVehicle.fitnessDocument : ''),
          status: driver.fitnessStatus
        },
        requiredDriverDocuments: {
          title: 'Required Driver Documents & Police Verification',
          status: driver.requiredDocumentsStatus
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Driver Status (Active / Inactive / Blocked)
// @route   PUT /api/driver/status
// @access  Private (Driver Only)
exports.updateDriverStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Drivers can set status to Active or Inactive.'
      });
    }

    const driver = await Driver.findById(req.driver._id);

    // If driver was blocked by Super Admin, driver cannot unblock themselves
    if (driver.driverStatus === 'Blocked') {
      return res.status(403).json({
        success: false,
        message: 'Your account is Blocked by Super Admin. Please contact platform support.'
      });
    }

    driver.driverStatus = status;
    await driver.save();

    res.json({
      success: true,
      message: `Driver status successfully updated to ${status}. ${
        status === 'Inactive' ? 'You will not receive new booking requests while Inactive.' : 'You are now ready for new trips!'
      }`,
      status: driver.driverStatus
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Driver Support Details
// @route   GET /api/driver/support
// @access  Private (Driver Only)
exports.getDriverSupport = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        supportHelpline: '+91 1800-890-7890 (Toll Free)',
        supportEmail: 'driver-support@transportplatform.com',
        driverAssistanceDesk: 'Available 24x7 for all active and verified drivers',
        emergencyAssistance: '+91 98110 99999',
        helpTopics: [
          {
            title: 'Trip Assistance & Fare Disputes',
            description: 'Assistance regarding passenger pickup, route diversions, or toll charges.'
          },
          {
            title: 'Vehicle Document Verification',
            description: 'Submission or re-verification of RC, DL, Insurance, or Fitness Certificate.'
          },
          {
            title: 'Payouts & Transaction Records',
            description: 'Direct queries regarding trip earnings settlements and transaction references.'
          },
          {
            title: 'Vehicle Maintenance & Breakdown Support',
            description: 'Immediate roadside support contact protocols during active duty.'
          }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Collect Cash from Passenger for Offline Cash Booking (Driver / Conductor)
// @route   POST /api/driver/bookings/:id/collect-cash
// @access  Private (Driver Only)
exports.collectCash = async (req, res, next) => {
  try {
    const driver = req.driver;
    const bookingIdParam = req.params.id || req.body?.bookingId;

    if (!bookingIdParam) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required to collect cash'
      });
    }

    const query = mongoose.isValidObjectId(bookingIdParam)
      ? { $or: [{ _id: bookingIdParam }, { bookingId: bookingIdParam }] }
      : { bookingId: bookingIdParam };

    const booking = await Booking.findOne(query).populate('vehicle');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // 1. Cross-Driver Authorization Security Barrier
    // Verify booking belongs to this driver OR driver's assigned vehicle
    const driverId = driver._id.toString();
    const driverAssignedVehicleId = driver.assignedVehicle
      ? (driver.assignedVehicle._id || driver.assignedVehicle).toString()
      : null;

    const bookingVehicleId = booking.vehicle
      ? (booking.vehicle._id || booking.vehicle).toString()
      : null;

    const bookingDriverId = booking.driver
      ? (booking.driver._id || booking.driver).toString()
      : null;

    const vehicleAssignedDriverId = (booking.vehicle && booking.vehicle.assignedDriver)
      ? (booking.vehicle.assignedDriver._id || booking.vehicle.assignedDriver).toString()
      : null;

    const isAssignedDriver = bookingDriverId === driverId || vehicleAssignedDriverId === driverId;
    const isAssignedVehicle = driverAssignedVehicleId && bookingVehicleId && driverAssignedVehicleId === bookingVehicleId;

    if (!isAssignedDriver && !isAssignedVehicle) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: You are not authorized to collect cash for this booking as it is not assigned to your vehicle or driver account.'
      });
    }

    // 2. Validate Payment Method is Offline Cash
    if (booking.paymentMethod !== 'Offline Cash' && booking.paymentMethod !== 'Cash') {
      return res.status(400).json({
        success: false,
        message: `Cannot collect cash for online payment booking (Method: ${booking.paymentMethod || 'Online'}).`
      });
    }

    // 3. Duplicate Protection Check
    if (booking.cashCollected === true || booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Successful') {
      return res.status(400).json({
        success: false,
        message: 'Cash Already Collected. This booking payment has already been collected and verified.'
      });
    }

    // 4. Update Booking record
    const now = new Date();
    booking.paymentStatus = 'Paid';
    booking.cashCollected = true;
    booking.cashCollectedAt = now;
    booking.cashCollectedBy = driver._id;
    if (!booking.driver) {
      booking.driver = driver._id;
    }
    if (booking.bookingStatus === 'Pending' || booking.bookingStatus === 'Pending Driver Confirmation') {
      booking.bookingStatus = 'Confirmed';
      booking.driverConfirmationStatus = 'Confirmed';
      booking.driverConfirmed = true;
      if (!booking.driverConfirmedAt) booking.driverConfirmedAt = now;
      if (!booking.driverConfirmedBy) booking.driverConfirmedBy = driver._id;
    }
    await booking.save();

    // 5. Update or Create Payment record
    let payment = await Payment.findOne({ booking: booking._id });
    if (payment) {
      payment.paymentStatus = 'Paid';
      payment.cashCollected = true;
      payment.cashCollectedAt = now;
      payment.cashCollectedBy = driver._id;
      payment.driver = driver._id;
      await payment.save();
    } else {
      payment = await Payment.create({
        booking: booking._id,
        bookingId: booking.bookingId,
        customer: {
          name: booking.customer.name,
          phone: booking.customer.phone
        },
        driver: driver._id,
        bookingAmount: booking.fare,
        driverPayment: booking.driverPaymentAmount || Math.round(booking.fare * 0.8),
        paymentMethod: 'Offline Cash',
        paymentStatus: 'Paid',
        transactionReference: `CASH-${booking.bookingId}`,
        paymentGateway: 'Offline Cash',
        cashCollected: true,
        cashCollectedAt: now,
        cashCollectedBy: driver._id
      });
    }

    res.json({
      success: true,
      message: `Cash of ₹${booking.fare} successfully collected and confirmed for booking ${booking.bookingId}!`,
      data: {
        booking,
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};
