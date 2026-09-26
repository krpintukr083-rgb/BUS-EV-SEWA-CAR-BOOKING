import api from './api';

export const customerService = {
  // Auth
  login: async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password, role: 'customer' });
    return res.data;
  },

  register: async userData => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  // Customer Profile
  getProfile: async () => {
    const res = await api.get('/customer/profile');
    return res.data;
  },

  updateProfile: async profileData => {
    const res = await api.put('/customer/profile', profileData);
    return res.data;
  },

  changeLoginId: async (newLoginId, loginType) => {
    const res = await api.put('/customer/account/login-id', { newLoginId, loginType });
    return res.data;
  },

  changePassword: async (currentPassword, newPassword, confirmNewPassword) => {
    const res = await api.put('/customer/account/password', { currentPassword, newPassword, confirmNewPassword });
    return res.data;
  },

  // Service Control Availability
  getServicesStatus: async () => {
    const res = await api.get('/customer/services');
    return res.data;
  },

  // Vehicles (Bus, EV-Sewa, Car)
  getVehicles: async (type, from, to) => {
    const res = await api.get('/vehicles', { params: { type, from, to } });
    return res.data;
  },

  getVehicleDetails: async (id, travelDate) => {
    const params = travelDate ? { travelDate } : {};
    const res = await api.get(`/vehicles/${id}`, { params });
    return res.data;
  },
  getSchedules: async (from, to, travelDate) => {
    const res = await api.get('/schedules', { params: { from, to, travelDate } });
    return res.data;
  },

  // Bus Services
  getBuses: async (from, to) => {
    const res = await api.get('/vehicles', { params: { type: 'bus', from, to } });
    return res.data;
  },

  // Bus Promotional Offer Configuration (Dynamic Discount % — UNTOUCHED)
  getBusOffer: async () => {
    const res = await api.get('/settings/bus-offer');
    return res.data;
  },

  // Active Multi-Banners for Customer App Carousel
  getBanners: async () => {
    const res = await api.get('/banners/active');
    return res.data;
  },

  // getBusDetails accepts optional travelDate — backend filters booked seats for that date only
  getBusDetails: async (id, travelDate) => {
    const params = travelDate ? { travelDate } : {};
    const res = await api.get(`/vehicles/${id}`, { params });
    return res.data;
  },

  // EV-Sewa Services
  getEvSewa: async () => {
    const res = await api.get('/customer/ev-sewa');
    return res.data;
  },

  getEvSewaDetails: async id => {
    const res = await api.get(`/vehicles/${id}`);
    return res.data;
  },

  // Car Services
  getCars: async () => {
    const res = await api.get('/customer/cars');
    return res.data;
  },

  getCarDetails: async id => {
    const res = await api.get(`/vehicles/${id}`);
    return res.data;
  },

  // Truck / Market Hired Services
  getTrucks: async (from, to) => {
    const res = await api.get('/vehicles', { params: { type: 'truck', from, to } });
    return res.data;
  },

  getTruckDetails: async id => {
    const res = await api.get(`/vehicles/${id}`);
    return res.data;
  },

  // Bookings
  createBooking: async bookingData => {
    const res = await api.post('/bookings', bookingData);
    return res.data;
  },

  getInstantBookingAvailability: async availability => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const token = await AsyncStorage.getItem('customer_token');
    const res = await api.post('/bookings/instant/availability', availability, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined
      }
    });
    return res.data;
  },

  confirmOfflineCashBooking: async bookingId => {
    const res = await api.post(`/bookings/${bookingId}/offline-cash`);
    return res.data;
  },

  getMyBookings: async () => {
    const res = await api.get('/bookings');
    return res.data;
  },

  getBookingDetails: async bookingId => {
    const res = await api.get(`/bookings/${bookingId}`);
    return res.data;
  },

  cancelBooking: async (bookingId, cancellationReason) => {
    const res = await api.post(`/bookings/${bookingId}/cancel`, { cancellationReason });
    return res.data;
  },

  // Razorpay Test Mode Payment Pipeline
  createRazorpayOrder: async (bookingId) => {
    const res = await api.post('/payments/razorpay/create-order', { bookingId });
    return res.data;
  },

  verifyRazorpayPayment: async ({ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
    const res = await api.post('/payments/razorpay/verify-payment', {
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });
    return res.data;
  },

  recordRazorpayFailure: async ({ bookingId, razorpayOrderId, error }) => {
    const res = await api.post('/payments/razorpay/record-failure', {
      bookingId,
      razorpayOrderId,
      error
    });
    return res.data;
  },

  processRazorpayTestPay: async ({ bookingId, razorpayOrderId, status, method }) => {
    const res = await api.post('/payments/razorpay/test-pay', {
      bookingId,
      razorpayOrderId,
      status,
      method
    });
    return res.data;
  },

  // Payment Test Sandbox (Backward Compatibility)
  createPaymentSession: async (bookingId, paymentMethod) => {
    const res = await api.post('/payments/create', { bookingId, paymentMethod });
    return res.data;
  },

  testPaymentSuccess: async (bookingId, paymentMethod) => {
    const res = await api.post('/payments/test-success', { bookingId, paymentMethod });
    return res.data;
  },

  testPaymentFailure: async (bookingId, failureReason) => {
    const res = await api.post('/payments/test-failure', { bookingId, failureReason });
    return res.data;
  },

  getPaymentForBooking: async bookingId => {
    const res = await api.get(`/payments/${bookingId}`);
    return res.data;
  },

  // Notifications
  getNotifications: async () => {
    const res = await api.get('/notifications');
    return res.data;
  },

  // Insurance
  getInsuranceInfo: async (bookingId = null) => {
    if (bookingId) {
      const res = await api.get(`/insurance/${bookingId}`);
      return res.data;
    }
    const res = await api.get('/insurance');
    return res.data;
  },

  // Support
  getSupportInfo: async () => {
    const res = await api.get('/support');
    return res.data;
  },

  submitSupportTicket: async ticketData => {
    const res = await api.post('/support', ticketData);
    return res.data;
  },

  // Policies
  getPolicies: async () => {
    const res = await api.get('/policies');
    return res.data;
  },

  getPolicyByType: async policyType => {
    const res = await api.get(`/policies/${policyType}`);
    return res.data;
  }
};
