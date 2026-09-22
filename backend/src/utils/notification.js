const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

const normalizeLoc = (loc) => {
  if (!loc) return '';
  // Extract main city name before brackets if any, e.g. "Delhi (ISBT)" -> "delhi"
  const clean = String(loc).split('(')[0].toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  return clean;
};

const isLocationMatch = (loc1, loc2) => {
  const n1 = normalizeLoc(loc1);
  const n2 = normalizeLoc(loc2);
  if (!n1 || !n2) return false;
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
};

/**
 * Notifies ALL eligible drivers whose assigned bus operates on the exact same route.
 * @param {Object} booking - The created bus booking document.
 */
const notifyEligibleDriversForBusBooking = async (booking) => {
  try {
    if (!booking) return;

    const serviceType = String(booking.serviceType || '').toLowerCase();
    if (serviceType !== 'bus') {
      return; // Only process Bus bookings
    }

    const bookingOrigin = booking.pickupLocation || booking.route?.origin || '';
    const bookingDest = booking.dropLocation || booking.route?.destination || '';
    const bookingId = booking.bookingId || (booking._id ? booking._id.toString() : '');

    if (!bookingOrigin || !bookingDest || !bookingId) {
      return;
    }

    // 1. Find all active vehicles of type 'Bus'
    const activeBuses = await Vehicle.find({
      vehicleType: { $regex: /^bus$/i },
      vehicleStatus: 'Active'
    }).lean();

    // 2. Filter buses operating on the EXACT SAME ROUTE (Direction-sensitive)
    const matchingVehicles = activeBuses.filter((veh) => {
      const vOrigin = veh.route?.origin || veh.pickupDropDetails?.pickupLocation || veh.hireDetails?.pickup || '';
      const vDest = veh.route?.destination || veh.pickupDropDetails?.dropLocation || veh.hireDetails?.destination || '';

      const originMatches = isLocationMatch(vOrigin, bookingOrigin);
      const destMatches = isLocationMatch(vDest, bookingDest);

      return originMatches && destMatches;
    });

    if (matchingVehicles.length === 0) {
      return;
    }

    const matchingVehicleIds = matchingVehicles.map((v) => v._id);
    const vehicleAssignedDriverIds = matchingVehicles
      .map((v) => v.assignedDriver)
      .filter(Boolean);

    // 3. Find all Active / Approved drivers assigned to these buses
    const driversByVehicle = await Driver.find({
      assignedVehicle: { $in: matchingVehicleIds },
      driverStatus: { $in: ['Active', 'Approved'] }
    }).populate('user').lean();

    const driversByRef = await Driver.find({
      _id: { $in: vehicleAssignedDriverIds },
      driverStatus: { $in: ['Active', 'Approved'] }
    }).populate('user').lean();

    // Combine and deduplicate drivers
    const driverMap = new Map();
    [...driversByVehicle, ...driversByRef].forEach((d) => {
      driverMap.set(d._id.toString(), d);
    });

    const eligibleDrivers = Array.from(driverMap.values());

    // 4. Create Notification for EVERY matching driver with Deduplication Protection
    for (const driver of eligibleDrivers) {
      const recipientUser = driver.user?._id || driver.user || driver._id;

      // Check if notification for this booking already exists for this driver recipient
      const existingNotif = await Notification.findOne({
        $or: [
          { recipientId: recipientUser },
          { recipient: `Driver: ${driver.name}` }
        ],
        message: { $regex: bookingId }
      });

      if (!existingNotif) {
        const routeText = `${bookingOrigin.split('(')[0].trim()} → ${bookingDest.split('(')[0].trim()}`;
        await Notification.create({
          title: 'New Bus Booking Request',
          message: `${routeText} booking request. Tap to view.`,
          recipient: `Driver: ${driver.name}`,
          recipientRole: 'driver',
          recipientId: recipientUser,
          status: 'Unread'
        });

        // Send Push Notification if token exists
        const token = driver.pushToken || driver.fcmToken;
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
                title: 'New Bus Booking Request',
                body: `${routeText} booking request. Tap to view.`,
                data: {
                  bookingId: bookingId,
                  screen: 'Requests'
                },
                sound: 'default',
                priority: 'high',
                channelId: 'driver-booking-requests'
              })
            });
          } catch (pushErr) {
            console.warn(`Failed push notification to driver ${driver._id}:`, pushErr.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in notifyEligibleDriversForBusBooking:', error);
  }
};

module.exports = {
  normalizeLoc,
  isLocationMatch,
  notifyEligibleDriversForBusBooking
};
