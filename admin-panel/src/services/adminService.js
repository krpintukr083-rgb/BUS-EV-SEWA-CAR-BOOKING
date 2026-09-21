import api from './api';

export const adminService = {
  // Auth
  login: async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password, role: 'admin' });
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  // 0. Image Uploads (Multer multipart/form-data)
  uploadSingleImage: async (file, fieldName = 'image') => {
    const formData = new FormData();
    formData.append(fieldName, file);
    const res = await api.post('/admin/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  uploadDriverPhoto: async file => {
    const formData = new FormData();
    formData.append('driverPhoto', file);
    const res = await api.post('/admin/upload/driver-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  uploadMultipleImages: async (files, fieldName = 'images') => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append(fieldName, file);
    });
    const res = await api.post('/admin/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  uploadVehicleImages: async files => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('vehicleImages', file);
    });
    const res = await api.post('/admin/upload/vehicle-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  // 1. Dashboard
  getDashboard: async () => {
    const res = await api.get('/admin/dashboard');
    return res.data;
  },

  // 2. Customer Management
  getCustomers: async () => {
    const res = await api.get('/admin/customers');
    return res.data;
  },

  updateCustomerStatus: async (id, status) => {
    const res = await api.put(`/admin/customers/${id}/status`, { status });
    return res.data;
  },

  // 3. Driver Management & Verification
  getDrivers: async () => {
    const res = await api.get('/admin/drivers');
    return res.data;
  },

  addDriver: async driverData => {
    const res = await api.post('/admin/drivers', driverData);
    return res.data;
  },

  updateDriver: async (id, driverData) => {
    const res = await api.put(`/admin/drivers/${id}`, driverData);
    return res.data;
  },

  verifyDriverDocuments: async (id, verificationData) => {
    const res = await api.put(`/admin/drivers/${id}/verify`, verificationData);
    return res.data;
  },

  updateDriverStatus: async (id, status) => {
    const res = await api.put(`/admin/drivers/${id}/status`, { status });
    return res.data;
  },

  // 4. Vehicle Management (Bus, EV-Sewa, Car, Truck & Market Hire)
  getVehicles: async (type, source) => {
    const res = await api.get('/admin/vehicles', { params: { type, source } });
    return res.data;
  },

  addVehicle: async vehicleData => {
    const res = await api.post('/admin/vehicles', vehicleData);
    return res.data;
  },

  updateVehicle: async (id, vehicleData) => {
    const res = await api.put(`/admin/vehicles/${id}`, vehicleData);
    return res.data;
  },

  updateVehicleStatus: async (id, status) => {
    const res = await api.put(`/admin/vehicles/${id}/status`, { status });
    return res.data;
  },

  recordHirePayment: async (id, paymentData) => {
    const res = await api.put(`/admin/vehicles/${id}/hire-payment`, paymentData);
    return res.data;
  },

  getHireExpenses: async () => {
    const res = await api.get('/admin/hire-expenses');
    return res.data;
  },

  // 5. Specific Service Vehicles
  getBuses: async () => {
    const res = await api.get('/admin/buses');
    return res.data;
  },

  getEvSewa: async () => {
    const res = await api.get('/admin/ev-sewa');
    return res.data;
  },

  getCars: async () => {
    const res = await api.get('/admin/cars');
    return res.data;
  },

  // 6. Driver Assignment
  getDriverAssignments: async () => {
    const res = await api.get('/admin/driver-assignments');
    return res.data;
  },

  assignDriverToVehicle: async (vehicleId, driverId) => {
    const res = await api.post('/admin/driver-assignments', { vehicleId, driverId });
    return res.data;
  },

  // 7. Compliance & Document Records (rc, licence, insurance, fitness)
  getDocumentRecords: async recordType => {
    const res = await api.get(`/admin/records/${recordType}`);
    return res.data;
  },

  // 8. Booking Management
  getBookings: async (serviceType, status) => {
    const res = await api.get('/admin/bookings', { params: { serviceType, status } });
    return res.data;
  },

  confirmBookingOtp: async (id, otp) => {
    const res = await api.post(`/admin/bookings/${id}/confirm-otp`, { otp });
    return res.data;
  },

  resendBookingOtp: async id => {
    const res = await api.post(`/admin/bookings/${id}/resend-otp`);
    return res.data;
  },

  updateBookingStatus: async (id, bookingStatus, paymentStatus) => {
    const res = await api.put(`/admin/bookings/${id}/status`, { bookingStatus, paymentStatus });
    return res.data;
  },

  // 9. Payment Management
  getPayments: async () => {
    const res = await api.get('/admin/payments');
    return res.data;
  },

  // 10. Cancellation Management
  getCancellations: async () => {
    const res = await api.get('/admin/cancellations');
    return res.data;
  },

  processCancellationRefund: async id => {
    const res = await api.post(`/admin/cancellations/${id}/refund`);
    return res.data;
  },

  // 11. 3% Compensation Management (Feature Removed)
  getCompensations: async () => {
    return { success: true, count: 0, data: [] };
  },

  updateCompensationStatus: async () => {
    return { success: true, message: 'Feature disabled' };
  },

  // 12. Accident Insurance Records
  getInsuranceRecords: async () => {
    const res = await api.get('/admin/insurance');
    return res.data;
  },

  updateInsuranceClaim: async (id, data) => {
    const res = await api.put(`/admin/insurance/${id}`, data);
    return res.data;
  },

  // 13. Notifications
  getNotifications: async () => {
    const res = await api.get('/admin/notifications');
    return res.data;
  },

  createNotification: async notifData => {
    const res = await api.post('/admin/notifications', notifData);
    return res.data;
  },

  // 14. Support Tickets
  getSupportTickets: async () => {
    const res = await api.get('/admin/support');
    return res.data;
  },

  updateSupportTicket: async (id, data) => {
    const res = await api.put(`/admin/support/${id}`, data);
    return res.data;
  },

  // 15. Terms & Policies
  getPolicies: async () => {
    const res = await api.get('/admin/policies');
    return res.data;
  },

  updatePolicy: async (policyType, data) => {
    const res = await api.put(`/admin/policies/${policyType}`, data);
    return res.data;
  },

  // 16. Basic Reports
  getBasicReports: async () => {
    const res = await api.get('/admin/reports');
    return res.data;
  },

  // 17. Service Control
  getServiceControl: async () => {
    const res = await api.get('/admin/service-control');
    return res.data;
  },

  updateServiceControl: async data => {
    const res = await api.put('/admin/service-control', data);
    return res.data;
  },

  // 18. Bus Discount & Promotional Offer Configuration
  getBusOffer: async () => {
    const res = await api.get('/settings/bus-offer');
    return res.data;
  },

  updateBusOffer: async data => {
    const res = await api.put('/settings/bus-offer', data);
    return res.data;
  }
};

