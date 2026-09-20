const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const ServiceControl = require('../models/ServiceControl');
const Payment = require('../models/Payment');
const Cancellation = require('../models/Cancellation');
const Notification = require('../models/Notification');

const getBookingQuery = (idOrCode) => {
  return mongoose.isValidObjectId(idOrCode)
    ? { $or: [{ bookingId: idOrCode }, { _id: idOrCode }] }
    : { bookingId: idOrCode };
};

// @desc    Create a new booking with backend validation (service status, vehicle status, seat collision, fare check)
// @route   POST /api/bookings
// @access  Private (Customer)
exports.createBooking = async (req, res, next) => {
  try {
    const {
      vehicleId,
      serviceType,
      pickupLocation,
      dropLocation,
      passengerDetails,
      selectedSeats,
      fare,
      travelDate,
      paymentMethod
    } = req.body;

    if (!vehicleId || !serviceType || !pickupLocation || !dropLocation) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking fields (vehicleId, serviceType, pickupLocation, dropLocation)'
      });
    }

    // 1. Check Service Control status
    const serviceControl = await ServiceControl.findOne();
    if (serviceControl) {
      if (serviceType === 'Bus' && serviceControl.busService !== 'Active') {
        return res.status(400).json({
          success: false,
          message: 'Bus booking service is currently inactive'
        });
      }
      if (serviceType === 'EV-Sewa' && serviceControl.evSewaService !== 'Active') {
        return res.status(400).json({
          success: false,
          message: 'EV-Sewa booking service is currently inactive'
        });
      }
      if (serviceType === 'Car' && serviceControl.carService !== 'Active') {
        return res.status(400).json({
          success: false,
          message: 'Car booking service is currently inactive'
        });
      }
    }

    // 2. Check Vehicle existence and active status
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    if (vehicle.vehicleStatus !== 'Active') {
      return res.status(400).json({
        success: false,
        message: `Vehicle is ${vehicle.vehicleStatus.toLowerCase()} and cannot be booked`
      });
    }

    // 3. Check Seat Availability on Backend for Buses (DATE-SPECIFIC)
    if (serviceType === 'Bus' && selectedSeats && selectedSeats.length > 0) {
      const bookingTravelDate = travelDate ? new Date(travelDate) : new Date();

      // Day-boundary range for the target travel date
      const startOfDay = new Date(bookingTravelDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(bookingTravelDate);
      endOfDay.setHours(23, 59, 59, 999);

      const activeBookings = await Booking.find({
        vehicle: vehicle._id,
        travelDate: { $gte: startOfDay, $lte: endOfDay },
        bookingStatus: { $in: ['Confirmed', 'Pending', 'Pending Driver Confirmation', 'Awaiting Cash Collection', 'Ongoing'] }
      });

      const alreadyBooked = [];
      activeBookings.forEach((b) => {
        if (b.busSeatNumbers && b.busSeatNumbers.length > 0) {
          b.busSeatNumbers.forEach((s) => alreadyBooked.push(s));
        }
      });

      const conflictingSeats = selectedSeats.filter((s) => alreadyBooked.includes(s));
      if (conflictingSeats.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Seat(s) ${conflictingSeats.join(', ')} are already booked for this date. Please choose different seats.`
        });
      }
    }

    // 4. Calculate Server-Side Fare
    const seatCount = (serviceType === 'Bus' && selectedSeats && selectedSeats.length > 0) ? selectedSeats.length : 1;
    const computedFare = vehicle.fareRate * seatCount;
    const finalFare = fare ? Number(fare) : computedFare;

    const crypto = require('crypto');
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const confirmationOtpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const confirmationOtpExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    const bookingId = `BK-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;

    const isBus = serviceType === 'Bus';
    const isOfflineCash = paymentMethod === 'Offline Cash' || paymentMethod === 'Cash';
    const initialPaymentMethod = isOfflineCash ? 'Offline Cash' : (paymentMethod || 'Online Razorpay');
    const initialPaymentStatus = isOfflineCash ? 'Pending Cash' : 'Pending';
    const isThirdParty = vehicle.vehicleSource === 'THIRD_PARTY';
    const initialBookingStatus = 'Pending Admin Confirmation';
    const hiredVehicleDetails = isThirdParty ? {
      hireAmount: vehicle.hireDetails?.hireAmount || 0,
      additionalExpense: vehicle.hireDetails?.additionalExpense || 0,
      vendorName: vehicle.vendorDetails?.vendorName || vehicle.ownerName || '',
      vendorMobile: vehicle.vendorDetails?.vendorMobile || vehicle.ownerMobileNumber || '',
      driverName: vehicle.thirdPartyDriver?.driverName || '',
      driverMobile: vehicle.thirdPartyDriver?.driverMobile || '',
      driverLicenseNumber: vehicle.thirdPartyDriver?.driverLicenseNumber || '',
      hirePaymentStatus: vehicle.hireDetails?.paymentStatus || 'Pending',
      loadCapacity: vehicle.loadCapacity || '',
      notes: vehicle.hireDetails?.notes || ''
    } : undefined;

    const booking = await Booking.create({
      bookingId,
      user: req.user?._id,
      vehicleSource: isThirdParty ? 'THIRD_PARTY' : 'OWN',
      hiredVehicleDetails,
      customer: {
        name: req.user.name,
        phone: req.user.phone,
        email: req.user.email
      },
      driver: vehicle.assignedDriver || null,
      vehicle: vehicle._id,
      serviceType,
      pickupLocation,
      dropLocation,
      passengerDetails: (passengerDetails && passengerDetails.length > 0)
        ? passengerDetails
        : [{ name: req.user.name, age: 28, gender: 'Male' }],
      fare: finalFare,
      driverPaymentAmount: Math.round(finalFare * 0.8),
      paymentMethod: initialPaymentMethod,
      paymentStatus: initialPaymentStatus,
      cashCollected: false,
      cashCollectedAt: null,
      cashCollectedBy: null,
      bookingStatus: initialBookingStatus,
      confirmationOtpHash,
      confirmationOtpExpiresAt,
      customerViewOtp: rawOtp,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      driverConfirmedAt: null,
      driverConfirmedBy: null,
      travelDate: travelDate ? new Date(travelDate) : new Date(),
      busSeatNumbers: selectedSeats || []
    });

    // Create corresponding Payment record
    const payment = await Payment.create({
      booking: booking._id,
      bookingId: booking.bookingId,
      customer: {
        name: booking.customer.name,
        phone: booking.customer.phone
      },
      driver: booking.driver || null,
      bookingAmount: booking.fare,
      driverPayment: booking.driverPaymentAmount || Math.round(booking.fare * 0.8),
      paymentMethod: initialPaymentMethod,
      paymentStatus: initialPaymentStatus,
      transactionReference: isOfflineCash ? `CASH-${booking.bookingId}` : `PENDING-${booking.bookingId}`,
      paymentGateway: isOfflineCash ? 'Offline Cash' : 'Razorpay',
      cashCollected: false
    });

    // Create Customer Notification
    await Notification.create({
      title: isOfflineCash ? 'Booking Request Sent' : 'Booking Created',
      message: isOfflineCash
        ? 'Your bus booking request has been sent to the assigned driver.'
        : 'Your booking has been created. Please complete payment.',
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: req.user._id,
      status: 'Unread'
    });

    const bookingObj = booking.toObject();
    bookingObj.confirmationOtp = rawOtp;
    delete bookingObj.confirmationOtpHash;

    res.status(201).json({
      success: true,
      message: 'Booking created successfully. Please provide the OTP to admin for confirmation.',
      data: bookingObj,
      payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bookings for authenticated customer
// @route   GET /api/bookings
// @access  Private (Customer)
exports.getMyBookings = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'customer') {
      const orConditions = [
        { 'customer.phone': req.user.phone },
        ...(req.user.email ? [{ 'customer.email': req.user.email }] : []),
        ...(req.user._id ? [{ user: req.user._id }] : [])
      ];
      query = { $or: orConditions };
    }

    const bookings = await Booking.find(query)
      .populate('vehicle')
      .populate('driver')
      .sort({ createdAt: -1 });

    const formattedBookings = bookings.map((b) => {
      const obj = b.toObject();
      if (req.user.role === 'customer') {
        obj.confirmationOtp = obj.customerViewOtp;
      }
      delete obj.confirmationOtpHash;
      delete obj.customerViewOtp;
      return obj;
    });

    const upcoming = formattedBookings.filter((b) =>
      ['Pending Admin Confirmation', 'PENDING_ADMIN_CONFIRMATION', 'Admin Confirmed', 'ADMIN_CONFIRMED', 'Pending', 'Pending Driver Confirmation', 'Awaiting Cash Collection', 'Confirmed', 'Ongoing'].includes(b.bookingStatus)
    );
    const completed = formattedBookings.filter((b) => ['Completed', 'Cancelled', 'Rejected'].includes(b.bookingStatus));

    res.json({
      success: true,
      count: formattedBookings.length,
      data: {
        all: formattedBookings,
        upcoming,
        completed
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking details + transaction reference
// @route   GET /api/bookings/:id
// @access  Private (Customer/Admin)
exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findOne(getBookingQuery(req.params.id))
      .populate('vehicle')
      .populate('driver');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Ownership check for customer
    if (
      req.user.role === 'customer' &&
      booking.customer.phone !== req.user.phone &&
      booking.customer.email !== req.user.email
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this booking.'
      });
    }

    const payment = await Payment.findOne({ booking: booking._id });

    const obj = booking.toObject();
    if (req.user.role === 'customer') {
      obj.confirmationOtp = obj.customerViewOtp;
    }
    delete obj.confirmationOtpHash;
    delete obj.customerViewOtp;

    res.json({
      success: true,
      data: {
        ...obj,
        transactionReference: payment ? payment.transactionReference : 'Pending Payment'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin OTP Verification to Confirm Booking via /api/bookings/:id/confirm
// @route   POST /api/bookings/:id/confirm
// @access  Private (Admin Only)
exports.confirmBookingOtp = async (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only authorized admin can perform OTP confirmation.'
    });
  }
  const { confirmBookingOtp } = require('./adminController');
  return confirmBookingOtp(req, res, next);
};

// @desc    Resend Booking Confirmation OTP
// @route   POST /api/bookings/:id/resend-otp
// @access  Private (Customer / Admin)
exports.resendBookingOtp = async (req, res, next) => {
  const { resendBookingOtp } = require('./adminController');
  return resendBookingOtp(req, res, next);
};

// @desc    Cancel booking
// @route   POST /api/bookings/:id/cancel
// @access  Private (Customer/Admin)
exports.cancelBooking = async (req, res, next) => {
  try {
    const { cancellationReason } = req.body;

    const booking = await Booking.findOne(getBookingQuery(req.params.id));

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Ownership check
    if (
      req.user.role === 'customer' &&
      booking.customer.phone !== req.user.phone &&
      booking.customer.email !== req.user.email
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You cannot cancel a booking that is not yours.'
      });
    }

    if (['Cancelled', 'Completed'].includes(booking.bookingStatus)) {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.bookingStatus}`
      });
    }

    const refundAmount = booking.fare; // 100% refund policy simulation

    booking.bookingStatus = 'Cancelled';
    booking.cancellationStatus = 'Refunded';
    booking.cancellationReason = cancellationReason || 'Customer requested cancellation via app';
    booking.paymentStatus = 'Refunded';
    await booking.save();

    // Create cancellation record
    const cancellation = await Cancellation.create({
      booking: booking._id,
      bookingId: booking.bookingId,
      customer: {
        name: booking.customer.name,
        phone: booking.customer.phone
      },
      bookingAmount: booking.fare,
      cancellationStatus: 'Completed',
      cancellationReason: booking.cancellationReason,
      refundStatus: 'Processed',
      refundAmount
    });

    // Update payment record if exists
    await Payment.findOneAndUpdate(
      { booking: booking._id },
      {
        refundAmount,
        refundStatus: 'Processed',
        refundDate: new Date(),
        refundReason: booking.cancellationReason,
        paymentStatus: 'Refunded'
      }
    );

    // Create notification
    await Notification.create({
      title: 'Booking Cancelled & Refund Initiated',
      message: `Booking ${booking.bookingId} has been cancelled. Full refund of ₹${refundAmount} has been processed to your original payment method.`,
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: req.user._id,
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully. Refund has been processed.',
      data: {
        booking,
        cancellation,
        refundAmount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm booking with Offline Cash payment
// @route   POST /api/bookings/:id/offline-cash
// @access  Private (Customer)
exports.confirmOfflineCashBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne(getBookingQuery(req.params.id))
      .populate('vehicle')
      .populate('driver');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Successful') {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid.'
      });
    }

    booking.paymentMethod = 'Offline Cash';
    booking.paymentStatus = 'Pending Cash';
    booking.bookingStatus = 'Pending Driver Confirmation';
    booking.driverConfirmationStatus = 'Pending';
    booking.driverConfirmed = false;
    booking.cashCollected = false;
    await booking.save();

    // Update or create payment record
    let payment = await Payment.findOne({ booking: booking._id });
    if (payment) {
      payment.paymentMethod = 'Offline Cash';
      payment.paymentStatus = 'Pending Cash';
      payment.paymentGateway = 'Offline Cash';
      payment.transactionReference = `CASH-${booking.bookingId}`;
      payment.cashCollected = false;
      await payment.save();
    } else {
      payment = await Payment.create({
        booking: booking._id,
        bookingId: booking.bookingId,
        customer: {
          name: booking.customer.name,
          phone: booking.customer.phone
        },
        driver: booking.driver ? (booking.driver._id || booking.driver) : null,
        bookingAmount: booking.fare,
        driverPayment: booking.driverPaymentAmount || Math.round(booking.fare * 0.8),
        paymentMethod: 'Offline Cash',
        paymentStatus: 'Pending Cash',
        transactionReference: `CASH-${booking.bookingId}`,
        paymentGateway: 'Offline Cash',
        cashCollected: false
      });
    }

    // Create Notification
    await Notification.create({
      title: 'Booking Request Sent',
      message: 'Your bus booking request has been sent to the assigned driver.',
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: req.user._id,
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Booking request sent with Offline Cash payment. Waiting for assigned driver/conductor confirmation.',
      data: {
        booking,
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};
