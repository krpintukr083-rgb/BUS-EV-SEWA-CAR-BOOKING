const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Insurance = require('../models/Insurance');
const Notification = require('../models/Notification');

const getBookingQuery = (idOrCode) => {
  return mongoose.isValidObjectId(idOrCode)
    ? { $or: [{ bookingId: idOrCode }, { _id: idOrCode }] }
    : { bookingId: idOrCode };
};

// @desc    Create a pending payment record
// @route   POST /api/payments/create
// @access  Private (Customer)
exports.createPayment = async (req, res, next) => {
  try {
    const { bookingId, paymentMethod } = req.body;

    const booking = await Booking.findOne(getBookingQuery(bookingId));

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const transactionReference = `TXN-IND-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    let payment = await Payment.findOne({ booking: booking._id });
    if (!payment) {
      payment = await Payment.create({
        booking: booking._id,
        bookingId: booking.bookingId,
        customer: {
          name: booking.customer.name,
          phone: booking.customer.phone
        },
        driver: booking.driver || null,
        bookingAmount: booking.fare,
        driverPayment: booking.driverPaymentAmount || Math.round(booking.fare * 0.8),
        paymentStatus: 'Pending',
        transactionReference
      });
    }

    res.status(201).json({
      success: true,
      message: 'Pending payment session initialized',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process Test Success in Payment Sandbox
// @route   POST /api/payments/test-success
// @access  Private (Customer)
exports.testPaymentSuccess = async (req, res, next) => {
  try {
    const { bookingId, paymentMethod } = req.body;

    const booking = await Booking.findOne(getBookingQuery(bookingId));

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const transactionReference = `TXN-IND-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    let payment = await Payment.findOne({ booking: booking._id });
    if (payment) {
      payment.paymentStatus = 'Successful';
      payment.transactionReference = transactionReference;
      await payment.save();
    } else {
      payment = await Payment.create({
        booking: booking._id,
        bookingId: booking.bookingId,
        customer: {
          name: booking.customer.name,
          phone: booking.customer.phone
        },
        driver: booking.driver || null,
        bookingAmount: booking.fare,
        driverPayment: booking.driverPaymentAmount || Math.round(booking.fare * 0.8),
        paymentStatus: 'Successful',
        transactionReference
      });
    }

    // Update Booking status to Confirmed
    booking.paymentStatus = 'Successful';
    booking.bookingStatus = 'Confirmed';
    await booking.save();

    // Create / Update Insurance record
    const policyNumber = `INS-TRANS-${Date.now().toString().slice(-6)}`;
    let insurance = await Insurance.findOne({ booking: booking._id });
    if (!insurance) {
      insurance = await Insurance.create({
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        booking: booking._id,
        bookingId: booking.bookingId,
        policyNumber,
        insuranceProvider: 'National Transport General Insurance Co.',
        insuranceStatus: 'Active',
        maxCoverageLimit: 500000,
        activeStatus: 'Active',
        claimStatus: 'None',
        disclaimer: 'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.'
      });
    }

    // Create Notification
    await Notification.create({
      title: 'Booking Confirmed!',
      message: `Your booking ${booking.bookingId} (${booking.serviceType}) is confirmed. Payment of ₹${booking.fare} was successful.`,
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: req.user ? req.user._id : null,
      status: 'Unread'
    });

    res.json({
      success: true,
      message: 'Payment Successful! Booking Confirmed.',
      data: {
        booking,
        payment,
        insurance,
        transactionId: transactionReference
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process Test Failure in Payment Sandbox
// @route   POST /api/payments/test-failure
// @access  Private (Customer)
exports.testPaymentFailure = async (req, res, next) => {
  try {
    const { bookingId, failureReason } = req.body;

    const booking = await Booking.findOne(getBookingQuery(bookingId));

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const transactionReference = `TXN-FAIL-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    let payment = await Payment.findOne({ booking: booking._id });
    if (payment) {
      payment.paymentStatus = 'Failed';
      payment.transactionReference = transactionReference;
      await payment.save();
    } else {
      payment = await Payment.create({
        booking: booking._id,
        bookingId: booking.bookingId,
        customer: {
          name: booking.customer.name,
          phone: booking.customer.phone
        },
        driver: booking.driver || null,
        bookingAmount: booking.fare,
        driverPayment: 0,
        paymentStatus: 'Failed',
        transactionReference
      });
    }

    // Booking remains Pending/Payment Failed, NOT Confirmed
    booking.paymentStatus = 'Failed';
    await booking.save();

    res.json({
      success: false,
      message: failureReason || 'Payment declined in test sandbox simulation',
      data: {
        booking,
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment record for booking
// @route   GET /api/payments/:bookingId
// @access  Private (Customer/Admin)
exports.getPaymentByBookingId = async (req, res, next) => {
  try {
    const booking = await Booking.findOne(getBookingQuery(req.params.bookingId));

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const payment = await Payment.findOne({ booking: booking._id });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No payment record found for this booking'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};
