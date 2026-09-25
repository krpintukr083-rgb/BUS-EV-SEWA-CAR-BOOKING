import { BACKEND_TUNNEL_URL, BACKEND_LAN_URL, EMULATOR_URL, getDefaultBaseUrl } from '../services/api';
import { Platform } from 'react-native';

const DEFAULT_FALLBACKS = {
  Bus: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
  'EV-Sewa': 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
  Car: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
  Driver: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'
};

/**
 * Resolves any relative or absolute image URL into a fully qualified URL
 * suitable for React Native <Image source={{ uri: ... }} />.
 * 
 * @param {string} url - The image URL or relative path from MongoDB (e.g. "/uploads/image-123.jpg")
 * @param {string} type - Vehicle type ('Bus', 'EV-Sewa', 'Car') or 'Driver'
 * @returns {string} Fully qualified image URL
 */
export const getFullImageUrl = (url, type = 'Bus') => {
  const fallback = DEFAULT_FALLBACKS[type] || DEFAULT_FALLBACKS.Bus;
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }

  const cleanUrl = url.trim();

  // Already a full remote URL or data/file URI
  if (
    cleanUrl.startsWith('http://') ||
    cleanUrl.startsWith('https://') ||
    cleanUrl.startsWith('data:') ||
    cleanUrl.startsWith('file:') ||
    cleanUrl.startsWith('blob:')
  ) {
    return cleanUrl;
  }

  // Relative upload path (e.g. "/uploads/bus-123.png")
  let serverBase = '';
  if (BACKEND_TUNNEL_URL && BACKEND_TUNNEL_URL.trim() !== '') {
    serverBase = BACKEND_TUNNEL_URL.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  } else if (Platform.OS === 'android') {
    serverBase = EMULATOR_URL.replace(/\/+$/, '').replace(/\/api$/, '');
  } else if (BACKEND_LAN_URL && BACKEND_LAN_URL.trim() !== '') {
    serverBase = BACKEND_LAN_URL.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  } else {
    serverBase = getDefaultBaseUrl().replace(/\/+$/, '').replace(/\/api$/, '');
  }

  const normalizedPath = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
  return `${serverBase}${normalizedPath}`;
};

/**
 * Helper to get the primary vehicle image URL or fallback
 */
export const getPrimaryVehicleImage = (vehicle, type = 'Bus') => {
  const vehicleType = vehicle?.vehicleType || type;
  let imgs = vehicle?.vehicleImages;
  
  if (typeof imgs === 'string') {
    try {
      const parsed = JSON.parse(imgs);
      imgs = Array.isArray(parsed) ? parsed : [imgs];
    } catch (e) {
      imgs = [imgs];
    }
  }

  if (Array.isArray(imgs) && imgs.length > 0) {
    const valid = imgs.find(img => img && typeof img === 'string' && img.trim() !== '');
    if (valid) {
      return getFullImageUrl(valid, vehicleType);
    }
  }
  return getFullImageUrl(null, vehicleType);
};

/**
 * Helper to get all vehicle image URLs array
 */
export const getAllVehicleImages = (vehicle, type = 'Bus') => {
  const vehicleType = vehicle?.vehicleType || type;
  let imgs = vehicle?.vehicleImages;

  if (typeof imgs === 'string') {
    try {
      const parsed = JSON.parse(imgs);
      imgs = Array.isArray(parsed) ? parsed : [imgs];
    } catch (e) {
      imgs = [imgs];
    }
  }

  if (Array.isArray(imgs) && imgs.length > 0) {
    const validUrls = imgs
      .filter(img => img && typeof img === 'string' && img.trim() !== '')
      .map(img => getFullImageUrl(img, vehicleType));
    if (validUrls.length > 0) return validUrls;
  }
  return [getFullImageUrl(null, vehicleType)];
};
