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
 * HIGH-SPEED DYNAMIC NOTIFICATION BROADCAST ENGINE FOR BUS BOOKINGS
 * 
 * Performance Optimizations:
 * 1. 2-Step Indexed Query: Discovers ALL eligible vehicles & drivers in 2 single DB operations (O(1) queries instead of N sequential lookups).
 * 2. Bi-directional Linkage: Resolves Driver.assignedVehicle and Vehicle.assignedDriver dynamically.
 * 3. Expo Batch HTTP Pipeline: Slices push messages into 100-item chunks and dispatches via single HTTP POSTs concurrently.
 * 4. Failure Isolation: One invalid token or network glitch never blocks remaining drivers.
 * 5. Non-Blocking Receipts & Logging: Push receipts and DB notification inserts run asynchronously in the background without holding up dispatch.
 * 6. Dynamic Scaling: Supports 1, 3, 10, 50, 100+ drivers with NO hardcoded limits or counts.
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

    // 1. Measure and Execute Fast 2-Step MongoDB Query
    console.log('[NOTIFY] eligible driver query start');
    const tQueryStart = Date.now();

    // Step A: Fetch all active buses in one indexed query
    const activeBuses = await Vehicle.find({
      vehicleType: 'Bus',
      vehicleStatus: 'Active'
    })
      .select('_id vehicleNumber vehicleName vehicleType vehicleStatus route pickupDropDetails hireDetails assignedDriver')
      .lean();

    // Step B: Filter buses matching the exact origin -> destination route
    const matchingBuses = activeBuses.filter(v => vehicleMatchesBookingRoute(v, booking));
    const matchingBusIds = matchingBuses.map(v => v._id);
    const assignedDriverIds = matchingBuses.map(v => v.assignedDriver).filter(Boolean);

    // Step C: Discover ALL Active + Approved drivers in ONE single query (Bi-directional lookup)
    let eligibleDrivers = [];
    if (matchingBusIds.length > 0 || assignedDriverIds.length > 0) {
      const orConditions = [];
      if (matchingBusIds.length > 0) {
        orConditions.push({ assignedVehicle: { $in: matchingBusIds } });
      }
      if (assignedDriverIds.length > 0) {
        orConditions.push({ _id: { $in: assignedDriverIds } });
      }

      eligibleDrivers = await Driver.find({
        driverStatus: { $in: ['Active', 'Approved'] },
        $or: orConditions
      })
        .select('_id name mobileNumber driverStatus isOnline assignedVehicle pushToken fcmToken user')
        .populate('user', '_id name phone')
        .lean();
    }

    const tQueryEnd = Date.now();
    console.log(`[NOTIFY] eligible driver query completed: ${tQueryEnd - tQueryStart} ms`);
    console.log(`[NOTIFY] eligible drivers: ${eligibleDrivers.length}`);

    if (eligibleDrivers.length === 0) {
      console.log(`[Notification Engine] 0 eligible drivers found for route ${routeText}`);
      return;
    }

    // Build fast in-memory vehicle index to pair each driver with their matching bus
    const busById = new Map();
    const busByDriverId = new Map();
    for (const b of matchingBuses) {
      busById.set(b._id.toString(), b);
      if (b.assignedDriver) {
        busByDriverId.set(b.assignedDriver.toString(), b);
      }
    }

    // 2. Measure and Execute Fast Batch Push Dispatch
    console.log('[NOTIFY] push dispatch start');
    const tDispatchStart = Date.now();

    const messages = [];
    const messageDriverMap = [];
    const driverLogResults = new Array(eligibleDrivers.length);

    for (let i = 0; i < eligibleDrivers.length; i++) {
      const driver = eligibleDrivers[i];
      const token = (driver.pushToken || driver.fcmToken || '').trim();
      const driverBus = (driver.assignedVehicle && busById.get(driver.assignedVehicle.toString()))
        || busByDriverId.get(driver._id.toString())
        || {};

      if (token) {
        messages.push({
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
        });
        messageDriverMap.push({ driver, token, driverBus, originalIndex: i });
      } else {
        driverLogResults[i] = {
          driver,
          driverBus,
          token: null,
          status: 'SKIPPED (No Token)',
          ticketId: 'N/A',
          error: null
        };
      }
    }

    // Expo Push Batching: Chunk into batches of up to 100 messages per HTTP POST
    const CHUNK_SIZE = 100;
    const ticketIdsToCheck = [];
    const staleTokenDriverIds = [];

    if (messages.length > 0) {
      const chunks = [];
      const driverChunks = [];
      for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
        chunks.push(messages.slice(i, i + CHUNK_SIZE));
        driverChunks.push(messageDriverMap.slice(i, i + CHUNK_SIZE));
      }

      const chunkPromises = chunks.map(async (chunk, cIdx) => {
        const driversInChunk = driverChunks[cIdx];
        try {
          const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate'
            },
            body: JSON.stringify(chunk)
          });

          const pushResult = await pushResponse.json().catch(() => ({}));
          const tickets = (pushResult && Array.isArray(pushResult.data)) ? pushResult.data : [];

          driversInChunk.forEach((entry, idx) => {
            const ticket = tickets[idx];
            const isOk = pushResponse.ok && ticket && ticket.status === 'ok';
            const isError = ticket && ticket.status === 'error';
            const errorMsg = isError
              ? (ticket.message || ticket.details?.error || 'Expo Error')
              : (!pushResponse.ok ? `HTTP ${pushResponse.status}` : null);

            if (isOk && ticket.id) {
              ticketIdsToCheck.push(ticket.id);
            }

            if (isError && (ticket.details?.error === 'DeviceNotRegistered' || ticket.message?.includes('DeviceNotRegistered'))) {
              staleTokenDriverIds.push(entry.driver._id);
            }

            driverLogResults[entry.originalIndex] = {
              driver: entry.driver,
              driverBus: entry.driverBus,
              token: entry.token,
              status: isOk ? 'SENT' : `FAILED (${errorMsg || 'Error'})`,
              ticketId: ticket?.id || (isOk ? 'OK' : 'N/A'),
              error: errorMsg
            };
          });
        } catch (fetchErr) {
          driversInChunk.forEach((entry) => {
            driverLogResults[entry.originalIndex] = {
              driver: entry.driver,
              driverBus: entry.driverBus,
              token: entry.token,
              status: `FAILED (${fetchErr.message})`,
              ticketId: 'N/A',
              error: fetchErr.message
            };
          });
        }
      });

      await Promise.allSettled(chunkPromises);
    }

    const tDispatchEnd = Date.now();
    console.log(`[NOTIFY] push dispatch completed: ${tDispatchEnd - tDispatchStart} ms`);

    // 3. Clear Stale Tokens Asynchronously (Non-blocking)
    if (staleTokenDriverIds.length > 0) {
      Driver.updateMany(
        { _id: { $in: staleTokenDriverIds } },
        { $set: { pushToken: null, fcmToken: null } }
      ).catch((err) => console.warn('Error clearing stale tokens:', err.message));
    }

    // 4. Record Push Tickets & Verify Receipts Asynchronously (Non-blocking)
    if (ticketIdsToCheck.length > 0) {
      setTimeout(async () => {
        try {
          const receiptResponse = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ ids: ticketIdsToCheck })
          });
          const receiptResult = await receiptResponse.json().catch(() => ({}));
          if (receiptResult.data) {
            console.log(`[Receipts Background] Verified ${Object.keys(receiptResult.data).length} of ${ticketIdsToCheck.length} push receipts.`);
          }
        } catch (rErr) {
          console.warn('[Receipts Background] Error querying receipts:', rErr.message);
        }
      }, 15000);
    }

    // 5. In-App Notification Records (Bulk Asynchronous Insert - Non-blocking)
    (async () => {
      try {
        const notifDocs = eligibleDrivers.map(d => ({
          title: notifTitle,
          message: `${notifTitle} ${bookingIdStr}: ${routeText}`,
          recipient: `Driver: ${d.name || 'Driver'}`,
          recipientRole: 'driver',
          recipientId: d.user?._id || d.user || d._id,
          status: 'Unread'
        }));
        await Notification.insertMany(notifDocs, { ordered: false }).catch(() => {});
      } catch (e) {}
    })();

    // 6. Structured Console Audit Output
    console.log('\n================================================================');
    console.log(`🔔 BUS BOOKING NOTIFICATION BROADCAST DISPATCH`);
    console.log(`Booking: ${bookingIdStr}`);
    console.log(`Route: ${routeText}`);
    console.log(`Eligible drivers found: ${eligibleDrivers.length}\n`);

    let successfulCount = 0;
    let failedCount = 0;

    for (let i = 0; i < eligibleDrivers.length; i++) {
      const res = driverLogResults[i] || {};
      const d = res.driver || eligibleDrivers[i];
      const dName = d.name || 'Driver';
      const maskedName = dName.length > 2 ? `${dName.substring(0, 2)}***` : dName;
      const bus = res.driverBus || {};
      const isSent = (res.status === 'SENT');

      if (isSent) successfulCount++;
      else failedCount++;

      console.log(`${i + 1}. ${dName} (${maskedName})`);
      console.log(`   driverId: ${d._id}`);
      console.log(`   assignedBus: ${bus.vehicleName || 'Bus'} (${bus.vehicleNumber || 'N/A'})`);
      console.log(`   token: ${res.token ? 'PRESENT' : 'NONE'}`);
      console.log(`   notification: ${res.status}`);
      if (res.ticketId && res.ticketId !== 'N/A') console.log(`   ticketId: ${res.ticketId}`);
      if (res.error) console.log(`   error: ${res.error}`);
    }

    console.log('\n----------------------------------------------------------------');
    console.log(`Broadcast Summary for Booking ${bookingIdStr}:`);
    console.log(`Total Eligible: ${eligibleDrivers.length} | Attempted: ${eligibleDrivers.length}`);
    console.log(`Successful: ${successfulCount} | Failed: ${failedCount}`);
    console.log(`Latency - Query: ${tQueryEnd - tQueryStart}ms | Dispatch: ${tDispatchEnd - tDispatchStart}ms`);
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
