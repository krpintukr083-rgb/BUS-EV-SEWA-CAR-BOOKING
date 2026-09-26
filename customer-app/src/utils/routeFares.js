const normalizeLocation = value => String(value || '')
  .split('(')[0]
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

export const getRoutePoints = route => {
  if (!route?.origin || !route?.destination) return [];
  return [
    String(route.origin).trim(),
    ...(Array.isArray(route.stops) ? route.stops.map(stop => String(stop?.name || '').trim()) : []),
    String(route.destination).trim()
  ];
};

export const getRouteSegmentFare = (route, from, to) => {
  if (!Array.isArray(route?.stops) || route.stops.length === 0) return null;
  const points = getRoutePoints(route);
  const normalized = points.map(normalizeLocation);
  const start = normalized.indexOf(normalizeLocation(from));
  const end = normalized.indexOf(normalizeLocation(to));
  if (normalized.some(point => !point) || start < 0 || end <= start) return null;

  const fares = [
    ...route.stops.map(stop => Number(stop?.fareFromPrevious)),
    Number(route.finalSegmentFare)
  ];
  if (fares.some(fare => !Number.isFinite(fare) || fare <= 0)) return null;
  return fares.slice(start, end).reduce((total, fare) => total + fare, 0);
};
