const express = require('express');
const router = express.Router();
const { getCustomerProfile, updateCustomerProfile, changeUserLoginId, changeUserPassword } = require('../controllers/userController');
const {
  getServicesStatus,
  getBuses,
  getBusDetails,
  getEvSewa,
  getEvSewaDetails,
  getCars,
  getCarDetails,
  createBooking,
  processPayment,
  getMyBookings,
  getBookingDetails,
  cancelBooking,
  getNotifications,
  getInsuranceInfo,
  getSupportInfo,
  getPolicies
} = require('../controllers/customerController');
const { verifyToken } = require('../middleware/auth');

// Public endpoints
router.get('/services', getServicesStatus);
router.get('/buses', getBuses);
router.get('/buses/:id', getBusDetails);
router.get('/ev-sewa', getEvSewa);
router.get('/ev-sewa/:id', getEvSewaDetails);
router.get('/cars', getCars);
router.get('/cars/:id', getCarDetails);
router.get('/support', getSupportInfo);
router.get('/policies', getPolicies);
const { getBusOffer } = require('../controllers/settingsController');
router.get('/bus-offer', getBusOffer);

// Protected customer endpoints
router.use(verifyToken);
router.get('/profile', getCustomerProfile);
router.put('/profile', updateCustomerProfile);
router.put('/account/login-id', changeUserLoginId);
router.put('/account/password', changeUserPassword);
router.post('/bookings', createBooking);
router.post('/payments/process', processPayment);
router.get('/my-bookings', getMyBookings);
router.get('/bookings/:id', getBookingDetails);
router.post('/bookings/:id/cancel', cancelBooking);
router.get('/notifications', getNotifications);
router.get('/insurance', getInsuranceInfo);

module.exports = router;
