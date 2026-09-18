import { Platform } from 'react-native';

// 1. Live Production / HTTPS Public Tunnel URL (Render Live Backend):
export const BACKEND_TUNNEL_URL = 'https://bus-ev-sewa-car-booking.onrender.com';

// 2. Local Wi-Fi LAN IP fallback:
export const BACKEND_LAN_URL = 'http://192.168.1.2:5000';

// 3. Android Emulator loopback alias:
export const EMULATOR_URL = 'http://10.0.2.2:5000';

/**
 * Computes default static Base URL based on constants and platform
 */
export const getDefaultBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim() !== '') {
    const clean = process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  if (Platform.OS === 'android') {
    return `${EMULATOR_URL}/api`;
  }

  if (BACKEND_TUNNEL_URL && BACKEND_TUNNEL_URL.trim() !== '') {
    const clean = BACKEND_TUNNEL_URL.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  return 'http://localhost:5000/api';
};

/**
 * Candidate URLs for connectivity fallback
 */
export const CANDIDATE_URLS = [
  BACKEND_TUNNEL_URL ? (BACKEND_TUNNEL_URL.endsWith('/api') ? BACKEND_TUNNEL_URL : `${BACKEND_TUNNEL_URL}/api`) : null,
  Platform.OS === 'android' ? `${EMULATOR_URL}/api` : null,
  BACKEND_LAN_URL ? (BACKEND_LAN_URL.endsWith('/api') ? BACKEND_LAN_URL : `${BACKEND_LAN_URL}/api`) : null,
  'http://localhost:5000/api'
].filter(Boolean);

export const API_BASE_URL = getDefaultBaseUrl();

export const ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/driver-register',
  SEND_OTP: '/auth/send-otp',
  VERIFY_OTP: '/auth/verify-otp',

  // Dashboard & Profile
  DASHBOARD: '/driver/dashboard',
  PROFILE: '/driver/profile',
  STATUS: '/driver/status',
  TOGGLE_STATUS: '/driver/status',
  DOCUMENTS: '/driver/documents',
  VEHICLE: '/driver/vehicle',
  LANGUAGE: '/driver/language',

  // Booking Requests & Ride Lifecycle
  BOOKING_REQUESTS: '/driver/booking-requests',
  ACCEPT_RIDE: (id) => `/driver/rides/${id}/accept`,
  REJECT_RIDE: (id) => `/driver/booking-requests/${id}/reject`,
  ARRIVED: (id) => `/driver/rides/${id}/arrived`,
  VERIFY_RIDE_OTP: (id) => `/driver/rides/${id}/verify-otp`,
  START_RIDE: (id) => `/driver/rides/${id}/start`,
  END_RIDE: (id) => `/driver/rides/${id}/end`,
  CANCEL_RIDE: (id) => `/driver/rides/${id}/cancel`,
  COLLECT_CASH: (id) => `/driver/bookings/${id}/collect-cash`,

  // Earnings & Wallet
  EARNINGS: '/driver/earnings',
  WALLET: '/driver/wallet',
  WITHDRAW: '/driver/withdraw',
  INCENTIVES: '/driver/incentives',
  HISTORY: '/driver/booking-history',

  // EV & Emergency (Zero-GPS)
  EV_HUB: '/driver/ev-hub',
  EV_BATTERY: '/driver/ev-battery',
  SOS: '/driver/sos',

  // Support & Notifications
  NOTIFICATIONS: '/driver/notifications',
  SUPPORT: '/driver/support',
  SUPPORT_TICKET: '/driver/support/ticket'
};
