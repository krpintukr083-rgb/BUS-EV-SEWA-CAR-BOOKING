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
  recordHirePayment,
  getHireExpenses,
  getBuses,
  getEvSewa,
  getCars,
  getDriverAssignments,
  assignDriverToVehicle,
  getDocumentRecords,
  getBookings,
  updateBookingStatus,
  getPayments,
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
  getPolicies,
  updatePolicy,
  getBasicReports,
  getServiceControl,
  updateServiceControl,
  uploadSingleImage,
  uploadMultipleImages
} = require('../controllers/adminController');
const { verifyToken, adminAuth } = require('../middleware/auth');
const { handleSingleUpload, handleMultipleUpload } = require('../middleware/upload');

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
router.put('/bookings/:id/status', updateBookingStatus);

// 9. Payment Management
router.get('/payments', getPayments);

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

// 15. Terms and Policies
router.get('/policies', getPolicies);
router.put('/policies/:policyType', updatePolicy);

// 16. Basic Reports
router.get('/reports', getBasicReports);

// 17. Service Control
router.get('/service-control', getServiceControl);
router.put('/service-control', updateServiceControl);

module.exports = router;
