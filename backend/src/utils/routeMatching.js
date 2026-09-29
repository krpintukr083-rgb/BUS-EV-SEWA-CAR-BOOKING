/**
 * Normalizes a route location string by trimming whitespace and converting to lowercase.
 * This ensures strict, case-insensitive, whitespace-trimmed comparison.
 * e.g., " Delhi " -> "delhi"
 */
const normalizeRouteLocation = (value) => {
  if (!value) return '';
  return String(value)
    .split('(')[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Checks if a driver's route matches a booking's route EXACTLY.
 * Normalizes the strings and compares them.
 * Reverse routes (e.g. driver: Jaipur->Delhi, booking: Delhi->Jaipur) DO NOT match.
 */
const isSameRoute = (driverOrigin, driverDest, bookingOrigin, bookingDest) => {
  const normDO = normalizeRouteLocation(driverOrigin);
  const normDD = normalizeRouteLocation(driverDest);
  const normBO = normalizeRouteLocation(bookingOrigin);
  const normBD = normalizeRouteLocation(bookingDest);

  if (!normDO || !normDD || !normBO || !normBD) return false;

  return normDO === normBO && normDD === normBD;
};

module.exports = {
  normalizeRouteLocation,
  isSameRoute
};
