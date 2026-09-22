const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

/**
 * Normalizes location strings for accurate route matching.
 * e.g., "Delhi (Kashmere Gate ISBT)" -> "delhi"
 */
const normalizeLoc = (loc) => {
  if (!loc) return '';
  const clean = String(loc).split('(')[0].toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  return clean;
};

/**
 * Checks direction-sensitive location match between vehicle route & booking route.
 */
const isLocationMatch = (loc1, loc2) => {
  const n1 = normalizeLoc(loc1);
  const n2 = normalizeLoc(loc2);
  if (!n1 || !n2) return false;
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
};

/**
 * Determines if a vehicle operates on the exact origin -> destination route of a booking.
 */
const vehicleMatchesBookingRoute = (vehicle, booking) => {
  if (!vehicle || !booking) return false;

  // Direct vehicle match if booking explicitly bound to this vehicle
  if (booking.vehicle) {
    const bVehId = (booking.vehicle._id || booking.vehicle).toString();
    const vehId = (vehicle._id || vehicle).toString();
    if (bVehId === vehId) return true;
  }

  const vOrigin = vehicle.route?.origin || vehicle.pickupDropDetails?.pickupLocation || vehicle.hireDetails?.pickup || '';
  const vDest = vehicle.route?.destination || vehicle.pickupDropDetails?.dropLocation || vehicle.hireDetails?.destination || '';

  const bOrigin = booking.pickupLocation || booking.route?.origin || '';
  const bDest = booking.dropLocation || booking.route?.destination || '';

  if (vOrigin && vDest && bOrigin && bDest) {
    const originMatches = isLocationMatch(vOrigin, bOrigin);
    const destMatches = isLocationMatch(vDest, bDest);
    return originMatches && destMatches;
  }

  return false;
};

