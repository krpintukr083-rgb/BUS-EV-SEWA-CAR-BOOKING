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
 * Checks if a driver's route matches a booking's route EXACTLY (same direction).
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

/**
 * Checks if a driver's route is the EXACT REVERSE of a booking's route.
 * e.g., driver: Jaipur->Delhi, booking: Delhi->Jaipur → true
 */
const isReverseRoute = (driverOrigin, driverDest, bookingOrigin, bookingDest) => {
  const normDO = normalizeRouteLocation(driverOrigin);
  const normDD = normalizeRouteLocation(driverDest);
  const normBO = normalizeRouteLocation(bookingOrigin);
  const normBD = normalizeRouteLocation(bookingDest);

  if (!normDO || !normDD || !normBO || !normBD) return false;

  return normDO === normBD && normDD === normBO;
};

/**
 * Centralised single-truth eligibility check.
 *
 * Rules (vehicle ID NEVER bypasses route validation):
 *   1. Check exact same direction via isSameRoute.
 *   2. If same direction → eligible.
 *   3. If NOT same direction:
 *      - allowOpposite = false → NOT eligible
 *      - allowOpposite = true  → check exact reverse direction via isReverseRoute
 *   4. Only an exact reverse (not an unrelated route) can be unlocked by the toggle.
 *
 * @param {string} vOrigin      - Vehicle route origin
 * @param {string} vDest        - Vehicle route destination
 * @param {string} bOrigin      - Booking origin
 * @param {string} bDest        - Booking destination
 * @param {boolean} allowOpposite - Value of ServiceControl.oppositeRouteNotifications
 * @returns {{ normalMatch: boolean, reverseMatch: boolean, finalEligible: boolean }}
 */
const isEligibleForBooking = (vOrigin, vDest, bOrigin, bDest, allowOpposite = false) => {
  const normalMatch = isSameRoute(vOrigin, vDest, bOrigin, bDest);
  const reverseMatch = isReverseRoute(vOrigin, vDest, bOrigin, bDest);

  let finalEligible;
  if (normalMatch) {
    finalEligible = true;
  } else if (allowOpposite && reverseMatch) {
    finalEligible = true;
  } else {
    finalEligible = false;
  }

  return { normalMatch, reverseMatch, finalEligible };
};

const driverMatchesBookingRoute = (driver, booking, { allowOpposite = false } = {}) => {
  if (!driver?.route || !booking) return false;
  return isEligibleForBooking(
    driver.route.origin,
    driver.route.destination,
    booking.pickupLocation || booking.origin || booking.route?.origin || '',
    booking.dropLocation || booking.destination || booking.route?.destination || '',
    allowOpposite
  ).finalEligible;
};

module.exports = {
  normalizeRouteLocation,
  isSameRoute,
  isReverseRoute,
  isEligibleForBooking,
  driverMatchesBookingRoute
};
