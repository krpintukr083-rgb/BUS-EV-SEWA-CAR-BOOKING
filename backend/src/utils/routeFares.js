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

const getRouteCumulativeFares = route => {
  if (!Array.isArray(route?.stops) || route.stops.length === 0) return [];
  if (
    route.stops.every(stop => stop?.fareFromOrigin != null) &&
    route.destinationFareFromOrigin != null
  ) {
    return [0, ...route.stops.map(stop => Number(stop.fareFromOrigin)), Number(route.destinationFareFromOrigin)];
  }
  return [0, ...[
    ...route.stops.map(stop => Number(stop?.fareFromPrevious)),
    Number(route.finalSegmentFare)
  ].reduce((totals, fare) => {
    totals.push((totals[totals.length - 1] || 0) + fare);
    return totals;
  }, [])];
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

  const cumulativeFares = getRouteCumulativeFares(route);

  if (
    cumulativeFares.slice(1).some(fare => !Number.isFinite(fare) || fare <= 0) ||
    cumulativeFares.some((fare, index) => index > 0 && fare < cumulativeFares[index - 1])
  ) {
    return { valid: false, message: 'Cumulative fares must be positive and must not decrease along the route.' };
  }

  return {
    valid: true,
    totalFare: cumulativeFares[cumulativeFares.length - 1],
    cumulativeFares
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

  return validation.cumulativeFares[endIndex] - validation.cumulativeFares[startIndex];
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
  getRouteCumulativeFares,
  getRouteSegmentFare,
  isRouteSegmentWithin,
  normalizeLocation,
  validateRoutePricing
};
