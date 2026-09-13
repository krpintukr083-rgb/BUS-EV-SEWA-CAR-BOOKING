const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');

// @desc    Get Driver Dashboard Summary
// @route   GET /api/driver/dashboard
// @access  Private (Driver Only)
exports.getDriverDashboard = async (req, res, next) => {
  try {
    const driver = req.driver;

    // Fetch Assigned Vehicle
    let assignedVehicle = null;
    if (driver.assignedVehicle) {
      assignedVehicle = await Vehicle.findById(driver.assignedVehicle._id || driver.assignedVehicle);
    }

    // Fetch Driver Booking Requests (Pending)
    const bookingRequests = await Booking.find({
      $or: [{ driver: driver._id }, { vehicle: assignedVehicle ? assignedVehicle._id : null }],
      bookingStatus: 'Pending'
    })
      .populate('vehicle')
      .sort({ createdAt: -1 })
      .limit(5);

    // Fetch Recent Booking History (Completed / Confirmed / Cancelled)
    const recentHistory = await Booking.find({
      driver: driver._id,
      bookingStatus: { $in: ['Confirmed', 'Ongoing', 'Completed', 'Cancelled'] }
    })
      .populate('vehicle')
      .sort({ createdAt: -1 })
      .limit(5);

    // Fetch Earnings / Payments
    const payments = await Payment.find({ driver: driver._id }).sort({ createdAt: -1 });
    const totalEarnings = payments.reduce((acc, curr) => acc + (curr.driverPayment || 0), 0);
    const completedTripsCount = await Booking.countDocuments({
      driver: driver._id,
      bookingStatus: 'Completed'
    });

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

    res.json({
      success: true,
      data: {
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
        recentPayments: payments.slice(0, 5)
      }
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

// @desc    Get Driver Booking Requests
// @route   GET /api/driver/booking-requests
// @access  Private (Driver Only)
exports.getBookingRequests = async (req, res, next) => {
  try {
    const driver = req.driver;
    const vehicleId = driver.assignedVehicle ? driver.assignedVehicle._id || driver.assignedVehicle : null;

    const requests = await Booking.find({
      $or: [{ driver: driver._id }, { vehicle: vehicleId }],
      bookingStatus: 'Pending'
    })
      .populate('vehicle')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept Booking Request
// @route   POST /api/driver/booking-requests/:id/accept
// @access  Private (Driver Only)
exports.acceptBookingRequest = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    if (req.driver.driverStatus !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept bookings while status is ${req.driver.driverStatus}. Please set status to Active.`
      });
    }

    booking.bookingStatus = 'Confirmed';
    booking.driver = req.driver._id;
    await booking.save();

    res.json({
      success: true,
      message: 'Booking request accepted successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject Booking Request
// @route   POST /api/driver/booking-requests/:id/reject
// @access  Private (Driver Only)
exports.rejectBookingRequest = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    booking.bookingStatus = 'Rejected';
    await booking.save();

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
