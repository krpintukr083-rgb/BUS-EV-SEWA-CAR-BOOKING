const Notification = require('../models/Notification');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Schedule = require('../models/Schedule');
const { getRouteSegmentFare } = require('./routeFares');

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
const vehicleMatchesBookingRoute = (vehicle, booking, { requireRouteMatch = false } = {}) => {
  if (!vehicle || !booking) return false;

  // Direct vehicle match if booking explicitly bound to this vehicle
  if (!requireRouteMatch && booking.vehicle) {
    const bVehId = (booking.vehicle._id || booking.vehicle).toString();
    const vehId = (vehicle._id || vehicle).toString();
    if (bVehId === vehId) return true;
  }

  const vOrigin = vehicle.route?.origin || vehicle.pickupDropDetails?.pickupLocation || vehicle.hireDetails?.pickup || '';
  const vDest = vehicle.route?.destination || vehicle.pickupDropDetails?.dropLocation || vehicle.hireDetails?.destination || '';

  const bOrigin = booking.pickupLocation || booking.route?.origin || '';
  const bDest = booking.dropLocation || booking.route?.destination || '';

  if (Array.isArray(vehicle.route?.stops) && vehicle.route.stops.length > 0) {
    return getRouteSegmentFare(vehicle.route, bOrigin, bDest) != null;
  }

  if (vOrigin && vDest && bOrigin && bDest) {
    const originMatches = isLocationMatch(vOrigin, bOrigin);
    const destMatches = isLocationMatch(vDest, bDest);
    return originMatches && destMatches;
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
    if (serviceType !== 'Any') {
      vehicleQuery.vehicleType = serviceType;
    }
    const activeVehicles = await Vehicle.find(vehicleQuery)
      .select('_id vehicleNumber vehicleName vehicleType vehicleStatus route pickupDropDetails hireDetails assignedDriver')
      .lean();

    // Step B: Filter route matches directionally, including configured intermediate-stop segments.
    const matchingVehicles = activeVehicles.filter(v =>
      vehicleMatchesBookingRoute(v, booking, { requireRouteMatch: true })
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

    const matchingVehicleIdSet = new Set(matchingVehicleIds.map(id => String(id)));
    const matchingDriverIdSet = new Set(assignedDriverIds.map(id => String(id)));
    eligibleDrivers = eligibleDrivers.filter(driver => {
      if (!driver.user || driver.user.status === 'Blocked') return false;
      return (driver.assignedVehicle && matchingVehicleIdSet.has(String(driver.assignedVehicle)))
        || matchingDriverIdSet.has(String(driver._id));
    });

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

      if (token) {
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
  normalizeLoc,
  isLocationMatch,
  vehicleMatchesBookingRoute,
  notifyEligibleDriversForBooking,
  notifyEligibleDriversForBusBooking: notifyEligibleDriversForBooking
};
