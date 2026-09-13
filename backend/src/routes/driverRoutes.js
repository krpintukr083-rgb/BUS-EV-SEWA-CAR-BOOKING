const express = require('express');
const router = express.Router();
const {
  getDriverDashboard,
  getDriverProfile,
  updateDriverProfile,
  getAssignedVehicle,
  getBookingRequests,
  acceptBookingRequest,
  rejectBookingRequest,
  getBookingHistory,
  getEarnings,
  getDriverDocuments,
  updateDriverStatus,
  getDriverSupport
} = require('../controllers/driverController');
const { verifyToken, driverAuth } = require('../middleware/auth');

// All driver routes are protected with JWT and driver role verification
router.use(verifyToken, driverAuth);

router.get('/dashboard', getDriverDashboard);
router.get('/profile', getDriverProfile);
router.put('/profile', updateDriverProfile);
router.get('/vehicle', getAssignedVehicle);
router.get('/booking-requests', getBookingRequests);
router.post('/booking-requests/:id/accept', acceptBookingRequest);
router.post('/booking-requests/:id/reject', rejectBookingRequest);
router.get('/booking-history', getBookingHistory);
router.get('/earnings', getEarnings);
router.get('/documents', getDriverDocuments);
router.put('/status', updateDriverStatus);
router.get('/support', getDriverSupport);

module.exports = router;
