import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDefaultBaseUrl, sanitizeApiUrl, CANDIDATE_URLS } from '../constants/api';

/**
 * Retrieves custom server URL saved in storage
 */
export const getCustomServerUrl = async () => {
  try {
    const saved = await AsyncStorage.getItem('custom_driver_server_url');
    return saved ? sanitizeApiUrl(saved) : null;
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
      await AsyncStorage.removeItem('custom_driver_server_url');
    } else {
      const clean = sanitizeApiUrl(url);
      await AsyncStorage.setItem('custom_driver_server_url', clean);
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
    await AsyncStorage.removeItem('custom_driver_server_url');
  } catch (e) {
    console.error('Failed to reset server URL:', e);
  }
};

/**
 * Returns current effective base URL
 */
export const getEffectiveBaseUrl = async () => {
  return getDefaultBaseUrl();
};

/**
 * Categorizes an API URL for UI and logs
 */
export const getUrlEnvironment = (url) => {
  if (!url) return 'UNKNOWN';
  if (url.startsWith('https://')) return 'PUBLIC HTTPS';
  if (url.includes('10.0.2.2')) return 'LOCAL EMULATOR';
  if (url.includes('192.168.') || url.includes('172.') || url.includes('10.')) return 'LAN WI-FI';
  return 'LOCAL HTTP';
};

const apiClient = axios.create({
  baseURL: getDefaultBaseUrl(),
  timeout: 18000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'bypass-tunnel-reminder': 'true',
    'Bypass-Tunnel-Reminder': 'true',
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'TravelSewaDriverApp/1.0'
  }
});

// Dynamic Request Interceptor: Resolves active server URL & injects Bearer JWT
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const effectiveUrl = await getEffectiveBaseUrl();
      config.baseURL = effectiveUrl;

      config.headers['bypass-tunnel-reminder'] = 'true';
      config.headers['Bypass-Tunnel-Reminder'] = 'true';
      config.headers['ngrok-skip-browser-warning'] = 'true';

      const token = await AsyncStorage.getItem('@driver_jwt_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Error in driver request interceptor:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handles fallback retry and clean error propagation
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry with candidate fallback on network error
    if (!error.response && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      for (const candidate of CANDIDATE_URLS) {
        if (originalRequest.baseURL !== candidate) {
          try {
            originalRequest.baseURL = candidate;
            const fallbackRes = await axios(originalRequest);
            // If fallback succeeded, update stored effective URL to working candidate
            await setCustomServerUrl(candidate);
            return fallbackRes;
          } catch (retryErr) {
            // continue to next candidate
          }
        }
      }
    }

    if (error.response && error.response.status === 401 && !originalRequest.url?.includes('/auth/login')) {
      try {
        await AsyncStorage.removeItem('@driver_jwt_token');
        await AsyncStorage.removeItem('@driver_user_data');
      } catch (e) {
        // ignore
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
  let testEndpoint = targetUrl ? sanitizeApiUrl(targetUrl) : await getEffectiveBaseUrl();

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
      environment: getUrlEnvironment(testEndpoint),
      data: res.data
    };
  } catch (err) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      latency,
      url: testEndpoint,
      environment: getUrlEnvironment(testEndpoint),
      error: err.message || 'Unable to reach backend server'
    };
  }
};

export default apiClient;
