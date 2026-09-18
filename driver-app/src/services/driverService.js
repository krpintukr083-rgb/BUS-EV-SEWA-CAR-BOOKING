import apiClient from './api';
import { ENDPOINTS } from '../constants/api';

export const driverService = {
  // Auth
  login: (credentials) => apiClient.post(ENDPOINTS.LOGIN, { ...credentials, role: 'driver' }),
  register: (data) => apiClient.post(ENDPOINTS.REGISTER, data),

  // Dashboard & Status
  getDashboard: () => apiClient.get(ENDPOINTS.DASHBOARD),
  getProfile: () => apiClient.get(ENDPOINTS.PROFILE),
  updateProfile: (data) => apiClient.put(ENDPOINTS.PROFILE, data),
  getStatus: () => apiClient.get(ENDPOINTS.STATUS),
  toggleStatus: (isOnline) => apiClient.put(ENDPOINTS.STATUS, { isOnline }),

  // Documents & Vehicle
  getDocuments: () => apiClient.get(ENDPOINTS.DOCUMENTS),
  uploadDocument: (docData) => apiClient.post(ENDPOINTS.DOCUMENTS, docData),
  getVehicle: () => apiClient.get(ENDPOINTS.VEHICLE),

  // Booking Requests & Ride Lifecycle
  getBookingRequests: () => apiClient.get(ENDPOINTS.BOOKING_REQUESTS),
  acceptRide: (id) => apiClient.post(`/driver/booking-requests/${id}/accept`),
  rejectRide: (id, reason) => apiClient.post(`/driver/booking-requests/${id}/reject`, { reason }),
  arriveAtPickup: (id) => apiClient.post(`/driver/rides/${id}/arrived`),
  verifyOtp: (id, otp) => apiClient.post(`/driver/rides/${id}/verify-otp`, { otp }),
  startRide: (id) => apiClient.post(`/driver/rides/${id}/start`),
  endRide: (id, tripDetails) => apiClient.post(`/driver/rides/${id}/end`, tripDetails),
  cancelRide: (id, reason) => apiClient.post(`/driver/rides/${id}/cancel`, { reason }),

  // Cash Collection
  collectCash: (id, amount) => apiClient.post(`/driver/bookings/${id}/collect-cash`, { amountCollected: amount }),

  // Earnings, Wallet & Withdrawals
  getEarnings: () => apiClient.get(ENDPOINTS.EARNINGS),
  getWallet: () => apiClient.get(ENDPOINTS.WALLET),
  requestWithdrawal: (data) => apiClient.post(ENDPOINTS.WITHDRAW, data),
  getIncentives: () => apiClient.get(ENDPOINTS.INCENTIVES),
  getHistory: () => apiClient.get(ENDPOINTS.HISTORY),

  // EV & Safety
  getEVHub: () => apiClient.get(ENDPOINTS.EV_HUB),
  updateEVBattery: (batteryPercentage) => apiClient.put(ENDPOINTS.EV_BATTERY, { batteryPercentage }),
  triggerSOS: (data) => apiClient.post(ENDPOINTS.SOS, data),

  // Notifications & Support
  getNotifications: () => apiClient.get(ENDPOINTS.NOTIFICATIONS),
  getSupport: () => apiClient.get(ENDPOINTS.SUPPORT),
  createTicket: (ticket) => apiClient.post(ENDPOINTS.SUPPORT_TICKET, ticket),
  updateLanguage: (language) => apiClient.put(ENDPOINTS.LANGUAGE, { language })
};
