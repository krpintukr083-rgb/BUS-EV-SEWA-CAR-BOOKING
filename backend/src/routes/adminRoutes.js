const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getCustomers,
  updateCustomerStatus,
  getDrivers,
  addDriver,
  updateDriver,
  verifyDriverDocuments,
  updateDriverStatus,
  getVehicles,
  addVehicle,
  updateVehicle,
  updateVehicleStatus,
  deleteVehicle,
  recordHirePayment,
  getHireExpenses,
  getBuses,
  getEvSewa,
  getCars,
  getDriverAssignments,
  assignDriverToVehicle,
  getDocumentRecords,
  getBookings,
  confirmBookingOtp,
  resendBookingOtp,
  updateBookingStatus,
  deleteBooking,
  clearBookingRequests,
  getPayments,
  getWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getCancellations,
  processCancellationRefund,
  getCompensations,
  updateCompensationStatus,
  getInsuranceRecords,
  updateInsuranceClaimStatus,
  getNotifications,
  createNotification,
  getSupportTickets,
  updateSupportTicket,
  deleteSupportTicket,
  getPolicies,
  updatePolicy,
  getBasicReports,
  getServiceControl,
  updateServiceControl,
  resetDemoDatabase,
  uploadSingleImage,
  uploadMultipleImages
} = require('../controllers/adminController');
const { verifyToken, adminAuth } = require('../middleware/auth');
const { handleSingleUpload, handleMultipleUpload } = require('../middleware/upload');
const {
  getPendingVehicles, getPendingSchedules, getAdminSchedules, approveVehicle, rejectVehicle,
  approveSchedule, rejectSchedule
} = require('../controllers/workflowController');

// Protect all admin routes with JWT and admin role verification
router.use(verifyToken, adminAuth);

// 0. Dedicated Image Upload Endpoints
router.post('/upload/single', handleSingleUpload('image'), uploadSingleImage);
router.post('/upload/driver-photo', handleSingleUpload('driverPhoto'), uploadSingleImage);
router.post('/upload/multiple', handleMultipleUpload('images', 5), uploadMultipleImages);
router.post('/upload/vehicle-images', handleMultipleUpload('vehicleImages', 5), uploadMultipleImages);

// 1. Dashboard
router.get('/dashboard', getDashboardStats);

// 2. Customer Management
router.get('/customers', getCustomers);
router.put('/customers/:id/status', updateCustomerStatus);

// 3. Driver Management & Verification
router.get('/drivers', getDrivers);
router.post('/drivers', handleSingleUpload('driverPhoto'), addDriver);
router.put('/drivers/:id', handleSingleUpload('driverPhoto'), updateDriver);
router.put('/drivers/:id/verify', verifyDriverDocuments);
router.patch('/drivers/:id/kyc/documents/:docType/approve', (req, res, next) => {
  req.body.docType = req.params.docType;
  req.body.status = 'Approved';
  return verifyDriverDocuments(req, res, next);
});
router.patch('/drivers/:id/kyc/documents/:docType/reject', (req, res, next) => {
  req.body.docType = req.params.docType;
  req.body.status = 'Rejected';
  return verifyDriverDocuments(req, res, next);
});
router.put('/drivers/:id/status', updateDriverStatus);

// 4. Vehicle Management
router.get('/vehicles', getVehicles);
router.post('/vehicles', handleMultipleUpload('vehicleImages', 5), addVehicle);
router.put('/vehicles/:id', handleMultipleUpload('vehicleImages', 5), updateVehicle);
router.put('/vehicles/:id/status', updateVehicleStatus);
router.delete('/vehicles/:id', deleteVehicle);
router.get('/pending-vehicles', getPendingVehicles);
router.get('/vehicles/pending', getPendingVehicles);
router.patch('/vehicles/:id/approve', approveVehicle);
router.patch('/vehicles/:id/reject', rejectVehicle);
router.get('/pending-schedules', getPendingSchedules);
router.get('/schedules/pending', getPendingSchedules);
router.get('/schedules', getAdminSchedules);
router.patch('/schedules/:id/approve', approveSchedule);
router.patch('/schedules/:id/reject', rejectSchedule);
router.put('/vehicles/:id/hire-payment', recordHirePayment);
router.get('/hire-expenses', getHireExpenses);

// 5. Specific Service Vehicles
router.get('/buses', getBuses);
router.get('/ev-sewa', getEvSewa);
router.get('/cars', getCars);

// 6. Driver Assignment
router.get('/driver-assignments', getDriverAssignments);
router.post('/driver-assignments', assignDriverToVehicle);

// 7. Documents & Compliance Records (rc, licence, insurance, fitness)
router.get('/records/:recordType', getDocumentRecords);

// 8. Booking Management
router.get('/bookings', getBookings);
router.post('/bookings/clear', clearBookingRequests);
router.delete('/bookings/clear', clearBookingRequests);
router.delete('/bookings/:id', deleteBooking);
router.post('/bookings/:id/confirm-otp', confirmBookingOtp);
router.post('/bookings/:id/confirm', confirmBookingOtp);
router.post('/bookings/:id/resend-otp', resendBookingOtp);
router.put('/bookings/:id/status', updateBookingStatus);

// 9. Payment Management
router.get('/payments', getPayments);
router.get('/withdrawals', getWithdrawals);
router.patch('/withdrawals/:id/approve', approveWithdrawal);
router.patch('/withdrawals/:id/reject', rejectWithdrawal);

// 10. Cancellation Management
router.get('/cancellations', getCancellations);
router.post('/cancellations/:id/refund', processCancellationRefund);

// 11. 3% Compensation Management
router.get('/compensation', getCompensations);
router.put('/compensation/:id', updateCompensationStatus);

// 12. Accident Insurance Records
router.get('/insurance', getInsuranceRecords);
router.put('/insurance/:id', updateInsuranceClaimStatus);

// 13. Notifications
router.get('/notifications', getNotifications);
router.post('/notifications', createNotification);

// 14. Customer Support
router.get('/support', getSupportTickets);
router.put('/support/:id', updateSupportTicket);
router.delete('/support/:id', deleteSupportTicket);

// 15. Terms and Policies
router.get('/policies', getPolicies);
router.put('/policies/:policyType', updatePolicy);

// 16. Basic Reports
router.get('/reports', getBasicReports);

// 17. Service Control
router.get('/service-control', getServiceControl);
router.put('/service-control', updateServiceControl);

// 18. Bus Offer / Discount Settings (UNTOUCHED)
const { getBusOffer, updateBusOffer } = require('../controllers/settingsController');
router.get('/bus-offer', getBusOffer);
router.put('/bus-offer', handleSingleUpload('image'), updateBusOffer);
router.get('/settings/bus-offer', getBusOffer);
router.put('/settings/bus-offer', handleSingleUpload('image'), updateBusOffer);

// 19. Multiple Promotional Banners Management
const { getBanners, createBanner, updateBanner, toggleBannerStatus, deleteBanner } = require('../controllers/bannerController');
router.get('/banners', getBanners);
router.post('/banners', handleSingleUpload('bannerImage'), createBanner);
router.put('/banners/:id', handleSingleUpload('bannerImage'), updateBanner);
router.patch('/banners/:id/status', toggleBannerStatus);
router.delete('/banners/:id', deleteBanner);

// 20. Reset Database to Clean Demo State
router.post('/reset-demo-db', resetDemoDatabase);

module.exports = router;
