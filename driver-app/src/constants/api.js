import { Platform } from 'react-native';

/**
 * Sanitizes and normalizes any server/API URL.
 * Guarantees:
 * - Proper protocol (https:// or http:// for local)
 * - No duplicate protocols (e.g. http://https://)
 * - Single /api suffix (no /api/api)
 * - No trailing slashes
 */
export const sanitizeApiUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();

  // Remove duplicate protocols
  url = url.replace(/^(https?:\/\/)+(https?:\/\/)+/i, '$2');

  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    const isLocal =
      url.includes('10.0.2.2') ||
      url.includes('localhost') ||
      url.includes('127.0.0.1') ||
      url.includes('192.168.');
    url = `${isLocal ? 'http://' : 'https://'}${url}`;
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // Ensure /api suffix without duplication
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }

  return url;
};

// Pure Production Render Cloud Backend API Endpoint (Client/Production Single Source of Truth)
export const PRODUCTION_RENDER_URL = 'https://bus-ev-sewa-car-booking.onrender.com';

/**
 * Resolves the primary production API Base URL
 */
export const getDefaultBaseUrl = () => {
  return 'https://bus-ev-sewa-car-booking.onrender.com/api';
};

/**
 * Single source of truth constant
 */
export const DRIVER_API_BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
export const API_BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

/**
 * Client Release APK candidate endpoints (Strictly ONLY Render Production API)
 */
export const CANDIDATE_URLS = ['https://bus-ev-sewa-car-booking.onrender.com/api'];

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
