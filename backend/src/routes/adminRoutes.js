const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getCustomers,
  updateCustomerStatus,
  deleteCustomer,
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
  completeWithdrawalPayment,
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
const { verifyToken, adminAuth, superAdminOnly, requirePermission } = require('../middleware/auth');
const { handleSingleUpload, handleMultipleUpload } = require('../middleware/upload');
const {
  getPendingVehicles, getPendingSchedules, getAdminSchedules, approveVehicle, rejectVehicle,
  approveSchedule, rejectSchedule
} = require('../controllers/workflowController');
const {
  getSubAdmins, getSubAdminById, createSubAdmin, updateSubAdmin,
  updateSubAdminPermissions, updateSubAdminStatus, deleteSubAdmin,
  resetSubAdminPassword, getPermissionTemplates, getAuditLogs
} = require('../controllers/subAdminController');

// Protect all admin routes with JWT and admin role verification
router.use(verifyToken, adminAuth);

// ============================================================
// Sub-Admin Management (Super Admin Only)
// ============================================================
router.get('/subadmins/permission-templates', superAdminOnly, getPermissionTemplates);
router.get('/subadmins', superAdminOnly, getSubAdmins);
router.post('/subadmins', superAdminOnly, createSubAdmin);
router.get('/subadmins/:id', superAdminOnly, getSubAdminById);
router.patch('/subadmins/:id', superAdminOnly, updateSubAdmin);
router.patch('/subadmins/:id/permissions', superAdminOnly, updateSubAdminPermissions);
router.patch('/subadmins/:id/status', superAdminOnly, updateSubAdminStatus);
router.patch('/subadmins/:id/reset-password', superAdminOnly, resetSubAdminPassword);
router.delete('/subadmins/:id', superAdminOnly, deleteSubAdmin);

// Audit Logs (Super Admin only, Sub-Admin can view own logs with admin.view permission)
router.get('/audit-logs', requirePermission('admin.view'), getAuditLogs);

// 0. Dedicated Image Upload Endpoints
router.post('/upload/single', handleSingleUpload('image'), uploadSingleImage);
router.post('/upload/driver-photo', handleSingleUpload('driverPhoto'), uploadSingleImage);
router.post('/upload/multiple', handleMultipleUpload('images', 5), uploadMultipleImages);
router.post('/upload/vehicle-images', handleMultipleUpload('vehicleImages', 5), uploadMultipleImages);

// 1. Dashboard
router.get('/dashboard', getDashboardStats);

// 2. Customer Management
router.get('/customers', requirePermission('customer.view'), getCustomers);
router.put('/customers/:id/status', requirePermission('customer.block'), updateCustomerStatus);
router.delete('/customers/:id', requirePermission('customer.delete'), deleteCustomer);

// 3. Driver Management & Verification
router.get('/drivers', requirePermission('driver.view'), getDrivers);
router.post('/drivers', requirePermission('driver.create'), handleSingleUpload('driverPhoto'), addDriver);
router.put('/drivers/:id', requirePermission('driver.edit'), handleSingleUpload('driverPhoto'), updateDriver);
router.put('/drivers/:id/verify', requirePermission('driver.kyc'), verifyDriverDocuments);
router.patch('/drivers/:id/kyc/documents/:docType/approve', requirePermission('driver.approve'), (req, res, next) => {
  req.body.docType = req.params.docType;
  req.body.status = 'Approved';
  return verifyDriverDocuments(req, res, next);
});
router.patch('/drivers/:id/kyc/documents/:docType/reject', requirePermission('driver.reject'), (req, res, next) => {
  req.body.docType = req.params.docType;
  req.body.status = 'Rejected';
  return verifyDriverDocuments(req, res, next);
});
router.put('/drivers/:id/status', requirePermission('driver.suspend'), updateDriverStatus);

