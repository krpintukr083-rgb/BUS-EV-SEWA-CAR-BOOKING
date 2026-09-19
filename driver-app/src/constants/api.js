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

// 1. Primary Public HTTPS Cloudflare Tunnel URL:
export const CLOUDFLARE_TUNNEL_URL = 'https://archived-updating-louisiana-program.trycloudflare.com';

// 2. Production Render Cloud Backend:
export const PRODUCTION_RENDER_URL = 'https://bus-ev-sewa-car-booking.onrender.com';

// 3. Local Wi-Fi LAN IP (Development only):
export const BACKEND_LAN_URL = 'http://192.168.1.2:5000';

// 4. Android Emulator loopback alias (Development only):
export const EMULATOR_URL = 'http://10.0.2.2:5000';

/**
 * Resolves the primary default API Base URL:
 * 1. EXPO_PUBLIC_API_BASE_URL from .env if present
 * 2. Public Cloudflare Tunnel HTTPS URL
 * 3. Render Production HTTPS URL
 */
export const getDefaultBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL && process.env.EXPO_PUBLIC_API_BASE_URL.trim() !== '') {
    return sanitizeApiUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  }

  // Prioritize active reverse tunnel / LAN API for direct real device debugging
  return 'http://127.0.0.1:5000/api';
};

/**
 * Single source of truth constant
 */
export const DRIVER_API_BASE_URL = getDefaultBaseUrl();
export const API_BASE_URL = DRIVER_API_BASE_URL;

/**
 * Candidate URLs for automatic connectivity fallback (tested sequentially if primary fails)
 */
export const CANDIDATE_URLS = [
  getDefaultBaseUrl(),
  sanitizeApiUrl(CLOUDFLARE_TUNNEL_URL),
  sanitizeApiUrl(PRODUCTION_RENDER_URL),
  sanitizeApiUrl(BACKEND_LAN_URL),
  sanitizeApiUrl(EMULATOR_URL),
  'http://localhost:5000/api'
].filter((url, index, self) => url && self.indexOf(url) === index);

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
