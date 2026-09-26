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

export const getRouteCumulativeFares = route => {
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

export const getRouteSegmentFare = (route, from, to) => {
  if (!Array.isArray(route?.stops) || route.stops.length === 0) return null;
  const points = getRoutePoints(route);
  const normalized = points.map(normalizeLocation);
  const start = normalized.indexOf(normalizeLocation(from));
  const end = normalized.indexOf(normalizeLocation(to));
  if (normalized.some(point => !point) || start < 0 || end <= start) return null;

  const cumulativeFares = getRouteCumulativeFares(route);
  if (
    cumulativeFares.slice(1).some(fare => !Number.isFinite(fare) || fare <= 0) ||
    cumulativeFares.some((fare, index) => index > 0 && fare < cumulativeFares[index - 1])
  ) return null;
  return cumulativeFares[end] - cumulativeFares[start];
};
