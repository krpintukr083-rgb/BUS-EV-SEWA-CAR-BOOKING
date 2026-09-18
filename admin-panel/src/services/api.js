import axios from 'axios';

// Live Production / HTTPS Public Tunnel URL (Render Live Backend):
export const BACKEND_TUNNEL_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

// Local Development URL:
export const LOCAL_DEV_URL = 'http://localhost:5000/api';

/**
 * Computes active API Base URL with prioritized resolution:
 * 1. Custom URL saved in localStorage ('custom_server_url')
 * 2. Vite Environment Variable ('VITE_API_URL')
 * 3. Live Backend Tunnel URL ('https://bus-ev-sewa-car-booking.onrender.com/api')
 * 4. Localhost Fallback ('http://localhost:5000/api')
 */
export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_server_url');
    if (custom && custom.trim() !== '') {
      const clean = custom.trim().replace(/\/+$/, '');
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }
  }

  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') {
    const clean = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  if (BACKEND_TUNNEL_URL && BACKEND_TUNNEL_URL.trim() !== '') {
    return BACKEND_TUNNEL_URL;
  }

  return LOCAL_DEV_URL;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Super Admin JWT token & Dynamic BaseURL
api.interceptors.request.use(
  config => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Auth failure interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
