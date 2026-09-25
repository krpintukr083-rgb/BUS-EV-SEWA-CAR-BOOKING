import { BACKEND_TUNNEL_URL, BACKEND_LAN_URL, EMULATOR_URL, getDefaultBaseUrl } from '../services/api';
import { Platform } from 'react-native';

const DEFAULT_FALLBACKS = {
  Bus: '',
  'EV-Sewa': '',
  Car: '',
  Driver: ''
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

  let cleanUrl = url.trim();

  // If http:// URL pointing to render backend, convert to https:// (Android blocks http:// cleartext)
  if (cleanUrl.startsWith('http://bus-ev-sewa-car-booking.onrender.com')) {
    cleanUrl = cleanUrl.replace('http://', 'https://');
  }

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
 * Helper to extract an array of image path/url strings from vehicleImages field
 */
const parseVehicleImages = (imgs) => {
  if (!imgs) return [];
  if (Array.isArray(imgs)) return imgs;
  if (typeof imgs === 'string') {
    const trimmed = imgs.trim();
    if (trimmed === '') return [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'string') return [parsed];
      } catch (e) {
        // Fallback to single string
      }
    }
    return [trimmed];
  }
  return [];
};

/**
 * Helper to get the primary vehicle image URL or fallback
 */
export const getPrimaryVehicleImage = (vehicle, type = 'Bus') => {
  const vehicleType = vehicle?.vehicleType || type;
  const imgs = parseVehicleImages(vehicle?.vehicleImages);

  if (imgs.length > 0) {
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
  const imgs = parseVehicleImages(vehicle?.vehicleImages);

  if (imgs.length > 0) {
    const validUrls = imgs
      .filter(img => img && typeof img === 'string' && img.trim() !== '')
      .map(img => getFullImageUrl(img, vehicleType));
    if (validUrls.length > 0) return validUrls;
  }
  return [getFullImageUrl(null, vehicleType)];
};

