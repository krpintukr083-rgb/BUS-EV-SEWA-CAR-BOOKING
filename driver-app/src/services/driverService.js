import apiClient from './api';
import { ENDPOINTS } from '../constants/api';

export const driverService = {
  // Auth
  login: (credentials) => apiClient.post(ENDPOINTS.LOGIN, { ...credentials, role: 'driver' }),
  sendLoginOtp: (phone) => apiClient.post('/driver/auth/send-otp', { phone }),
  verifyLoginOtp: (phone, otp) => apiClient.post('/driver/auth/verify-otp', { phone, otp }),
  sendPasswordResetOtp: (phone) => apiClient.post('/driver/auth/password-reset/send-otp', { phone }),
  verifyPasswordResetOtp: (phone, otp) => apiClient.post('/driver/auth/password-reset/verify-otp', { phone, otp }),
  resetPassword: (phone, newPassword) => apiClient.post('/driver/auth/password-reset/set-password', { phone, newPassword }),
  register: (data) => apiClient.post(ENDPOINTS.REGISTER, data),
  registerPushToken: (data) => apiClient.post('/driver/push-token', data),

  // Dashboard & Status
  getDashboard: () => apiClient.get(ENDPOINTS.DASHBOARD),
  getProfile: () => apiClient.get(ENDPOINTS.PROFILE),
  updateProfile: (data) => apiClient.put(ENDPOINTS.PROFILE, data),
  uploadProfilePhoto: (formData) => apiClient.put(ENDPOINTS.PROFILE, formData, {
    transformRequest: (data) => data
  }),
  changeLoginId: (newLoginId, loginType) => apiClient.put('/driver/account/login-id', { newLoginId, loginType }),
  changePassword: (currentPassword, newPassword, confirmNewPassword) => apiClient.put('/driver/account/password', { currentPassword, newPassword, confirmNewPassword }),
  getStatus: () => apiClient.get(ENDPOINTS.STATUS),
  toggleStatus: (isOnline) => apiClient.put(ENDPOINTS.STATUS, { isOnline }),

  // Documents & Vehicle
  getDocuments: () => apiClient.get(ENDPOINTS.DOCUMENTS),
  uploadDocument: (docData) => {
    if (typeof FormData !== 'undefined' && docData instanceof FormData) {
      return apiClient.post(ENDPOINTS.DOCUMENTS, docData, {
        transformRequest: (data) => data,
      });
    }
    return apiClient.post(ENDPOINTS.DOCUMENTS, docData);
  },
  getVehicle: (vehicleId) => apiClient.get(ENDPOINTS.VEHICLE, {
    params: vehicleId ? { vehicleId } : undefined
  }),
  registerVehicle: (data) => apiClient.post('/driver/vehicles', data),
  getMyVehicles: () => apiClient.get('/driver/vehicles'),
  removeVehicle: (vehicleId) => apiClient.delete(`/driver/vehicles/${vehicleId}`),
  updateVehicleEVDetails: (vehicleId, batteryPercentage, estimatedRangeKm) =>
    apiClient.put(`/driver/vehicles/${vehicleId}/ev-details`, { batteryPercentage, estimatedRangeKm }),
  updateRouteStatus: (vehicleId, routeActive) =>
    apiClient.patch(`/driver/vehicles/${vehicleId}/route-status`, { routeActive }),
  createSchedule: (data) => apiClient.post('/driver/schedules', data),
  getMySchedules: () => apiClient.get('/driver/schedules'),
  removeSchedule: (scheduleId) => apiClient.delete(`/driver/schedules/${scheduleId}`),
  uploadVehicleImages: (formData) => apiClient.post('/driver/vehicle-images', formData, { transformRequest: (data) => data }),
  updateVehicleFare: (fareRate, vehicleId, route, travelDate, departureTime, arrivalTime) => apiClient.put('/driver/vehicle/fare', {
    fare: Number(fareRate),
    fareRate: Number(fareRate),
    vehicleId,
    ...(route ? { route } : {}),
    ...(travelDate ? { travelDate } : {}),
    ...(departureTime ? { departureTime } : {}),
    ...(arrivalTime ? { arrivalTime } : {})
  }),
  updateOperatingRoute: (vehicleId, routeData) => apiClient.put('/driver/vehicle/operating-route', { vehicleId, ...routeData }),

  // Booking Requests & Ride Lifecycle
  getBookingRequests: () => apiClient.get(ENDPOINTS.BOOKING_REQUESTS, { params: { _t: Date.now() } }),
  // Active bookings for driver: accepted/OTP-pending/ongoing (used by BusConfirmationScreen)
  getActiveBookings: () => apiClient.get('/driver/active-bookings', { params: { _t: Date.now() } }),
  // Legacy alias — kept for backwards compat but now points to active-bookings
  getAssignedBookings: () => apiClient.get('/driver/active-bookings', { params: { _t: Date.now() } }),
  getActiveRide: async () => {
    try {
      const res = await apiClient.get(ENDPOINTS.DASHBOARD);
      const activeRide = res.data?.data?.activeRide || null;
      return {
        success: Boolean(activeRide),
        data: activeRide
      };
    } catch (e) {
      return { success: false, data: null };
    }
  },
  getBookingDetails: async (bookingId) => {
    try {
      if (!bookingId) {
        return driverService.getActiveRide();
      }
      const dashRes = await apiClient.get(ENDPOINTS.DASHBOARD);
      const activeRide = dashRes.data?.data?.activeRide;
      if (
        activeRide &&
        (String(activeRide._id) === String(bookingId) ||
         String(activeRide.bookingId) === String(bookingId) ||
         String(activeRide.id) === String(bookingId))
      ) {
        return { success: true, data: activeRide };
      }
      const activeRes = await apiClient.get('/driver/active-bookings', { params: { _t: Date.now() } });
      const bookings = activeRes.data?.data || [];
      const match = bookings.find(
        (b) =>
          String(b._id) === String(bookingId) ||
          String(b.bookingId) === String(bookingId) ||
          String(b.id) === String(bookingId)
      );
      if (match) {
        return { success: true, data: match };
      }
      if (activeRide) {
        return { success: true, data: activeRide };
      }
      return { success: false, data: null };
    } catch (e) {
      return { success: false, data: null };
    }
  },
  acceptRide: (id) => apiClient.post(`/driver/booking-requests/${id}/accept`),
  rejectRide: (id, reason) => apiClient.post(`/driver/booking-requests/${id}/reject`, { reason }),
  // Bus-specific aliases used by BusConfirmationScreen
  confirmBusBooking: (id) => apiClient.post(`/driver/booking-requests/${id}/accept`),
  rejectBusBooking: (id, reason) => apiClient.post(`/driver/booking-requests/${id}/reject`, { reason }),
  arriveAtPickup: (id) => apiClient.post(`/driver/rides/${id}/arrived`),
  updateRideStatus: async (id, status) => {
    if (status === 'Driver Arrived' || status === 'ARRIVED') {
      const res = await apiClient.post(`/driver/rides/${id}/arrived`);
      return res.data || { success: true };
    }
    const res = await apiClient.post(`/driver/rides/${id}/start`);
    return res.data || { success: true };
  },
  verifyOtp: (id, otp) => apiClient.post(`/driver/rides/${id}/verify-otp`, { otp }),
  verifyBookingOtp: (id, otp) => apiClient.post(`/driver/bookings/${id}/verify-otp`, { otp }),
  verifyRideOTP: async (id, otp) => {
    const res = await apiClient.post(`/driver/rides/${id}/verify-otp`, { otp });
    return res.data || { success: true };
  },
  startRide: (id) => apiClient.post(`/driver/rides/${id}/start`),
  endRide: (id, tripDetails) => apiClient.post(`/driver/rides/${id}/end`, tripDetails),
  completeRide: (id, tripDetails) => apiClient.post(`/driver/rides/${id}/complete`, tripDetails),
  reachDestination: async (id, tripDetails) => {
    const res = await apiClient.post(`/driver/rides/${id}/complete`, tripDetails);
    return res.data || { success: true };
  },
  cancelRide: (id, reason) => apiClient.post(`/driver/rides/${id}/cancel`, { reason }),

  // Cash Collection
  collectCash: (id, amount) => apiClient.post(`/driver/bookings/${id}/collect-cash`, { amountCollected: amount }),
  // Alias used by BusConfirmationScreen
  collectCashPayment: (id) => apiClient.post(`/driver/bookings/${id}/collect-cash`, { amountCollected: 0 }),

  // Earnings, Wallet & Withdrawals
  getEarnings: () => apiClient.get(ENDPOINTS.EARNINGS),
  getWallet: () => apiClient.get(ENDPOINTS.WALLET),
  requestWithdrawal: (data) => apiClient.post(ENDPOINTS.WITHDRAW, data),
  getIncentives: () => apiClient.get(ENDPOINTS.INCENTIVES),
  getHistory: () => apiClient.get(ENDPOINTS.HISTORY),
  getRideHistory: () => apiClient.get(ENDPOINTS.HISTORY),

  // EV & Safety
  getEVHub: () => apiClient.get(ENDPOINTS.EV_HUB),
  updateEVBattery: (batteryPercentage) => apiClient.put(ENDPOINTS.EV_BATTERY, { batteryPercentage }),
  triggerSOS: (data) => apiClient.post(ENDPOINTS.SOS, data),

  // Notifications & Support
  getNotifications: () => apiClient.get(ENDPOINTS.NOTIFICATIONS),
  registerPushToken: (payload) => {
    if (typeof payload === 'string') {
      return apiClient.post('/driver/push-token', { pushToken: payload });
    }
    return apiClient.post('/driver/push-token', payload);
  },
  getSupport: () => apiClient.get(ENDPOINTS.SUPPORT),
  createTicket: (ticket) => apiClient.post(ENDPOINTS.SUPPORT_TICKET, ticket),
  submitSupportTicket: (ticket) => apiClient.post(ENDPOINTS.SUPPORT_TICKET, ticket),
  updateLanguage: (language) => apiClient.put(ENDPOINTS.LANGUAGE, { language })
};

export default driverService;
