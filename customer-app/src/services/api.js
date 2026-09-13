import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * BACKEND API BASE URL CONFIGURATION
 * 
 * For REAL ANDROID MOBILE DEVICE (Recommended):
 * - Option A (HTTPS Tunnel - Works over any WiFi or Cellular Data):
 *     Start tunnel:  npx localtunnel --port 5000
 *                    or ngrok http 5000
 *                    or cloudflared tunnel --url http://localhost:5000
 *     Paste your tunnel URL below in BACKEND_TUNNEL_URL (e.g. 'https://xxx.loca.lt')
 * 
 * - Option B (Same Wi-Fi Network LAN IP):
 *     Ensure both your PC and mobile device are connected to the SAME Wi-Fi router.
 *     LAN IP is pre-configured as 'http://192.168.1.2:5000' below.
 */

// 1. If using an HTTPS tunnel (Cloudflare, ngrok, localtunnel), set it here:
export const BACKEND_TUNNEL_URL = ''; // e.g. 'https://abc-123.loca.lt' or 'https://xyz.ngrok-free.app'

// 2. Computer's LAN IP address when phone and PC are on the same Wi-Fi:
export const BACKEND_LAN_URL = 'http://192.168.1.2:5000';

// 3. Android Emulator loopback alias:
export const EMULATOR_URL = 'http://10.0.2.2:5000';

export const getBaseUrl = () => {
  // 1. Highest priority: Public HTTPS Tunnel URL if provided
  if (BACKEND_TUNNEL_URL && BACKEND_TUNNEL_URL.trim() !== '') {
    const clean = BACKEND_TUNNEL_URL.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 2. Real Android Device on LAN / Same Wi-Fi
  if (BACKEND_LAN_URL && BACKEND_LAN_URL.trim() !== '') {
    const clean = BACKEND_LAN_URL.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // 3. Android Emulator Fallback
  if (Platform.OS === 'android') {
    return `${EMULATOR_URL}/api`;
  }

  // 4. Default / iOS / Web localhost
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

api.interceptors.request.use(
  async config => {
    try {
      const token = await AsyncStorage.getItem('customer_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error fetching token:', e);
    }
    return config;
  },
  error => Promise.reject(error)
);

api.interceptors.response.use(
  response => response,
  async error => {
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

export default api;
