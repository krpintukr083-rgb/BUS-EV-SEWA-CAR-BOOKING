const normalizeLocation = value => String(value || '')
  .split('(')[0]
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const getRoutePoints = route => {
  if (!route?.origin || !route?.destination) return [];
  return [
    String(route.origin).trim(),
    ...(Array.isArray(route.stops) ? route.stops.map(stop => String(stop?.name || '').trim()) : []),
    String(route.destination).trim()
  ];
};

const validateRoutePricing = route => {
  if (!Array.isArray(route?.stops) || route.stops.length === 0) {
    return { valid: true, totalFare: null };
  }

  const points = getRoutePoints(route);
  const normalizedPoints = points.map(normalizeLocation);
  if (
    points.some(point => !point) ||
    normalizedPoints.some((point, index) => !point || normalizedPoints.indexOf(point) !== index)
  ) {
    return { valid: false, message: 'Route stops must be named, ordered, and unique.' };
  }

  const segmentFares = [
    ...route.stops.map(stop => Number(stop?.fareFromPrevious)),
    Number(route.finalSegmentFare)
  ];
  if (segmentFares.some(fare => !Number.isFinite(fare) || fare <= 0)) {
    return { valid: false, message: 'Enter a positive fare for every route segment.' };
  }

  return {
    valid: true,
    totalFare: segmentFares.reduce((total, fare) => total + fare, 0)
  };
};

const findLocationIndex = (points, location) => {
  const target = normalizeLocation(location);
  return target ? points.findIndex(point => normalizeLocation(point) === target) : -1;
};

const getRouteSegmentFare = (route, from, to) => {
  if (!Array.isArray(route?.stops) || route.stops.length === 0) return null;
  const validation = validateRoutePricing(route);
  if (!validation.valid) return null;

  const points = getRoutePoints(route);
  const startIndex = findLocationIndex(points, from);
  const endIndex = findLocationIndex(points, to);
  if (startIndex < 0 || endIndex <= startIndex) return null;

  const segmentFares = [
    ...route.stops.map(stop => Number(stop.fareFromPrevious)),
    Number(route.finalSegmentFare)
  ];
  return segmentFares.slice(startIndex, endIndex).reduce((total, fare) => total + fare, 0);
};

const isRouteSegmentWithin = (route, from, to, segmentFrom, segmentTo) => {
  const points = getRoutePoints(route);
  const routeStart = findLocationIndex(points, from);
  const routeEnd = findLocationIndex(points, to);
  const segmentStart = findLocationIndex(points, segmentFrom);
  const segmentEnd = findLocationIndex(points, segmentTo);
  return routeStart >= 0 && routeEnd > routeStart
    && segmentStart >= routeStart && segmentEnd > segmentStart && segmentEnd <= routeEnd;
};

module.exports = {
  getRoutePoints,
  getRouteSegmentFare,
  isRouteSegmentWithin,
  normalizeLocation,
  validateRoutePricing
};
