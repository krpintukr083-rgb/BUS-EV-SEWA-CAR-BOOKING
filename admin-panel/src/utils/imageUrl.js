const PRODUCTION_URL = 'https://bus-ev-sewa-car-booking.onrender.com';

const getBaseUrl = () => {
  // If we're running locally, we might want to point to local backend
  // But for safety and consistency with prompt constraints, we prefer production if API_URL points there.
  const envUrl = import.meta.env.VITE_API_URL || PRODUCTION_URL;
  return envUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
};

export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') return '';
  const cleanUrl = url.trim();

  // Case B: Already a full remote HTTPS/HTTP URL or Data URI
  if (/^(https?:|data:|blob:|file:)/i.test(cleanUrl)) {
    // Case C: Convert localhost to production if we are in production
    if (cleanUrl.includes('localhost:5000') || cleanUrl.includes('127.0.0.1:5000') || cleanUrl.includes('10.0.2.2:5000')) {
      const baseUrl = getBaseUrl();
      const pathPart = cleanUrl.split(/:\d+\//)[1] || cleanUrl.split('localhost:5000/')[1] || cleanUrl.replace(/^http:\/\/[^\/]+/, '');
      return `${baseUrl}/${pathPart.replace(/^\//, '')}`;
    }
    return cleanUrl;
  }

  // Case A: Relative path like /uploads/front.png
  const baseUrl = getBaseUrl();
  return `${baseUrl}/${cleanUrl.replace(/^\//, '')}`;
};

export const getPrimaryVehicleImage = (vehicleImages) => {
  if (!vehicleImages) return '';

  // Case D: Array
  if (Array.isArray(vehicleImages)) {
    const valid = vehicleImages.find(img => img && typeof img === 'string' && img.trim() !== '');
    return valid ? resolveImageUrl(valid) : '';
  }

  // Case E: String (might be JSON stringified array or single string)
  if (typeof vehicleImages === 'string') {
    try {
      const parsed = JSON.parse(vehicleImages);
      if (Array.isArray(parsed)) {
        const valid = parsed.find(img => img && typeof img === 'string' && img.trim() !== '');
        return valid ? resolveImageUrl(valid) : '';
      }
    } catch (e) {
      // It's just a regular string path
      return resolveImageUrl(vehicleImages);
    }
  }

  return '';
};

export const getAllVehicleImages = (vehicleImages) => {
  if (!vehicleImages) return [];

  let arr = [];
  if (Array.isArray(vehicleImages)) {
    arr = vehicleImages;
  } else if (typeof vehicleImages === 'string') {
    try {
      const parsed = JSON.parse(vehicleImages);
      arr = Array.isArray(parsed) ? parsed : [vehicleImages];
    } catch (e) {
      arr = [vehicleImages];
    }
  }

  return arr.map(img => resolveImageUrl(img)).filter(Boolean);
};
