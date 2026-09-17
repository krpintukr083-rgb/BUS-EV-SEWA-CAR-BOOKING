import api from './api';

export const driverService = {
  // Auth
  login: async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password, role: 'driver' });
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  // Dashboard
  getDashboard: async () => {
    const res = await api.get('/driver/dashboard');
    return res.data;
  },

  // Profile
  getProfile: async () => {
    const res = await api.get('/driver/profile');
    return res.data;
  },

  updateProfile: async profileData => {
    const res = await api.put('/driver/profile', profileData);
    return res.data;
  },

  // Assigned Vehicle
  getAssignedVehicle: async () => {
    const res = await api.get('/driver/vehicle');
    return res.data;
  },

  // Booking Requests
  getBookingRequests: async () => {
    const res = await api.get('/driver/booking-requests');
    return res.data;
  },

  acceptBookingRequest: async bookingId => {
    const res = await api.post(`/driver/booking-requests/${bookingId}/accept`);
    return res.data;
  },

  rejectBookingRequest: async bookingId => {
    const res = await api.post(`/driver/booking-requests/${bookingId}/reject`);
    return res.data;
  },

  // Collect Offline Cash from Passenger
  collectCash: async bookingId => {
    const res = await api.post(`/driver/bookings/${bookingId}/collect-cash`);
    return res.data;
  },

  // Booking History
  getBookingHistory: async () => {
    const res = await api.get('/driver/booking-history');
    return res.data;
  },

  // Earnings & Payment Records
  getEarnings: async () => {
    const res = await api.get('/driver/earnings');
    return res.data;
  },

  // Driver Documents
  getDocuments: async () => {
    const res = await api.get('/driver/documents');
    return res.data;
  },

  // Driver Status (Active / Inactive)
  updateStatus: async status => {
    const res = await api.put('/driver/status', { status });
    return res.data;
  },

  // Support
  getSupport: async () => {
    const res = await api.get('/driver/support');
    return res.data;
  }
};
