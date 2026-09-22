const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Notification = require('../models/Notification');

const normalizeLoc = (loc) => {
  if (!loc) return '';
  return String(loc).split('(')[0].toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

const isLocationMatch = (loc1, loc2) => {
  const n1 = normalizeLoc(loc1);
  const n2 = normalizeLoc(loc2);
  if (!n1 || !n2) return false;
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
};

const vehicleMatchesBookingRoute = (vehicle, booking) => {
  if (!vehicle || !booking) return false;

  if (booking.vehicle) {
    const bVehId = (booking.vehicle._id || booking.vehicle).toString();
    const vehId = (vehicle._id || vehicle).toString();
    if (bVehId === vehId) return true;
  }

  const vOrigin = vehicle.route?.origin || vehicle.pickupDropDetails?.pickupLocation || vehicle.hireDetails?.pickup || '';
  const vDest = vehicle.route?.destination || vehicle.pickupDropDetails?.dropLocation || vehicle.hireDetails?.destination || '';

  const bOrigin = booking.pickupLocation || '';
  const bDest = booking.dropLocation || '';

  if (vOrigin && vDest && bOrigin && bDest) {
    const originMatches = isLocationMatch(vOrigin, bOrigin);
    const destMatches = isLocationMatch(vDest, bDest);
    if (originMatches && destMatches) {
      return true;
    }
  }

  return false;
};

const sendPushNotificationToSameRouteDrivers = async (booking) => {
  try {
    if (!booking || booking.serviceType !== 'Bus') return;

    const activeDrivers = await Driver.find({ driverStatus: 'Active' }).populate('assignedVehicle');

    const originName = (booking.pickupLocation || 'Origin').split('(')[0].trim();
    const destName = (booking.dropLocation || 'Destination').split('(')[0].trim();
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

      if (vehicleMatchesBookingRoute(v, booking)) {
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
    }
  } catch (err) {
    console.warn('Error sending push notifications to same-route drivers:', err.message);
  }
};

module.exports = {
  vehicleMatchesBookingRoute,
  sendPushNotificationToSameRouteDrivers
};
