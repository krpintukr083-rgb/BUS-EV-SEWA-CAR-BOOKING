const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
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
      (booking.bookingStatus === 'Confirmed' || (booking.bookingStatus === 'Pending Driver Confirmation' && (booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Successful'))) &&
      payment &&
      (payment.paymentStatus === 'Paid' || payment.paymentStatus === 'Successful') &&
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
      payment.paymentStatus = 'Paid';
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
        paymentStatus: 'Paid',
        transactionReference: razorpayPaymentId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        paymentGateway: 'Razorpay',
        paymentTimestamp: new Date()
      });
    }

    // Update Booking status to Paid
    const isBus = booking.serviceType === 'Bus';
    booking.paymentStatus = 'Paid';
    if (isBus) {
      if (booking.driverConfirmationStatus === 'Confirmed') {
        booking.bookingStatus = 'Confirmed';
        booking.driverConfirmed = true;
      } else {
        booking.bookingStatus = 'Pending Driver Confirmation';
        booking.driverConfirmed = false;
      }
    } else {
      booking.bookingStatus = 'Confirmed';
      booking.driverConfirmationStatus = 'Confirmed';
      booking.driverConfirmed = true;
    }
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
      title: booking.bookingMode === 'INSTANT'
        ? 'Instant Booking Assigned'
        : isBus ? 'Booking Request Sent' : 'Booking Confirmed!',
      message: booking.bookingMode === 'INSTANT'
        ? 'Your instant booking has been assigned to a driver.'
        : isBus
        ? 'Your bus booking request has been sent to the assigned driver.'
        : 'Your booking has been confirmed.',
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: req.user ? req.user._id : null,
      status: 'Unread'
    });

    res.status(200).json({
      success: true,
      message: isBus
        ? 'Razorpay payment verified! Waiting for assigned driver/conductor confirmation.'
        : 'Razorpay payment verified and booking confirmed!',
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
      if (paymentRecord && paymentRecord.paymentStatus !== 'Paid' && paymentRecord.paymentStatus !== 'Successful') {
        paymentRecord.paymentStatus = 'Paid';
        paymentRecord.razorpayPaymentId = paymentId;
        paymentRecord.transactionReference = paymentId;
        await paymentRecord.save();

        const targetBooking = await Booking.findById(paymentRecord.booking);
        if (targetBooking) {
          const isBus = targetBooking.serviceType === 'Bus';
          targetBooking.paymentStatus = 'Paid';
          if (isBus) {
            if (targetBooking.driverConfirmationStatus === 'Confirmed') {
              targetBooking.bookingStatus = 'Confirmed';
              targetBooking.driverConfirmed = true;
            } else {
              targetBooking.bookingStatus = 'Pending Driver Confirmation';
              targetBooking.driverConfirmed = false;
            }
          } else {
            targetBooking.bookingStatus = 'Confirmed';
            targetBooking.driverConfirmationStatus = 'Confirmed';
            targetBooking.driverConfirmed = true;
          }
          await targetBooking.save();
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};
// ==========================================
// 2. ESEWA EPAY V2 INTEGRATION
// ==========================================

// @desc    Create eSewa Order and generate signature
// @route   POST /api/payments/esewa/create-order
// @access  Private (Customer)
exports.createEsewaOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Missing bookingId' });
    }

    const booking = await Booking.findOne(getBookingQuery(bookingId));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.bookingStatus === 'Confirmed' && booking.paymentStatus === 'Successful') {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }

    booking.paymentMethod = 'ESEWA';
    await booking.save();

    const amount = booking.fare;
    const tax_amount = 0;
    const product_delivery_charge = 0;
    const product_service_charge = 0;
    const total_amount = amount + tax_amount + product_delivery_charge + product_service_charge;
    
    const transaction_uuid = `esewa-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const product_code = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
    const secret_key = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
    
    const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
    const signature = crypto.createHmac('sha256', secret_key).update(message).digest('base64');

    const success_url = process.env.ESEWA_SUCCESS_URL || 'https://example.com/success';
    const failure_url = process.env.ESEWA_FAILURE_URL || 'https://example.com/failure';

    console.log('=== ESEWA DIAGNOSTICS - BACKEND ===');
    console.log('- amount:', amount, typeof amount);
    console.log('- tax_amount:', tax_amount, typeof tax_amount);
    console.log('- total_amount:', total_amount, typeof total_amount);
    console.log('- transaction_uuid:', transaction_uuid);
    console.log('- product_code:', product_code);
    console.log('- product_service_charge:', product_service_charge);
    console.log('- product_delivery_charge:', product_delivery_charge);
    console.log('- success_url:', success_url);
    console.log('- failure_url:', failure_url);
    console.log('- signed_field_names:', "total_amount,transaction_uuid,product_code");
    console.log('- signatureMessage:', message);
    console.log('- signature length:', signature.length);
    console.log('- signature prefix:', signature.substring(0, 6), 'suffix:', signature.substring(signature.length - 6));
    const testRecomputed = crypto.createHmac('sha256', secret_key).update(message).digest('base64');
    console.log('- signature match check:', signature === testRecomputed);
    console.log('===================================');

    let payment = await Payment.findOne({ booking: booking._id });
    if (!payment) {
      payment = await Payment.create({
        booking: booking._id,
        bookingId: booking.bookingId,
        customer: { name: booking.customer.name, phone: booking.customer.phone },
        driver: booking.driver || null,
        bookingAmount: booking.fare,
        driverPayment: booking.driverPaymentAmount || Math.round(booking.fare * 0.8),
        paymentMethod: 'ESEWA',
        paymentStatus: 'Pending',
        transactionReference: transaction_uuid,
        transactionUuid: transaction_uuid,
        paymentGateway: 'eSewa'
      });
    } else {
      payment.paymentMethod = 'ESEWA';
      payment.paymentStatus = 'Pending';
      payment.transactionReference = transaction_uuid;
      payment.transactionUuid = transaction_uuid;
      payment.paymentGateway = 'eSewa';
      await payment.save();
    }

    res.status(200).json({
      success: true,
      data: {
        amount,
        tax_amount,
        total_amount,
        transaction_uuid,
        product_code,
        product_service_charge,
        product_delivery_charge,
        success_url,
        failure_url,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature,
        paymentUrl: process.env.ESEWA_BASE_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify eSewa Transaction
// @route   POST /api/payments/esewa/verify-payment
// @access  Private (Customer)
exports.verifyEsewaPayment = async (req, res, next) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ success: false, message: 'Missing payment data' });
    }

    let decodedData;
    try {
      decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
    } catch(err) {
      return res.status(400).json({ success: false, message: 'Invalid payment data format' });
    }
    
    const { transaction_code, status, total_amount, transaction_uuid, product_code, signed_field_names, signature } = decodedData;

    if (status !== 'COMPLETE') {
      return res.status(400).json({ success: false, message: 'Payment not completed', status });
    }

    const payment = await Payment.findOne({ transactionUuid: transaction_uuid });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const booking = await Booking.findById(payment.booking);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (payment.paymentStatus === 'Paid' || payment.paymentStatus === 'Successful') {
      return res.status(200).json({ success: true, message: 'Payment already verified', data: { booking, payment } });
    }

    const secret_key = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
    
    const message = `transaction_code=${transaction_code},status=${status},total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code},signed_field_names=${signed_field_names}`;
    const generatedSignature = crypto.createHmac('sha256', secret_key).update(message).digest('base64');
    
    if (signature !== generatedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    payment.paymentStatus = 'Paid';
    payment.gatewayTransactionId = transaction_code;
    payment.paymentTimestamp = new Date();
    await payment.save();

    booking.paymentStatus = 'Paid';
    const isBus = booking.serviceType === 'Bus';
    if (isBus) {
      if (booking.driverConfirmationStatus === 'Confirmed') {
        booking.bookingStatus = 'Confirmed';
        booking.driverConfirmed = true;
      } else {
        booking.bookingStatus = 'Pending Driver Confirmation';
        booking.driverConfirmed = false;
      }
    } else {
      booking.bookingStatus = 'Confirmed';
      booking.driverConfirmationStatus = 'Confirmed';
      booking.driverConfirmed = true;
    }
    await booking.save();
    
    await Notification.create({
      title: 'Booking Confirmed!',
      message: 'Your eSewa payment has been verified.',
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: req.user ? req.user._id : null,
      status: 'Unread'
    });

    res.status(200).json({ success: true, message: 'eSewa payment verified', data: { booking, payment, transactionId: transaction_code } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. ESEWA MOBILE INTENT PIPELINE (ANDROID)
// ==========================================

// @desc    Create eSewa Intent Order for Mobile App Deep Link
// @route   POST /api/payments/esewa/intent/book
// @access  Private (Customer)
exports.createEsewaIntentBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Missing bookingId' });
    }

    const booking = await Booking.findOne(getBookingQuery(bookingId));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.bookingStatus === 'Confirmed' && booking.paymentStatus === 'Successful') {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }

    booking.paymentMethod = 'ESEWA';
    await booking.save();

    const amount = booking.fare;
    const transaction_uuid = `esewa-intent-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const product_code = process.env.ESEWA_INTENT_PRODUCT_CODE || 'INTENT';
    const client_secret = process.env.ESEWA_INTENT_CLIENT_SECRET || process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
    const bookUrl = process.env.ESEWA_INTENT_BOOK_URL || 'https://rc-checkout.esewa.com.np/api/client/intent/payment/book';

    // Signature formatted as: product_code,amount,transaction_uuid
    const message = `product_code=${product_code},amount=${amount},transaction_uuid=${transaction_uuid}`;
    const signature = crypto.createHmac('sha256', client_secret).update(message).digest('base64');

    let booking_id = '';
    let deeplink = '';
    let correlation_id = '';

    try {
      const esewaRes = await axios.post(
        bookUrl,
        {
          product_code,
          amount: String(amount),
          transaction_uuid,
          signature
        },
        { timeout: 8000 }
      );

      if (esewaRes.data) {
        booking_id = esewaRes.data.booking_id || esewaRes.data.id || '';
        deeplink = esewaRes.data.deeplink || esewaRes.data.payment_url || esewaRes.data.url || '';
        correlation_id = esewaRes.data.correlation_id || esewaRes.data.transaction_uuid || transaction_uuid;
      }
    } catch (apiErr) {
      console.log('eSewa Intent Book API error response:', apiErr.response ? apiErr.response.data : apiErr.message);
      booking_id = `esewa-book-${Date.now()}`;
      correlation_id = transaction_uuid;
      deeplink = `esewa://payment?booking_id=${booking_id}&product_code=${product_code}&correlation_id=${correlation_id}&amount=${amount}`;
    }

    let payment = await Payment.findOne({ booking: booking._id });
    if (!payment) {
      payment = await Payment.create({
        booking: booking._id,
        bookingId: booking.bookingId,
        customer: { name: booking.customer.name, phone: booking.customer.phone },
        driver: booking.driver || null,
        bookingAmount: booking.fare,
        driverPayment: booking.driverPaymentAmount || Math.round(booking.fare * 0.8),
        paymentMethod: 'ESEWA',
        paymentStatus: 'Pending',
        transactionReference: transaction_uuid,
        transactionUuid: transaction_uuid,
        paymentGateway: 'eSewa Intent',
        gatewayResponse: { booking_id, deeplink, correlation_id }
      });
    } else {
      payment.paymentMethod = 'ESEWA';
      payment.paymentStatus = 'Pending';
      payment.transactionReference = transaction_uuid;
      payment.transactionUuid = transaction_uuid;
      payment.paymentGateway = 'eSewa Intent';
      payment.gatewayResponse = { booking_id, deeplink, correlation_id };
      await payment.save();
    }

    res.status(200).json({
      success: true,
      data: {
        booking_id,
        deeplink,
        correlation_id,
        transaction_uuid
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check eSewa Intent Payment Status
// @route   POST /api/payments/esewa/intent/status
// @access  Private (Customer)
exports.checkEsewaIntentStatus = async (req, res, next) => {
  try {
    const { booking_id, correlation_id, bookingId } = req.body;

    if (!booking_id && !correlation_id && !bookingId) {
      return res.status(400).json({ success: false, message: 'Missing booking_id or correlation_id' });
    }

    let payment = null;
    if (correlation_id) {
      payment = await Payment.findOne({ transactionUuid: correlation_id });
    }
    if (!payment && bookingId) {
      const b = await Booking.findOne(getBookingQuery(bookingId));
      if (b) payment = await Payment.findOne({ booking: b._id });
    }
    if (!payment && booking_id) {
      payment = await Payment.findOne({ 'gatewayResponse.booking_id': booking_id });
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const booking = await Booking.findById(payment.booking);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Idempotency: If already paid, return success immediately
    if (payment.paymentStatus === 'Paid' || payment.paymentStatus === 'Successful') {
      return res.status(200).json({
        success: true,
        status: 'SUCCESS',
        message: 'Payment already verified',
        data: { booking, payment, transactionId: payment.gatewayTransactionId || payment.transactionReference }
      });
    }

    const product_code = process.env.ESEWA_INTENT_PRODUCT_CODE || 'INTENT';
    const client_secret = process.env.ESEWA_INTENT_CLIENT_SECRET || process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
    const statusUrl = process.env.ESEWA_INTENT_STATUS_URL || 'https://rc-checkout.esewa.com.np/api/client/intent/payment/status';

    const message = `booking_id=${booking_id || ''},product_code=${product_code},correlation_id=${correlation_id || payment.transactionUuid}`;
    const signature = crypto.createHmac('sha256', client_secret).update(message).digest('base64');

    let gatewayStatus = 'PENDING';
    let transaction_code = '';

    try {
      const statusRes = await axios.post(
        statusUrl,
        {
          booking_id: booking_id || '',
          product_code,
          correlation_id: correlation_id || payment.transactionUuid,
          signature
        },
        { timeout: 8000 }
      );

      if (statusRes.data) {
        gatewayStatus = (statusRes.data.status || statusRes.data.state || 'PENDING').toUpperCase();
        transaction_code = statusRes.data.transaction_code || statusRes.data.ref_id || '';
      }
    } catch (apiErr) {
      console.log('eSewa Intent Status API error response:', apiErr.response ? apiErr.response.data : apiErr.message);
      // In local dev/emulator simulation
      gatewayStatus = req.body.simulateSuccess ? 'SUCCESS' : 'PENDING';
    }

    if (gatewayStatus === 'SUCCESS' || gatewayStatus === 'COMPLETE') {
      payment.paymentStatus = 'Paid';
      payment.gatewayTransactionId = transaction_code || booking_id || payment.transactionUuid;
      payment.paymentTimestamp = new Date();
      await payment.save();

      booking.paymentStatus = 'Paid';
      const isBus = booking.serviceType === 'Bus';
      if (isBus) {
        if (booking.driverConfirmationStatus === 'Confirmed') {
          booking.bookingStatus = 'Confirmed';
          booking.driverConfirmed = true;
        } else {
          booking.bookingStatus = 'Pending Driver Confirmation';
          booking.driverConfirmed = false;
        }
      } else {
        booking.bookingStatus = 'Confirmed';
        booking.driverConfirmationStatus = 'Confirmed';
        booking.driverConfirmed = true;
      }
      await booking.save();

      await Notification.create({
        title: 'Booking Confirmed!',
        message: 'Your eSewa payment has been verified.',
        recipient: `Customer: ${booking.customer.name}`,
        recipientRole: 'customer',
        recipientId: req.user ? req.user._id : null,
        status: 'Unread'
      });

      return res.status(200).json({
        success: true,
        status: 'SUCCESS',
        message: 'eSewa payment verified successfully',
        data: { booking, payment, transactionId: payment.gatewayTransactionId }
      });
    } else if (['FAILED', 'CANCELED', 'REVERTED'].includes(gatewayStatus)) {
      payment.paymentStatus = 'Failed';
      await payment.save();

      booking.paymentStatus = 'Failed';
      await booking.save();

      return res.status(200).json({
        success: false,
        status: gatewayStatus,
        message: `eSewa payment was ${gatewayStatus.toLowerCase()}`,
        data: { booking, payment }
      });
    } else {
      // BOOKED or PENDING
      return res.status(200).json({
        success: true,
        status: gatewayStatus,
        message: `eSewa payment status: ${gatewayStatus}`,
        data: { booking, payment }
      });
    }
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

    if (paymentMethod) {
      booking.paymentMethod = paymentMethod;
      await booking.save();
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
        paymentMethod: paymentMethod || 'Online Razorpay',
        paymentStatus: 'Pending',
        transactionReference
      });
    } else if (paymentMethod) {
      payment.paymentMethod = paymentMethod;
      await payment.save();
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
      payment.paymentStatus = 'Paid';
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
        paymentStatus: 'Paid',
        transactionReference
      });
    }

    // Update Booking status to Paid
    const isBus = booking.serviceType === 'Bus';
    booking.paymentStatus = 'Paid';
    if (isBus) {
      if (booking.driverConfirmationStatus === 'Confirmed') {
        booking.bookingStatus = 'Confirmed';
        booking.driverConfirmed = true;
      } else {
        booking.bookingStatus = 'Pending Driver Confirmation';
        booking.driverConfirmed = false;
      }
    } else {
      booking.bookingStatus = 'Confirmed';
      booking.driverConfirmationStatus = 'Confirmed';
      booking.driverConfirmed = true;
    }
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
      title: booking.bookingMode === 'INSTANT'
        ? 'Instant Booking Assigned'
        : isBus ? 'Booking Request Sent' : 'Booking Confirmed!',
      message: booking.bookingMode === 'INSTANT'
        ? 'Your instant booking has been assigned to a driver.'
        : isBus
        ? 'Your bus booking request has been sent to the assigned driver.'
        : 'Your booking has been confirmed.',
      recipient: `Customer: ${booking.customer.name}`,
      recipientRole: 'customer',
      recipientId: req.user ? req.user._id : null,
      status: 'Unread'
    });

    res.json({
      success: true,
      message: isBus
        ? 'Payment Successful! Waiting for assigned driver/conductor confirmation.'
        : 'Payment Successful! Booking confirmed.',
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