// 4. Vehicle Management
router.get('/vehicles', requirePermission('vehicle.view'), getVehicles);
router.post('/vehicles', requirePermission('vehicle.create'), handleMultipleUpload('vehicleImages', 5), addVehicle);
router.put('/vehicles/:id', requirePermission('vehicle.edit'), handleMultipleUpload('vehicleImages', 5), updateVehicle);
router.put('/vehicles/:id/status', requirePermission('vehicle.activate'), updateVehicleStatus);
router.delete('/vehicles/:id', requirePermission('vehicle.approve'), deleteVehicle);
router.get('/pending-vehicles', requirePermission('vehicle.approve'), getPendingVehicles);
router.get('/vehicles/pending', requirePermission('vehicle.approve'), getPendingVehicles);
router.patch('/vehicles/:id/approve', requirePermission('vehicle.approve'), approveVehicle);
router.patch('/vehicles/:id/reject', requirePermission('vehicle.reject'), rejectVehicle);
router.get('/pending-schedules', requirePermission('vehicle.approve'), getPendingSchedules);
router.get('/schedules/pending', requirePermission('vehicle.approve'), getPendingSchedules);
router.get('/schedules', requirePermission('vehicle.view'), getAdminSchedules);
router.patch('/schedules/:id/approve', requirePermission('vehicle.approve'), approveSchedule);
router.patch('/schedules/:id/reject', requirePermission('vehicle.reject'), rejectSchedule);
router.put('/vehicles/:id/hire-payment', requirePermission('payment.verify'), recordHirePayment);
router.get('/hire-expenses', requirePermission('payment.view'), getHireExpenses);

// 5. Specific Service Vehicles
router.get('/buses', requirePermission('vehicle.view'), getBuses);
router.get('/ev-sewa', requirePermission('vehicle.view'), getEvSewa);
router.get('/cars', requirePermission('vehicle.view'), getCars);

// 6. Driver Assignment
router.get('/driver-assignments', requirePermission('vehicle.assign_driver'), getDriverAssignments);
router.post('/driver-assignments', requirePermission('vehicle.assign_driver'), assignDriverToVehicle);

// 7. Documents & Compliance Records (rc, licence, insurance, fitness)
router.get('/records/:recordType', requirePermission('driver.kyc'), getDocumentRecords);

// 8. Booking Management
router.get('/bookings', requirePermission('booking.view'), getBookings);
router.post('/bookings/clear', superAdminOnly, clearBookingRequests);
router.delete('/bookings/clear', superAdminOnly, clearBookingRequests);
router.delete('/bookings/:id', requirePermission('booking.cancel'), deleteBooking);
router.post('/bookings/:id/confirm-otp', requirePermission('booking.status'), confirmBookingOtp);
router.post('/bookings/:id/confirm', requirePermission('booking.status'), confirmBookingOtp);
router.post('/bookings/:id/resend-otp', requirePermission('booking.status'), resendBookingOtp);
router.put('/bookings/:id/status', requirePermission('booking.status'), updateBookingStatus);

// 9. Payment Management
router.get('/payments', requirePermission('payment.view'), getPayments);
router.get('/withdrawals', requirePermission('withdrawal.view'), getWithdrawals);
router.patch('/withdrawals/:id/approve', requirePermission('withdrawal.approve'), approveWithdrawal);
router.patch('/withdrawals/:id/complete', requirePermission('withdrawal.approve'), completeWithdrawalPayment);
router.patch('/withdrawals/:id/reject', requirePermission('withdrawal.reject'), rejectWithdrawal);

// 10. Cancellation Management
router.get('/cancellations', requirePermission('cancellation.view'), getCancellations);
router.post('/cancellations/:id/refund', requirePermission('cancellation.refund'), processCancellationRefund);

// 11. 3% Compensation Management
router.get('/compensation', requirePermission('payment.view'), getCompensations);
router.put('/compensation/:id', requirePermission('payment.verify'), updateCompensationStatus);

// 12. Accident Insurance Records
router.get('/insurance', requirePermission('payment.view'), getInsuranceRecords);
router.put('/insurance/:id', requirePermission('payment.verify'), updateInsuranceClaimStatus);

// 13. Notifications
router.get('/notifications', requirePermission('notification.view'), getNotifications);
router.post('/notifications', requirePermission('notification.send'), createNotification);

// 14. Customer Support
router.get('/support', requirePermission('support.view'), getSupportTickets);
router.put('/support/:id', requirePermission('support.edit'), updateSupportTicket);
router.delete('/support/:id', requirePermission('support.delete'), deleteSupportTicket);

// 15. Terms and Policies
router.get('/policies', getPolicies);
router.put('/policies/:policyType', superAdminOnly, updatePolicy);

// 16. Basic Reports
router.get('/reports', requirePermission('report.view'), getBasicReports);

// 17. Service Control (Super Admin only — global settings)
router.get('/service-control', getServiceControl);
router.put('/service-control', superAdminOnly, updateServiceControl);

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
