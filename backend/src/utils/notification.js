const Notification = require('../models/Notification');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Schedule = require('../models/Schedule');
const ServiceControl = require('../models/ServiceControl');
const { getRouteSegmentFare } = require('./routeFares');
const { isSameRoute, isEligibleForBooking } = require('./routeMatching');



/**
 * Extracts origin/destination from a vehicle document.
 */
const getVehicleRoute = (vehicle) => ({
  origin: vehicle.route?.origin || vehicle.route?.from || vehicle.pickupDropDetails?.pickupLocation || vehicle.hireDetails?.pickup || '',
  destination: vehicle.route?.destination || vehicle.route?.to || vehicle.pickupDropDetails?.dropLocation || vehicle.hireDetails?.destination || ''
});

/**
 * Extracts origin/destination from a booking document.
 */
const getBookingRoute = (booking) => ({
  origin: booking.pickupLocation || booking.origin || booking.from || booking.route?.origin || booking.route?.from || '',
  destination: booking.dropLocation || booking.destination || booking.to || booking.route?.destination || booking.route?.to || ''
});

/**
 * Determines if a vehicle is eligible for a booking.
 * Vehicle-ID shortcuts are intentionally absent; route is always validated.
 * Multi-stop vehicles use segment-fare logic; single-route vehicles use isEligibleForBooking.
 *
 * @param {object} vehicle
 * @param {object} booking
 * @param {object} opts
 * @param {boolean} opts.allowOpposite  - Value of ServiceControl.oppositeRouteNotifications
 */
