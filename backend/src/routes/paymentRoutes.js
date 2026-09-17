const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  recordRazorpayFailure,
  razorpayWebhook,
  createPayment,
  testPaymentSuccess,
  testPaymentFailure,
  getPaymentByBookingId
} = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');

// Public Webhook (no token required)
router.post('/razorpay/webhook', razorpayWebhook);

// Protected Customer Routes
router.use(verifyToken);

// Razorpay Test Payment Pipeline
router.post('/razorpay/create-order', createRazorpayOrder);
router.post('/razorpay/verify-payment', verifyRazorpayPayment);
router.post('/razorpay/record-failure', recordRazorpayFailure);

// Backward-compatible Sandbox Pipeline
router.post('/create', createPayment);
router.post('/test-success', testPaymentSuccess);
router.post('/test-failure', testPaymentFailure);
router.get('/:bookingId', getPaymentByBookingId);

module.exports = router;

