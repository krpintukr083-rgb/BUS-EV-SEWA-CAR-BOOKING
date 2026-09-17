const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  confirmOfflineCashBooking
} = require('../controllers/bookingController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.post('/', createBooking);
router.get('/', getMyBookings);
router.get('/:id', getBookingById);
router.post('/:id/offline-cash', confirmOfflineCashBooking);
router.post('/:id/cancel', cancelBooking);

module.exports = router;
