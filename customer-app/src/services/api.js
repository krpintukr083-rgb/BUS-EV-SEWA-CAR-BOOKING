import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * BACKEND API BASE URL CONFIGURATION
 * 
 * Works seamlessly across:
 * - 4G / 5G Cellular Mobile Data
 * - Real Physical Android / iOS Phones
 * - Any Wi-Fi Network & Hotspots
 * - Android Emulators
 */

// 1. Production / HTTPS Public Tunnel URL (Render Live Backend):
export const BACKEND_TUNNEL_URL = 'https://bus-ev-sewa-car-booking.onrender.com';

// 2. Computer's LAN IP address when phone and PC are on the same Wi-Fi:
export const BACKEND_LAN_URL = 'http://192.168.1.2:5000';

// 3. Android Emulator loopback alias:
export const EMULATOR_URL = 'http://10.0.2.2:5000';

/**
 * Computes default static URL based on hardcoded constants and platform
 */
export const getDefaultBaseUrl = () => {
  // If Render tunnel URL is provided, use it as default across all devices (Physical phones, 4G/5G, Wi-Fi, and Emulators)
  if (BACKEND_TUNNEL_URL && BACKEND_TUNNEL_URL.trim() !== '') {
    const clean = BACKEND_TUNNEL_URL.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  if (Platform.OS === 'android') {
    return `${EMULATOR_URL}/api`;
  }

  if (BACKEND_LAN_URL && BACKEND_LAN_URL.trim() !== '') {
    const clean = BACKEND_LAN_URL.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  return 'http://localhost:5000/api';
};

/**
 * Candidate URLs for connectivity fallback
 */
export const CANDIDATE_URLS = [
  BACKEND_TUNNEL_URL ? (BACKEND_TUNNEL_URL.endsWith('/api') ? BACKEND_TUNNEL_URL : `${BACKEND_TUNNEL_URL}/api`) : null,
  BACKEND_LAN_URL ? (BACKEND_LAN_URL.endsWith('/api') ? BACKEND_LAN_URL : `${BACKEND_LAN_URL}/api`) : null,
  Platform.OS === 'android' ? `${EMULATOR_URL}/api` : 'http://localhost:5000/api'
].filter(Boolean);

/**
 * Retrieves the actively saved custom server URL from storage
 */
export const getCustomServerUrl = async () => {
  try {
    const saved = await AsyncStorage.getItem('custom_server_url');
    return saved ? saved.trim() : null;
  } catch (e) {
    return null;
  }
};

/**
 * Saves a new custom server URL into storage
 */
export const setCustomServerUrl = async (url) => {
  try {
    if (!url || url.trim() === '') {
      await AsyncStorage.removeItem('custom_server_url');
    } else {
      let clean = url.trim().replace(/\/+$/, '');
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `https://${clean}`;
      }
      await AsyncStorage.setItem('custom_server_url', clean);
    }
  } catch (e) {
    console.error('Failed to save custom server URL:', e);
  }
};

/**
 * Clears custom server URL and reverts to default
 */
export const resetServerUrl = async () => {
  try {
    await AsyncStorage.removeItem('custom_server_url');
  } catch (e) {
    console.error('Failed to reset server URL:', e);
  }
};

/**
 * Returns current active effective base URL
 */
export const getEffectiveBaseUrl = async () => {
  const custom = await getCustomServerUrl();
  if (custom) {
    return custom.endsWith('/api') ? custom : `${custom}/api`;
  }
  return getDefaultBaseUrl();
};

export const API_BASE_URL = getDefaultBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
    'Bypass-Tunnel-Reminder': 'true',
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'TravelSewaCustomerApp/1.0'
  },
  timeout: 18000
});

// Dynamic Request Interceptor: Resolves active server URL & injects Auth / Tunnel headers
api.interceptors.request.use(
  async (config) => {
    try {
      // 1. Dynamic Base URL Resolution
      const customUrl = await AsyncStorage.getItem('custom_server_url');
      if (customUrl && customUrl.trim() !== '') {
        const clean = customUrl.trim().replace(/\/+$/, '');
        config.baseURL = clean.endsWith('/api') ? clean : `${clean}/api`;
      } else {
        config.baseURL = getDefaultBaseUrl();
      }

      // 2. Tunnel bypass headers
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('bypass-tunnel-reminder', 'true');
        config.headers.set('Bypass-Tunnel-Reminder', 'true');
        config.headers.set('ngrok-skip-browser-warning', 'true');
      } else {
        config.headers['bypass-tunnel-reminder'] = 'true';
        config.headers['Bypass-Tunnel-Reminder'] = 'true';
        config.headers['ngrok-skip-browser-warning'] = 'true';
      }

      // 3. Auth Token
      const token = await AsyncStorage.getItem('customer_token');
      if (token) {
        if (config.headers && typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${token}`);
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      console.error('Error in request interceptor:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handles unauthorized status & automatic network fallback retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry with candidate fallback if network error and not already retried
    if (!error.response && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      for (const candidate of CANDIDATE_URLS) {
        if (originalRequest.baseURL !== candidate) {
          try {
            originalRequest.baseURL = candidate;
            return await axios(originalRequest);
          } catch (retryErr) {
            // continue to next candidate
          }
        }
      }
    }

    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      try {
        await AsyncStorage.removeItem('customer_token');
        await AsyncStorage.removeItem('customer_user');
      } catch (e) {
        console.error(e);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Health check tester for checking connection to a specific URL or active URL
 */
export const testServerConnection = async (targetUrl = null) => {
  const startTime = Date.now();
  let testEndpoint = targetUrl;

  if (!testEndpoint) {
    testEndpoint = await getEffectiveBaseUrl();
  } else {
    testEndpoint = testEndpoint.trim().replace(/\/+$/, '');
    if (!testEndpoint.startsWith('http://') && !testEndpoint.startsWith('https://')) {
      testEndpoint = `https://${testEndpoint}`;
    }
    testEndpoint = testEndpoint.endsWith('/api') ? testEndpoint : `${testEndpoint}/api`;
  }

  try {
    const res = await axios.get(`${testEndpoint}/health`, {
      timeout: 7000,
      headers: {
        'bypass-tunnel-reminder': 'true',
        'Bypass-Tunnel-Reminder': 'true',
        'ngrok-skip-browser-warning': 'true'
      }
    });
    const latency = Date.now() - startTime;
    return {
      success: true,
      status: res.status,
      latency,
      url: testEndpoint,
      data: res.data
    };
  } catch (err) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      latency,
      url: testEndpoint,
      error: err.message || 'Unable to reach backend server'
    };
  }
};

export default api;
