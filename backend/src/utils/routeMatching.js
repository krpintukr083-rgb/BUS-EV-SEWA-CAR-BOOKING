/**
 * Normalizes a route location string by trimming whitespace and converting to lowercase.
 * This ensures strict, case-insensitive, whitespace-trimmed comparison.
 * e.g., " Delhi " -> "delhi"
 */
const normalizeRouteLocation = (value) => {
  if (!value) return '';
  let str = String(value)
    .split('(')[0]
    .trim()
    .toLowerCase();
  // Strip country suffix if present (e.g. ", Nepal" or ", India") to allow normalized matching across representations
  str = str.replace(/,\s*(nepal|india)$/i, '').trim();
  return str.replace(/[^a-z0-9]/g, '');
};

/**
 * Resolves the operational route for a driver, checking:
 * 1. driver.route (if origin and destination are present)
 * 2. driver.assignedVehicle (if populated or object with route/pickupDropDetails)
 * 3. booking.scheduleId (if schedule is assigned to driver)
 * 4. booking.vehicle (if vehicle is assigned to driver)
 */
const resolveDriverRoute = (driver, booking) => {
  if (!driver) return null;

  let origin = (driver.route?.origin || '').trim();
  let destination = (driver.route?.destination || '').trim();
  if (origin && destination) {
    return { origin, destination };
  }

  // 1. Fallback to driver's assigned vehicle if available in memory
  const assignedVeh = driver.assignedVehicle;
  if (assignedVeh && typeof assignedVeh === 'object') {
    const vOrigin = (assignedVeh.route?.origin || assignedVeh.pickupLocation || assignedVeh.pickupDropDetails?.pickupLocation || '').trim();
    const vDest = (assignedVeh.route?.destination || assignedVeh.dropLocation || assignedVeh.pickupDropDetails?.dropLocation || '').trim();
    if (vOrigin && vDest) {
      return { origin: vOrigin, destination: vDest };
    }
  }

  // 2. Fallback to booking schedule if assigned to driver
  if (booking?.scheduleId && typeof booking.scheduleId === 'object') {
    const s = booking.scheduleId;
    const driverId = driver._id ? String(driver._id) : '';
    const userId = driver.user?._id ? String(driver.user._id) : String(driver.user || '');
    if ((s.driver && [driverId, userId].includes(String(s.driver._id || s.driver))) ||
        (booking.driver && [driverId, userId].includes(String(booking.driver._id || booking.driver)))) {
      const sOrigin = (s.origin || s.route?.origin || '').trim();
      const sDest = (s.destination || s.route?.destination || '').trim();
      if (sOrigin && sDest) {
        return { origin: sOrigin, destination: sDest };
      }
    }
  }

  // 3. Fallback to booking vehicle if assigned to driver
  if (booking?.vehicle && typeof booking.vehicle === 'object') {
    const bVeh = booking.vehicle;
    const driverId = driver._id ? String(driver._id) : '';
    const userId = driver.user?._id ? String(driver.user._id) : String(driver.user || '');
    const driverVehId = assignedVeh ? String(assignedVeh._id || assignedVeh) : '';
    const isAssigned = (bVeh.assignedDriver && [driverId, userId].includes(String(bVeh.assignedDriver._id || bVeh.assignedDriver))) ||
                       (driverVehId && driverVehId === String(bVeh._id)) ||
                       (booking.driver && [driverId, userId].includes(String(booking.driver._id || booking.driver)));
    if (isAssigned) {
      const bOrigin = (bVeh.route?.origin || bVeh.pickupLocation || bVeh.pickupDropDetails?.pickupLocation || '').trim();
      const bDest = (bVeh.route?.destination || bVeh.dropLocation || bVeh.pickupDropDetails?.dropLocation || '').trim();
      if (bOrigin && bDest) {
        return { origin: bOrigin, destination: bDest };
      }
    }
  }

  return null;
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
 *      - 4. Only an exact reverse (not an unrelated route) can be unlocked by the toggle.
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

/**
 * Normalizes vehicle category/type names to canonical tokens.
 */
const normalizeVehicleType = (val) => {
  if (!val) return '';
  const s = String(val).trim().toLowerCase().replace(/[\s_\-]+/g, '');
  if (s.includes('bus')) return 'bus';
  if (s.includes('car') || s.includes('sedan') || s.includes('suv') || s.includes('hatchback')) return 'car';
  if (s.includes('evsewa') || s.includes('ev')) return 'ev-sewa';
  if (s.includes('truck')) return 'truck';
  return s;
};

/**
 * Checks if a driver's vehicle type is compatible with a booking's requested service type.
 * 'Any' or unspecified booking service matches any driver vehicle.
 */
const isServiceTypeCompatible = (driverVehicleType, bookingServiceType) => {
  const normBooking = normalizeVehicleType(bookingServiceType);
  if (!normBooking || normBooking === 'any') return true;
  const normDriver = normalizeVehicleType(driverVehicleType);
  if (!normDriver) return false;
  return normDriver === normBooking;
};

const driverMatchesBookingRoute = (driver, booking, { allowOpposite = false, requireServiceTypeMatch = false } = {}) => {
  if (!driver || !booking) return false;

  if (requireServiceTypeMatch) {
    const driverVehicleType = driver.assignedVehicle?.vehicleType || driver.vehicleType;
    const bookingServiceType = booking.serviceType || booking.vehicleType;
    if (!isServiceTypeCompatible(driverVehicleType, bookingServiceType)) {
      return false;
    }
  }

  const effectiveRoute = resolveDriverRoute(driver, booking);
  if (!effectiveRoute) return false;

  return isEligibleForBooking(
    effectiveRoute.origin,
    effectiveRoute.destination,
    booking.pickupLocation || booking.origin || booking.route?.origin || '',
    booking.dropLocation || booking.destination || booking.route?.destination || '',
    allowOpposite
  ).finalEligible;
};

const vehicleMatchesBookingRoute = (vehicle, booking, { allowOpposite = false } = {}) => {
  if (!vehicle || !booking) return false;
  const vOrigin = vehicle.route?.origin || '';
  const vDest = vehicle.route?.destination || '';
  const bOrigin = booking.pickupLocation || booking.origin || booking.route?.origin || '';
  const bDest = booking.dropLocation || booking.destination || booking.route?.destination || '';
  return isEligibleForBooking(vOrigin, vDest, bOrigin, bDest, allowOpposite).finalEligible;
};

module.exports = {
  normalizeRouteLocation,
  normalizeVehicleType,
  isServiceTypeCompatible,
  resolveDriverRoute,
  isSameRoute,
  isReverseRoute,
  isEligibleForBooking,
  driverMatchesBookingRoute,
  vehicleMatchesBookingRoute
};
