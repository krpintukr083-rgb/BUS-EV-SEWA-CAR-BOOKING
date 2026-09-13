const express = require('express');
const router = express.Router();
const { getInsuranceByBooking, getCustomerInsurances } = require('../controllers/insuranceController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', getCustomerInsurances);
router.get('/:bookingId', getInsuranceByBooking);

module.exports = router;