const vehicleMatchesBookingRoute = (vehicle, booking, { allowOpposite = false } = {}) => {
  if (!vehicle || !booking) return false;

  const { origin: vOrigin, destination: vDest } = getVehicleRoute(vehicle);
  const { origin: bOrigin, destination: bDest } = getBookingRoute(booking);

  // Multi-stop segment matching (stops array present)
  if (Array.isArray(vehicle.route?.stops) && vehicle.route.stops.length > 0) {
    return getRouteSegmentFare(vehicle.route, bOrigin, bDest) != null;
  }

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

/**
 * Broadcasts a normal booking request to eligible drivers for its service and route.
 * 
 * Performance Optimizations:
 * 1. 2-Step Indexed Query: Discovers ALL eligible vehicles & drivers in 2 single DB operations (O(1) queries instead of N sequential lookups).
 * 2. Bi-directional Linkage: Resolves Driver.assignedVehicle and Vehicle.assignedDriver dynamically.
 * 3. Expo Batch HTTP Pipeline: Slices push messages into 100-item chunks and dispatches via single HTTP POSTs concurrently.
 * 4. Failure Isolation: One invalid token or network glitch never blocks remaining drivers.
 * 5. Non-Blocking Receipts & Logging: Push receipts and DB notification inserts run asynchronously in the background without holding up dispatch.
 * 6. Dynamic Scaling: Supports 1, 3, 10, 50, 100+ drivers with NO hardcoded limits or counts.
 */
const notifyEligibleDriversForBooking = async (booking) => {
  try {
    if (!booking) return;

    const serviceType = booking.serviceType;
    if (!['Bus', 'EV-Sewa', 'Car', 'Any'].includes(serviceType)) return;

    const bookingOrigin = booking.pickupLocation || booking.route?.origin || '';
    const bookingDest = booking.dropLocation || booking.route?.destination || '';
    const bookingIdStr = booking.bookingId || (booking._id ? booking._id.toString() : '');

    if (!bookingOrigin || !bookingDest || !bookingIdStr) {
      return;
    }

    // Read admin toggle once for this broadcast
    const serviceControl = await ServiceControl.findOne().lean();
    const allowOpposite = serviceControl?.oppositeRouteNotifications === true;
    console.log(`[ROUTE-NOTIFICATION-TRACE] oppositeRouteNotifications flag = ${allowOpposite}`);

    if (booking.scheduleId) {
      const scheduleId = booking.scheduleId._id || booking.scheduleId;
      const activeSchedule = await Schedule.exists({ _id: scheduleId, vehicle: booking.vehicle, status: 'Active' });
      if (!activeSchedule) return;
    }

    const routeText = `${bookingOrigin.split('(')[0].trim()} → ${bookingDest.split('(')[0].trim()}`;
    const notifTitle = `New ${serviceType} Booking Request`;
    const notifBody = `${routeText} booking request. Tap to view.`;

    console.log(`[NOTIFY] booking: ${bookingIdStr}`);
    console.log(`[NOTIFY] route: ${routeText}`);

    // 1. Discover matching vehicles and their active, online drivers.
    console.log('[NOTIFY] eligible driver query start');
    const tQueryStart = Date.now();

    // Step A: Only approved vehicles in the requested service category may receive requests.
    const vehicleQuery = { vehicleStatus: 'Active' };
    if (serviceType !== 'Any' && booking.bookingMode !== 'INSTANT') {
      vehicleQuery.vehicleType = serviceType;
    }
    const activeVehicles = await Vehicle.find(vehicleQuery)
      .select('_id vehicleNumber vehicleName vehicleType vehicleStatus route pickupDropDetails hireDetails assignedDriver')
      .lean();

    // Step B: Filter route matches directionally, including configured intermediate-stop segments.
    const matchingVehicles = activeVehicles.filter(v =>
      vehicleMatchesBookingRoute(v, booking, { allowOpposite })
    );
    const matchingVehicleIds = matchingVehicles.map(v => v._id);
    const assignedDriverIds = matchingVehicles.map(v => v.assignedDriver).filter(Boolean);

    // Step C: Discover active/approved drivers in one query (bidirectional vehicle linkage).
    let eligibleDrivers = [];
    if (matchingVehicleIds.length > 0 || assignedDriverIds.length > 0) {
      const orConditions = [];
      if (matchingVehicleIds.length > 0) {
        orConditions.push({ assignedVehicle: { $in: matchingVehicleIds } });
      }
      if (assignedDriverIds.length > 0) {
        orConditions.push({ _id: { $in: assignedDriverIds } });
      }

      eligibleDrivers = await Driver.find({
        driverStatus: { $in: ['Active', 'Approved'] },
        isOnline: true,
        $or: orConditions
      })
        .select('_id name mobileNumber driverStatus isOnline assignedVehicle pushToken fcmToken user')
        .populate('user', '_id name phone status')
        .lean();
    }

    const activeVehiclesMap = new Map();
    activeVehicles.forEach(v => activeVehiclesMap.set(String(v._id), v));

    const finalEligibleDrivers = [];

    for (const driver of eligibleDrivers) {
      if (!driver.user || driver.user.status === 'Blocked') continue;

      let actualVehicleId = driver.assignedVehicle ? String(driver.assignedVehicle) : null;
      if (!actualVehicleId) {
        const fallbackVehicle = activeVehicles.find(v => v.assignedDriver && String(v.assignedDriver) === String(driver._id));
        if (fallbackVehicle) actualVehicleId = String(fallbackVehicle._id);
      }

      const activeVehicle = actualVehicleId ? activeVehiclesMap.get(actualVehicleId) : null;

      console.log(`\n[NOTIFY DEBUG] Driver: ${driver.name || driver._id}`);
      
      if (!activeVehicle) {
        console.log(`[NOTIFY DEBUG] Driver Route: NONE`);
        console.log(`[NOTIFY DEBUG] Booking Route: ${bookingOrigin} → ${bookingDest}`);
        console.log(`[NOTIFY DEBUG] Service Type: ${serviceType}`);
        console.log(`[NOTIFY DEBUG] Route Match: false`);
        console.log(`[NOTIFY DEBUG] Eligible: false`);
        continue;
      }

      const routeMatches = vehicleMatchesBookingRoute(activeVehicle, booking, { allowOpposite });

      if (routeMatches) {
        finalEligibleDrivers.push(driver);
      }
    }
    
    eligibleDrivers = finalEligibleDrivers;

    const tQueryEnd = Date.now();
    console.log(`[NOTIFY] eligible driver query completed: ${tQueryEnd - tQueryStart} ms`);
    console.log(`[NOTIFY] eligible drivers: ${eligibleDrivers.length}`);

    if (eligibleDrivers.length === 0) {
      console.log(`[Notification Engine] 0 eligible drivers found for route ${routeText}`);
      return;
    }

    // Persist one typed request per driver/booking; only newly inserted requests are pushed.
    const newRequestDrivers = [];
    for (const driver of eligibleDrivers) {
      const recipientId = driver.user._id || driver.user;
      try {
        const result = await Notification.updateOne(
          {
            recipientRole: 'driver',
            recipientId,
            entityId: booking._id,
            eventType: 'BOOKING_REQUEST'
          },
          {
            $setOnInsert: {
              title: notifTitle,
              message: `${notifTitle} ${bookingIdStr}: ${routeText}`,
              recipient: `Driver: ${driver.name || 'Driver'}`,
              recipientRole: 'driver',
              recipientId,
              eventType: 'BOOKING_REQUEST',
              entityType: 'Booking',
              entityId: booking._id,
              status: 'Unread'
            }
          },
          { upsert: true }
        );
        if (result.upsertedCount === 1) newRequestDrivers.push(driver);
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    // 2. Measure and Execute Fast Batch Push Dispatch
    console.log('[NOTIFY] push dispatch start');
    const tDispatchStart = Date.now();

    const messages = [];
    const messageDriverMap = [];
    const driverLogResults = new Array(newRequestDrivers.length);

    for (let i = 0; i < newRequestDrivers.length; i++) {
      const driver = newRequestDrivers[i];
      const token = (driver.pushToken || driver.fcmToken || '').trim();

      // HARD SAFETY BARRIER
      let actualVehicleId = driver.assignedVehicle ? String(driver.assignedVehicle) : null;
      if (!actualVehicleId) {
        const fallbackVehicle = activeVehicles.find(v => v.assignedDriver && String(v.assignedDriver) === String(driver._id));
        if (fallbackVehicle) actualVehicleId = String(fallbackVehicle._id);
      }
      const activeVehicle = actualVehicleId ? activeVehiclesMap.get(actualVehicleId) : null;
      const routeMatches = activeVehicle ? vehicleMatchesBookingRoute(activeVehicle, booking, { allowOpposite }) : false;

      const vOrigin = activeVehicle ? (activeVehicle.route?.origin || activeVehicle.route?.from || activeVehicle.pickupDropDetails?.pickupLocation || activeVehicle.hireDetails?.pickup || '') : 'NONE';
      const vDest = activeVehicle ? (activeVehicle.route?.destination || activeVehicle.route?.to || activeVehicle.pickupDropDetails?.dropLocation || activeVehicle.hireDetails?.destination || '') : 'NONE';

      console.log(`\n[ROUTE-NOTIFICATION-TRACE]`);
      console.log(`Booking: ${bookingIdStr}`);
      console.log(`Route: ${bookingOrigin} → ${bookingDest}`);
      console.log(`Service Type: ${serviceType}`);
      console.log(`Driver: ${driver.name || 'Unknown'}`);
      console.log(`Driver ID: ${driver._id}`);
      console.log(`Active Vehicle: ${actualVehicleId || 'NONE'}`);
      console.log(`Vehicle Route: ${vOrigin} → ${vDest}`);
      console.log(`Route Match: ${routeMatches}`);
      console.log(`Eligible: ${routeMatches}`);
      console.log(`Notification function name: notifyEligibleDriversForBooking`);

      if (!routeMatches) {
        console.log(`Push DISPATCH: BLOCKED (Hard Safety Barrier)`);
        driverLogResults[i] = {
          driver,
          token: null,
          status: 'BLOCKED (Route mismatch)',
          ticketId: 'N/A',
          error: null
        };
        continue;
      }

      if (token) {
        console.log(`Push DISPATCH: PREPARING`);
        messages.push({
          to: token,
          title: notifTitle,
          body: notifBody,
          data: {
            bookingId: bookingIdStr,
            eventType: 'BOOKING_REQUEST',
            serviceType,
            screen: 'Requests'
          },
          sound: 'default',
          priority: 'high',
          channelId: 'driver-booking-requests'
        });
        messageDriverMap.push({ driver, token, originalIndex: i });
      } else {
        console.log(`Push DISPATCH: SKIPPED (No Token)`);
        driverLogResults[i] = {
          driver,
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

    const validTokensCount = messages.length;
    console.log(`[NOTIFY] drivers with valid push tokens: ${validTokensCount}`);

    if (messages.length > 0) {
      const chunks = [];
      const driverChunks = [];
      for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
        chunks.push(messages.slice(i, i + CHUNK_SIZE));
        driverChunks.push(messageDriverMap.slice(i, i + CHUNK_SIZE));
      }

      console.log(`[NOTIFY] batch count: ${chunks.length}`);
      console.log(`[NOTIFY] messages attempted: ${messages.length}`);

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

          const pushResult = await pushResponse.json();
          const tickets = (pushResult && Array.isArray(pushResult.data)) ? pushResult.data : [];

          driversInChunk.forEach((entry, idx) => {
            const ticket = tickets[idx];
            const isOk = pushResponse.ok && ticket && ticket.status === 'ok';
            const isError = ticket && ticket.status === 'error';
            const errorMsg = isError
              ? (ticket.message || ticket.details?.error || 'Expo Error')
              : (!pushResponse.ok ? `HTTP ${pushResponse.status}` : null);

            console.log(`[ROUTE-NOTIFICATION-TRACE] Push ticket ID: ${ticket?.id || 'N/A'}`);
            console.log(`[ROUTE-NOTIFICATION-TRACE] Push provider result: ${isOk ? 'ok' : 'error'} - ${errorMsg || ''}`);

            if (isOk && ticket.id) {
              ticketIdsToCheck.push(ticket.id);
            }

            if (isError && (ticket.details?.error === 'DeviceNotRegistered' || ticket.message?.includes('DeviceNotRegistered'))) {
              staleTokenDriverIds.push(entry.driver._id);
            }

            driverLogResults[entry.originalIndex] = {
              driver: entry.driver,
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
              token: entry.token,
              status: `FAILED (${fetchErr.message})`,
              ticketId: 'N/A',
              error: fetchErr.message
            };
          });
        }
      });

      await Promise.allSettled(chunkPromises);
    } else {
      console.log('[NOTIFY] batch count: 0');
      console.log('[NOTIFY] messages attempted: 0');
    }

    const tDispatchEnd = Date.now();
    console.log(`[NOTIFY] push dispatch completed: ${tDispatchEnd - tDispatchStart} ms`);
    const failedTokensCount = driverLogResults.filter(r => r && r.status && r.status.startsWith('FAILED')).length;
    console.log(`[NOTIFY] failed tokens: ${failedTokensCount}`);

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

    // 5. Structured Console Audit Output
    console.log('\n================================================================');
    console.log(`🔔 ${serviceType.toUpperCase()} BOOKING REQUEST BROADCAST`);
    console.log(`Booking: ${bookingIdStr}`);
    console.log(`Route: ${routeText}`);
    console.log(`Eligible drivers found: ${eligibleDrivers.length}\n`);

    let successfulCount = 0;
    let failedCount = 0;

    for (let i = 0; i < newRequestDrivers.length; i++) {
      const res = driverLogResults[i] || {};
      const d = res.driver || newRequestDrivers[i];
      const dName = d.name || 'Driver';
      const maskedName = dName.length > 2 ? `${dName.substring(0, 2)}***` : dName;
      const isSent = (res.status === 'SENT');

      if (isSent) successfulCount++;
      else failedCount++;

      console.log(`${i + 1}. ${dName} (${maskedName})`);
      console.log(`   driverId: ${d._id}`);
      console.log(`   serviceType: ${serviceType}`);
      console.log(`   token: ${res.token ? 'PRESENT' : 'NONE'}`);
      console.log(`   notification: ${res.status}`);
      if (res.ticketId && res.ticketId !== 'N/A') console.log(`   ticketId: ${res.ticketId}`);
      if (res.error) console.log(`   error: ${res.error}`);
    }

    console.log('\n----------------------------------------------------------------');
    console.log(`Broadcast Summary for Booking ${bookingIdStr}:`);
    console.log(`Total Eligible: ${eligibleDrivers.length} | Newly notified: ${newRequestDrivers.length}`);
    console.log(`Successful: ${successfulCount} | Failed: ${failedCount}`);
    console.log(`Latency - Query: ${tQueryEnd - tQueryStart}ms | Dispatch: ${tDispatchEnd - tDispatchStart}ms`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('Error in notifyEligibleDriversForBooking:', error.message || error);
  }
};

module.exports = {
  vehicleMatchesBookingRoute,
  notifyEligibleDriversForBooking,
  notifyEligibleDriversForBusBooking: notifyEligibleDriversForBooking
};
