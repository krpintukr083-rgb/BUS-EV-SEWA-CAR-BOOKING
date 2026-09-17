const mongoose = require('mongoose');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Insurance = require('../models/Insurance');
const Notification = require('../models/Notification');

const getBookingQuery = (idOrCode) => {
  return mongoose.isValidObjectId(idOrCode)
    ? { $or: [{ bookingId: idOrCode }, { _id: idOrCode }] }
    : { bookingId: idOrCode };
};

// ==========================================
// 1. RAZORPAY TEST MODE PIPELINE
// ==========================================

// @desc    Create Razorpay TEST Order from server-calculated booking fare
// @route   POST /api/payments/razorpay/create-order
// @access  Private (Customer)
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Missing bookingId for payment order creation'
      });
    }

    const booking = await Booking.findOne(getBookingQuery(bookingId));

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.bookingStatus === 'Confirmed' && booking.paymentStatus === 'Successful') {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been paid and confirmed.'
      });
    }

    // SERVER-SIDE FARE CALCULATION & VERIFICATION (Never trust client-sent amounts)
    const amountInPaise = Math.round(booking.fare * 100);

    const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_51tEvSewaCar2026';
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'sD8wUaPjGz9x7qK3mN1vB4rE';

    let order;
    try {
      const razorpay = new Razorpay({ key_id, key_secret });
      order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: booking.bookingId,
        notes: {
          bookingId: booking._id.toString(),
          bookingCode: booking.bookingId,
          serviceType: booking.serviceType
        }
      });
    } catch (sdkError) {
      // Offline/sandbox test order fallback if external API is unreachable
      const testOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      order = {
        id: testOrderId,
        amount: amountInPaise,
        currency: 'INR',
        receipt: booking.bookingId,
        status: 'created'
      };
    }

    // Initialize/Update Payment record in Pending state
    const transactionReference = order.id;
    let payment = await Payment.findOne({ booking: booking._id });
    if (payment) {
      payment.paymentStatus = 'Pending';
      payment.razorpayOrderId = order.id;
      payment.transactionReference = transactionReference;
      payment.bookingAmount = booking.fare;
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
        paymentStatus: 'Pending',
        transactionReference,
        razorpayOrderId: order.id,
        paymentGateway: 'Razorpay'
      });
    }

    // Return ONLY the public key_id and order parameters (NEVER send key_secret or webhook_secret)
    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency || 'INR',
        keyId: key_id,
        bookingId: booking.bookingId,
        bookingDbId: booking._id,
        fare: booking.fare,
        serviceType: booking.serviceType,
        customer: {
          name: booking.customer.name,
          phone: booking.customer.phone,
          email: booking.customer.email || 'customer@example.com'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process Razorpay Test Checkout Authorization Simulation
// @route   POST /api/payments/razorpay/test-pay
// @access  Private (Customer)
exports.processRazorpayTestCheckout = async (req, res, next) => {
  try {
    const { bookingId, razorpayOrderId, status, method } = req.body;

    if (!bookingId || !razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing bookingId or razorpayOrderId'
      });
    }

    const booking = await Booking.findOne(getBookingQuery(bookingId));
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (status === 'failed' || status === 'declined') {
      const errorObj = {
        code: 'BAD_REQUEST_ERROR',
        description: 'Payment was declined by issuing bank (Test Mode Simulation)',
        source: 'gateway',
        step: 'payment_authentication',
        reason: 'payment_declined'
      };

      let payment = await Payment.findOne({ booking: booking._id });
      if (payment) {
        payment.paymentStatus = 'Failed';
        payment.gatewayResponse = errorObj;
        await payment.save();
      }
      booking.paymentStatus = 'Failed';
      await booking.save();

      return res.status(200).json({
        success: false,
        message: 'Payment declined in test mode.',
        error: errorObj
      });
    }

    // Generate Razorpay test payment ID and valid server HMAC SHA256 signature
    const razorpayPaymentId = `pay_test_${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'sD8wUaPjGz9x7qK3mN1vB4rE';
    const bodyToSign = `${razorpayOrderId}|${razorpayPaymentId}`;
    const razorpaySignature = crypto
      .createHmac('sha256', key_secret)
      .update(bodyToSign)
      .digest('hex');

    res.status(200).json({
      success: true,
      message: 'Razorpay test payment authorization successful',
      data: {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        amount: Math.round(booking.fare * 100),
        currency: 'INR',
        method: method || 'UPI'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay Payment Signature Server-Side and Confirm Booking
// @route   POST /api/payments/razorpay/verify-payment
// @access  Private (Customer)
exports.verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters (bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature)'
      });
    }

    const booking = await Booking.findOne(getBookingQuery(bookingId));

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // DUPLICATE PROTECTION: Check if payment is already successfully confirmed
    let payment = await Payment.findOne({ booking: booking._id });
    if (
      booking.bookingStatus === 'Confirmed' &&
      payment &&
      payment.paymentStatus === 'Successful' &&
      payment.razorpayPaymentId === razorpayPaymentId
    ) {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified and booking is confirmed.',
        data: {
          booking,
          payment,
          duplicateIgnored: true
        }
      });
    }

    // SERVER-SIDE HMAC SHA256 SIGNATURE VERIFICATION
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'sD8wUaPjGz9x7qK3mN1vB4rE';
    const bodyToSign = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(bodyToSign)
      .digest('hex');

    const isSignatureValid = (expectedSignature === razorpaySignature);

    if (!isSignatureValid) {
      // Signature mismatch - Mark failed and reject confirmation
      if (payment) {
        payment.paymentStatus = 'Failed';
        payment.razorpayPaymentId = razorpayPaymentId;
        payment.razorpayOrderId = razorpayOrderId;
        await payment.save();
      }
      booking.paymentStatus = 'Failed';
      await booking.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid Razorpay payment signature. Server-side verification failed.'
      });
    }

    // Signature Valid - Process Confirmation
    if (payment) {
      payment.paymentStatus = 'Successful';
      payment.transactionReference = razorpayPaymentId;
      payment.razorpayOrderId = razorpayOrderId;
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      payment.paymentGateway = 'Razorpay';
      payment.paymentTimestamp = new Date();
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
        transactionReference: razorpayPaymentId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        paymentGateway: 'Razorpay',
        paymentTimestamp: new Date()
      });
    }

    // Update Booking status to Confirmed & Paid
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
      message: `Your booking ${booking.bookingId} (${booking.serviceType}) is confirmed via Razorpay test payment of ₹${booking.fare}.`,
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: req.user ? req.user._id : null,
      status: 'Unread'
    });

    res.status(200).json({
      success: true,
      message: 'Razorpay payment verified and booking confirmed successfully!',
      data: {
        booking,
        payment,
        insurance,
        transactionId: razorpayPaymentId
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record Failed Razorpay Transaction
// @route   POST /api/payments/razorpay/record-failure
// @access  Private (Customer)
exports.recordRazorpayFailure = async (req, res, next) => {
  try {
    const { bookingId, razorpayOrderId, error } = req.body;

    const booking = await Booking.findOne(getBookingQuery(bookingId));

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const transactionReference = `TXN-RZP-FAIL-${Date.now().toString().slice(-6)}`;

    let payment = await Payment.findOne({ booking: booking._id });
    if (payment) {
      payment.paymentStatus = 'Failed';
      payment.transactionReference = transactionReference;
      if (razorpayOrderId) payment.razorpayOrderId = razorpayOrderId;
      payment.gatewayResponse = error || {};
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
        transactionReference,
        razorpayOrderId: razorpayOrderId || '',
        paymentGateway: 'Razorpay',
        gatewayResponse: error || {}
      });
    }

    // Booking remains in Pending state, NOT Confirmed
    booking.paymentStatus = 'Failed';
    await booking.save();

    res.status(200).json({
      success: false,
      message: error?.description || 'Razorpay test payment failed or was cancelled.',
      data: {
        booking,
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Razorpay Webhook Handler
// @route   POST /api/payments/razorpay/webhook
// @access  Public
exports.razorpayWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_test_secret_key_2026';
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing webhook signature header' });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment.captured') {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      const paymentRecord = await Payment.findOne({ razorpayOrderId: orderId });
      if (paymentRecord && paymentRecord.paymentStatus !== 'Successful') {
        paymentRecord.paymentStatus = 'Successful';
        paymentRecord.razorpayPaymentId = paymentId;
        paymentRecord.transactionReference = paymentId;
        await paymentRecord.save();

        await Booking.findByIdAndUpdate(paymentRecord.booking, {
          paymentStatus: 'Successful',
          bookingStatus: 'Confirmed'
        });
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. BACKWARD COMPATIBLE SANDBOX CONTROLLERS
// ==========================================

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

