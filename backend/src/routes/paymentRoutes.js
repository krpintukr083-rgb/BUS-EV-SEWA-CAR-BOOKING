const express = require('express');
const router = express.Router();
const {
  createPayment,
  testPaymentSuccess,
  testPaymentFailure,
  getPaymentByBookingId
} = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.post('/create', createPayment);
router.post('/test-success', testPaymentSuccess);
router.post('/test-failure', testPaymentFailure);
router.get('/:bookingId', getPaymentByBookingId);

module.exports = router;
