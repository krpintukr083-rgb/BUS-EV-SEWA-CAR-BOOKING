import axios from 'axios';

// Get API base URL from environment or fallback
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') {
    const clean = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  if (import.meta.env.PROD) {
    return 'https://bus-ev-sewa-car-booking.onrender.com/api';
  }
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to dynamically attach JWT token
api.interceptors.request.use(
  config => {
    let token;
    const url = config.url || '';
    if (url.includes('/admin')) {
      token = localStorage.getItem('admin_token') || localStorage.getItem('auth_token');
    } else if (url.includes('/driver')) {
      token = localStorage.getItem('driver_token') || localStorage.getItem('auth_token');
    } else {
      token =
        localStorage.getItem('auth_token') ||
        localStorage.getItem('admin_token') ||
        localStorage.getItem('driver_token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Fix for Axios 1.x: Prevent serializing FormData to JSON due to instance default
    if (config.data instanceof FormData) {
      if (config.headers && typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
      }
    }

    return config;
  },
  error => Promise.reject(error)
);

// Interceptor to handle authentication failures
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('driver_token');
        localStorage.removeItem('driver_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
