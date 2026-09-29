const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Notification = require('../models/Notification');
const ServiceControl = require('../models/ServiceControl');
const { isEligibleForBooking } = require('./routeMatching');

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract route strings from a vehicle document.
 */
const getVehicleRoute = (vehicle) => {
  const origin =
    vehicle.route?.origin ||
    vehicle.route?.from ||
    vehicle.pickupDropDetails?.pickupLocation ||
    vehicle.hireDetails?.pickup ||
    '';
  const destination =
    vehicle.route?.destination ||
    vehicle.route?.to ||
    vehicle.pickupDropDetails?.dropLocation ||
    vehicle.hireDetails?.destination ||
    '';
  return { origin, destination };
};

/**
 * Extract route strings from a booking document.
 */
const getBookingRoute = (booking) => {
  const origin =
    booking.pickupLocation ||
    booking.origin ||
    booking.from ||
    booking.route?.origin ||
    booking.route?.from ||
    '';
  const destination =
    booking.dropLocation ||
    booking.destination ||
    booking.to ||
    booking.route?.destination ||
    booking.route?.to ||
    '';
  return { origin, destination };
};

// ---------------------------------------------------------------------------
// Public: vehicleMatchesBookingRoute
//   Used by driverController (polling path).
//   NOTE: allowOpposite must be pre-fetched by the caller and passed in.
//   Vehicle-ID shortcuts are intentionally removed; route is always validated.
// ---------------------------------------------------------------------------

const vehicleMatchesBookingRoute = (vehicle, booking, { allowOpposite = false } = {}) => {
  if (!vehicle || !booking) return false;

  const { origin: vOrigin, destination: vDest } = getVehicleRoute(vehicle);
  const { origin: bOrigin, destination: bDest } = getBookingRoute(booking);

  if (vOrigin && vDest && bOrigin && bDest) {
    const { normalMatch, reverseMatch, finalEligible } = isEligibleForBooking(
      vOrigin, vDest, bOrigin, bDest, allowOpposite
    );
    console.log('[ROUTE-NOTIFICATION-TRACE]');
    console.log(`  booking route: ${bOrigin} -> ${bDest}`);
    console.log(`  vehicle route: ${vOrigin} -> ${vDest}`);
    console.log(`  allowOpposite: ${allowOpposite}`);
    console.log(`  normalMatch: ${normalMatch}`);
    console.log(`  reverseMatch: ${reverseMatch}`);
    console.log(`  finalEligible: ${finalEligible}`);
    return finalEligible;
  }

  return false;
};

// ---------------------------------------------------------------------------
// Public: sendPushNotificationToSameRouteDrivers
//   Called for serviceType === 'Bus' bookings from booking controller.
//   Reads oppositeRouteNotifications from ServiceControl.
// ---------------------------------------------------------------------------

const sendPushNotificationToSameRouteDrivers = async (booking) => {
  try {
    if (!booking || booking.serviceType !== 'Bus') return;

    const serviceControl = await ServiceControl.findOne().lean();
    const allowOpposite = serviceControl?.oppositeRouteNotifications === true;

    const { origin: bOrigin, destination: bDest } = getBookingRoute(booking);
    if (!bOrigin || !bDest) return;

    const activeDrivers = await Driver.find({ driverStatus: 'Active' }).populate('assignedVehicle');

    const originName = bOrigin.split('(')[0].trim();
    const destName = bDest.split('(')[0].trim();
    const title = 'New Bus Booking Request';
    const bodyText = `${originName} → ${destName} booking request. Tap to view.`;
    const bookingIdStr = booking.bookingId || booking._id;

    for (const d of activeDrivers) {
      let v = d.assignedVehicle;
      if (!v && d.assignedVehicle) {
        v = await Vehicle.findById(d.assignedVehicle).lean();
      }
      if (!v) {
        v = await Vehicle.findOne({ assignedDriver: d._id }).lean();
      }

      if (!v || v.vehicleStatus !== 'Active') continue;

      const { origin: vOrigin, destination: vDest } = getVehicleRoute(v);
      const { normalMatch, reverseMatch, finalEligible } = isEligibleForBooking(
        vOrigin, vDest, bOrigin, bDest, allowOpposite
      );

      console.log('[ROUTE-NOTIFICATION-TRACE]');
      console.log(`  Driver: ${d.name || d._id}`);
      console.log(`  booking route: ${bOrigin} -> ${bDest}`);
      console.log(`  vehicle route: ${vOrigin} -> ${vDest}`);
      console.log(`  allowOpposite: ${allowOpposite}`);
      console.log(`  normalMatch: ${normalMatch}`);
      console.log(`  reverseMatch: ${reverseMatch}`);
      console.log(`  finalEligible: ${finalEligible}`);

      if (!finalEligible) continue;

      // Create in-app notification in DB
      await Notification.create({
        title,
        message: bodyText,
        recipient: `Driver: ${d.name}`,
        recipientRole: 'driver',
        recipientId: d.user || d._id,
        status: 'Unread'
      }).catch(() => {});

      // Push to Expo/FCM Push Token
      const token = d.pushToken || d.fcmToken;
      if (token && typeof token === 'string' && token.trim()) {
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              to: token.trim(),
              title,
              body: bodyText,
              data: {
                bookingId: bookingIdStr,
                screen: 'Requests'
              },
              sound: 'default',
              priority: 'high',
              channelId: 'driver-booking-requests'
            })
          });
        } catch (pushErr) {
          console.warn(`Push dispatch log for driver ${d._id}:`, pushErr.message);
        }
      }
    }
  } catch (err) {
    console.warn('Error sending push notifications to same-route drivers:', err.message);
  }
};

module.exports = {
  vehicleMatchesBookingRoute,
  sendPushNotificationToSameRouteDrivers
};
