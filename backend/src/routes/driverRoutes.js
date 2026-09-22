const express = require('express');
const router = express.Router();
const {
  getDriverDashboard,
  getDriverProfile,
  updateDriverProfile,
  changeDriverLoginId,
  changeDriverPassword,
  getAssignedVehicle,
  getDriverDocuments,
  uploadDriverDocument,
  getDriverStatus,
  updateDriverStatus,
  updateLanguage,
  getBookingRequests,
  getActiveBookingsForDriver,
  acceptBookingRequest,
  rejectBookingRequest,
  arriveAtPickup,
  verifyRideOtp,
  startRide,
  endRide,
  cancelRide,
  collectCash,
  getBookingHistory,
  getEarnings,
  getDriverWallet,
  requestWithdrawal,
  getDriverIncentives,
  triggerSOS,
  getEVDetails,
  updateEVBattery,
  getDriverNotifications,
  getDriverSupport,
  createSupportTicket
} = require('../controllers/driverController');
const { verifyToken, driverAuth } = require('../middleware/auth');
const { handleSingleUpload } = require('../middleware/upload');

// All driver routes are protected with JWT and driver role verification
router.use(verifyToken, driverAuth);

// 1. Dashboard & Profile
router.get('/dashboard', getDriverDashboard);
router.get('/profile', getDriverProfile);
router.put('/profile', updateDriverProfile);
router.put('/account/login-id', changeDriverLoginId);
router.put('/account/password', changeDriverPassword);
router.get('/vehicle', getAssignedVehicle);

// 2. Documents & KYC
router.get('/documents', getDriverDocuments);
router.post('/documents', handleSingleUpload(), uploadDriverDocument);

// 3. Online/Offline Status Toggle
router.get('/status', getDriverStatus);
router.put('/status', updateDriverStatus);
router.patch('/status', updateDriverStatus);
router.patch('/toggle-status', updateDriverStatus);

// 4. Language Preferences
router.put('/language', updateLanguage);
router.patch('/language', updateLanguage);

// 5. Booking Requests (Bus, EV-Sewa, Car)
router.get('/booking-requests', getBookingRequests);
router.get('/requests', getBookingRequests);
// Active bookings for driver (accepted, OTP pending, ongoing) — used by BusConfirmationScreen
router.get('/active-bookings', getActiveBookingsForDriver);
router.post('/booking-requests/:id/accept', acceptBookingRequest);
router.post('/requests/:id/accept', acceptBookingRequest);
router.post('/accept-ride/:id', acceptBookingRequest);
router.post('/booking-requests/:id/confirm', acceptBookingRequest);
router.post('/requests/:id/confirm', acceptBookingRequest);
router.post('/confirm-bus/:id', acceptBookingRequest);
router.post('/booking-requests/:id/reject', rejectBookingRequest);
router.post('/requests/:id/reject', rejectBookingRequest);

// 6. Active Ride Lifecycle (Car / EV-Sewa / Transport)
router.post('/rides/:id/arrived', arriveAtPickup);
router.post('/arrived/:id', arriveAtPickup);
router.post('/rides/:id/verify-otp', verifyRideOtp);
router.post('/bookings/:id/verify-otp', verifyRideOtp);
router.post('/verify-otp/:id', verifyRideOtp);
router.post('/verify-otp', verifyRideOtp);
router.post('/rides/:id/start', startRide);
router.post('/start-ride/:id', startRide);
router.post('/rides/:id/end', endRide);
router.post('/end-ride/:id', endRide);
router.post('/rides/:id/complete', endRide);
router.post('/bookings/:id/complete', endRide);
router.post('/rides/:id/destination-reached', endRide);
router.post('/rides/:id/cancel', cancelRide);
router.post('/cancel-ride/:id', cancelRide);

// 7. Cash Collection (Offline Cash)
router.post('/bookings/:id/collect-cash', collectCash);
router.post('/collect-cash/:id', collectCash);
router.post('/collect-cash', collectCash);

// 8. Booking History & Authoritative Earnings
router.get('/booking-history', getBookingHistory);
router.get('/earnings', getEarnings);

// 9. Driver Wallet & Withdrawals / Settlements
router.get('/wallet', getDriverWallet);
router.post('/withdraw', requestWithdrawal);

// 10. Incentives & Bonuses
router.get('/incentives', getDriverIncentives);

// 11. SOS Emergency Alert (STRICTLY NO GPS TRANSMISSION)
router.post('/sos', triggerSOS);

// 12. EV Specific Hub & Battery
router.get('/ev-hub', getEVDetails);
router.put('/ev-battery', updateEVBattery);
router.put('/battery-update', updateEVBattery);
router.patch('/battery-update', updateEVBattery);

// 13. Notifications & Announcements
router.get('/notifications', getDriverNotifications);

// 14. Support & Tickets
router.get('/support', getDriverSupport);
router.post('/support/ticket', createSupportTicket);

module.exports = router;