/**
 * DYNAMIC NOTIFICATION BROADCAST ENGINE FOR BUS BOOKINGS
 * Discovers ALL Active + Approved drivers assigned to buses operating on the exact same route.
 * Dispatches notifications in parallel without arbitrary limits or sequential blocking.
 * Inspects Expo push tickets & clears stale tokens if DeviceNotRegistered.
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
    const bookingIdStr = booking.bookingId || (booking._id ? booking._id.toString() : '');

    if (!bookingOrigin || !bookingDest || !bookingIdStr) {
      return;
    }

    const routeText = `${bookingOrigin.split('(')[0].trim()} → ${bookingDest.split('(')[0].trim()}`;
    const notifTitle = 'New Bus Booking Request';
    const notifBody = `${routeText} booking request. Tap to view.`;

    // 1. Fetch ALL Active & Approved Drivers in MongoDB (DYNAMIC UNLIMITED QUERY)
    const allActiveDrivers = await Driver.find({
      driverStatus: { $in: ['Active', 'Approved'] }
    }).populate('assignedVehicle').lean();

    if (!allActiveDrivers || allActiveDrivers.length === 0) {
      console.log(`[Notification Engine] No active/approved drivers found in DB for booking ${bookingIdStr}`);
      return;
    }

    // 2. Discover ALL drivers whose assigned bus matches the booking route
    const eligibleDrivers = [];

    for (const driver of allActiveDrivers) {
      let vehicle = driver.assignedVehicle;

      // Fallback: If assignedVehicle was not populated or stored as ObjectId reference
      if (!vehicle && driver.assignedVehicle) {
        vehicle = await Vehicle.findById(driver.assignedVehicle).lean();
      }
      if (!vehicle) {
        vehicle = await Vehicle.findOne({ assignedDriver: driver._id, vehicleStatus: 'Active' }).lean();
      }

      // Ensure vehicle is Active and matches the exact origin -> destination route
      if (vehicle && vehicle.vehicleStatus === 'Active' && vehicleMatchesBookingRoute(vehicle, booking)) {
        eligibleDrivers.push({
          driver,
          vehicle
        });
      }
    }

    console.log('\n================================================================');
    console.log(`🔔 BUS BOOKING NOTIFICATION BROADCAST DISPATCH`);
    console.log(`Booking ID: ${bookingIdStr}`);
    console.log(`Route: ${routeText}`);
    console.log(`Eligible Drivers Found: ${eligibleDrivers.length}`);

    if (eligibleDrivers.length === 0) {
      console.log(`[Notification Engine] 0 eligible drivers matching route ${routeText}`);
      console.log('================================================================\n');
      return;
    }

    // 3. Parallel Dispatch to ALL Eligible Drivers with Promise.allSettled()
    let successCount = 0;
    let failureCount = 0;

    const dispatchPromises = eligibleDrivers.map(async ({ driver, vehicle }, index) => {
      const driverIdStr = driver._id.toString();
      const driverName = driver.name || 'Driver';
      const maskedName = driverName.length > 2 ? `${driverName.substring(0, 2)}***` : driverName;
      const recipientUser = driver.user?._id || driver.user || driver._id;
      const busName = vehicle.vehicleName || vehicle.vehicleNumber || 'Assigned Bus';

      // Deduplication Check: bookingId + recipientId (per-driver deduplication, NO global lock)
      const existingNotif = await Notification.findOne({
        recipientId: recipientUser,
        $or: [
          { message: { $regex: bookingIdStr } },
          { message: { $regex: routeText } }
        ]
      });

      if (!existingNotif) {
        await Notification.create({
          title: notifTitle,
          message: `${notifTitle} ${bookingIdStr}: ${routeText}`,
          recipient: `Driver: ${driverName}`,
          recipientRole: 'driver',
          recipientId: recipientUser,
          status: 'Unread'
        }).catch((err) => console.warn(`DB Notification error for ${driverName}:`, err.message));
      }

      // Check Push Token for Driver
      const token = (driver.pushToken || driver.fcmToken || '').trim();
      const hasToken = !!token;
      const maskedToken = hasToken ? `${token.substring(0, 18)}...` : 'NONE';

      let dispatchStatus = 'SKIPPED (No Token)';
      let ticketId = 'N/A';
      let errorDetail = null;

      if (hasToken) {
        try {
          const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              to: token,
              title: notifTitle,
              body: notifBody,
              data: {
                bookingId: bookingIdStr,
                screen: 'Requests'
              },
              sound: 'default',
              priority: 'high',
              channelId: 'driver-booking-requests'
            })
          });

          const pushResult = await pushResponse.json();

          if (pushResponse.ok && pushResult.data && pushResult.data[0]) {
            const ticket = pushResult.data[0];
            if (ticket.status === 'ok') {
              dispatchStatus = 'SENT (Success)';
              ticketId = ticket.id || 'OK';
              successCount++;
            } else if (ticket.status === 'error') {
              dispatchStatus = `FAILED (${ticket.message || ticket.details?.error || 'Expo Push Error'})`;
              errorDetail = ticket.message || ticket.details?.error;
              failureCount++;

              // Handle Stale Token: If DeviceNotRegistered, clear invalid token without affecting other drivers
              if (ticket.details?.error === 'DeviceNotRegistered' || ticket.message?.includes('DeviceNotRegistered')) {
                await Driver.findByIdAndUpdate(driver._id, { pushToken: null, fcmToken: null }).catch(() => {});
                console.log(`   ⚠️ Stale token cleared for ${driverName} (DeviceNotRegistered)`);
              }
            }
          } else {
            dispatchStatus = `FAILED (HTTP ${pushResponse.status})`;
            errorDetail = pushResult.errors ? JSON.stringify(pushResult.errors) : 'HTTP Failure';
            failureCount++;
          }
        } catch (fetchErr) {
          dispatchStatus = `FAILED (${fetchErr.message})`;
          errorDetail = fetchErr.message;
          failureCount++;
        }
      }

      console.log(`\n${index + 1}. Driver: ${driverName} (${maskedName})`);
      console.log(`   driverId: ${driverIdStr}`);
      console.log(`   assignedBus: ${busName} (${vehicle.vehicleNumber || 'N/A'})`);
      console.log(`   pushToken: ${maskedToken}`);
      console.log(`   status: ${dispatchStatus}`);
      if (ticketId !== 'N/A') console.log(`   ticketId: ${ticketId}`);
      if (errorDetail) console.log(`   error: ${errorDetail}`);
    });

    await Promise.allSettled(dispatchPromises);

    console.log('\n----------------------------------------------------------------');
    console.log(`Broadcast Summary for Booking ${bookingIdStr}:`);
    console.log(`Total Eligible Drivers: ${eligibleDrivers.length} | Attempted: ${eligibleDrivers.length}`);
    console.log(`Push Dispatched OK: ${successCount} | Failed/No Token: ${failureCount}`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('Error in notifyEligibleDriversForBusBooking:', error.message || error);
  }
};

module.exports = {
  normalizeLoc,
  isLocationMatch,
  vehicleMatchesBookingRoute,
  notifyEligibleDriversForBusBooking
};
