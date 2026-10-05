const Notification = require('../models/Notification');
const Driver = require('../models/Driver');
const Schedule = require('../models/Schedule');
const ServiceControl = require('../models/ServiceControl');
const { getRouteSegmentFare } = require('./routeFares');
const { isSameRoute, isEligibleForBooking, driverMatchesBookingRoute } = require('./routeMatching');



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
 * Broadcasts a route request to every eligible driver with a matching configured route.
 * Assigned vehicle identity, type, and route do not participate in driver matching.
 */
const notifyEligibleDriversForBooking = async (booking, { scheduleBooking = false } = {}) => {
  try {
    if (!booking) return;

    const serviceType = booking.serviceType;
    if (!['Bus', 'EV-Sewa', 'Car', 'Truck', 'Any'].includes(serviceType)) return;

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

    const routeText = `${bookingOrigin.split('(')[0].trim()} â†’ ${bookingDest.split('(')[0].trim()}`;
    const serviceLabel = serviceType === 'Car' && scheduleBooking ? 'Private Car' : serviceType;
    const notifTitle = `New ${serviceLabel}${scheduleBooking ? ' Schedule' : ''} Booking Request`;
    const notifBody = `${routeText} booking request. Tap to view.`;

    console.log(`[NOTIFY] booking: ${bookingIdStr}`);
    console.log(`[NOTIFY] route: ${routeText}`);

    // Match independently configured driver routes; vehicle assignment/type/routes are irrelevant.
    console.log('[NOTIFY] eligible driver query start');
    const tQueryStart = Date.now();
    const eligibleDrivers = await Driver.find({
      driverStatus: { $in: ['Active', 'Approved'] },
      isOnline: true,
      'route.origin': { $exists: true, $ne: '' },
      'route.destination': { $exists: true, $ne: '' }
    })
      .select('_id name mobileNumber driverStatus isOnline route pushToken fcmToken user')
      .populate('user', '_id name phone status')
      .lean();
    const matchedDrivers = eligibleDrivers.filter(driver =>
      driver.user &&
      driver.user.status !== 'Blocked' &&
      driverMatchesBookingRoute(driver, booking, { allowOpposite })
    );

    const tQueryEnd = Date.now();
    console.log(`[NOTIFY] eligible driver query completed: ${tQueryEnd - tQueryStart} ms`);
    console.log(`[NOTIFY] eligible drivers: ${matchedDrivers.length}`);

    console.log('[BOOKING_NOTIFY_AUDIT] ' + JSON.stringify({
      bookingId: bookingIdStr,
      customerOrigin: bookingOrigin,
      customerDestination: bookingDest,
      matchedDriverCount: matchedDrivers.length,
      matchedDriverIds: matchedDrivers.map(driver => String(driver._id)),
      matchedDriverRoutes: matchedDrivers.map(driver =>
        `${driver.route.origin} → ${driver.route.destination}`
      )
    }));

    if (matchedDrivers.length === 0) {
      console.log(`[Notification Engine] 0 eligible drivers found for route ${routeText}`);
      return;
    }

    if (scheduleBooking) {
      matchedDrivers.forEach(driver => {
        console.log('[SCHEDULE_RECIPIENT_DEBUG]', {
          bookingId: bookingIdStr,
          driverId: String(driver._id),
          driverName: driver.name,
          driverRoute: `${driver.route?.origin}->${driver.route?.destination}`,
          eligible: true,
          reason: 'service-route-eligible'
        });
      });
    }

    // Persist one typed request per driver/booking; only newly inserted requests are pushed.
    const newRequestDrivers = [];
    for (const driver of matchedDrivers) {
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
              bookingId: bookingIdStr,
              driverId: driver._id,
              origin: bookingOrigin,
              destination: bookingDest,
              status: 'Unread'
            }
          },
          { upsert: true }
        );
        if (result.upsertedCount === 1) {
          newRequestDrivers.push(driver);
        }

        if (scheduleBooking) {
          console.log('[SCHEDULE_NOTIFICATION_DB]', {
            bookingId: bookingIdStr,
            driverId: String(driver._id),
            notificationId: 'upserted',
            created: result.upsertedCount > 0
          });
        }
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    // 2. Measure and Execute Fast Batch Push Dispatch
    console.log('[NOTIFY] push dispatch start');
    const tDispatchStart = Date.now();

    console.log('[LIVE_DISPATCH_DEBUG]', {
      bookingId: bookingIdStr,
      bookingMode: booking.bookingMode,
      serviceType,
      origin: bookingOrigin,
      destination: bookingDest,
      candidateCount: newRequestDrivers.length,
      candidateDriverIds: newRequestDrivers.map(d => String(d._id)),
      candidateRoutes: newRequestDrivers.map(d => `${d.route?.origin} -> ${d.route?.destination}`)
    });

    const messages = [];
    const messageDriverMap = [];
    const driverLogResults = new Array(newRequestDrivers.length);

    for (let i = 0; i < newRequestDrivers.length; i++) {
      const driver = newRequestDrivers[i];
      const token = (driver.pushToken || driver.fcmToken || '').trim();

      console.log(`\n[ROUTE-NOTIFICATION-TRACE]`);
      console.log(`Booking: ${bookingIdStr}`);
      console.log(`Route: ${bookingOrigin} â†’ ${bookingDest}`);
      console.log(`Service Type: ${serviceType}`);
      console.log(`Driver: ${driver.name || 'Unknown'}`);
      console.log(`Driver ID: ${driver._id}`);
      console.log(`Driver Route: ${driver.route.origin} â†’ ${driver.route.destination}`);
      console.log('Route Match: true');
      console.log('Eligible: true');
      console.log(`Notification function name: notifyEligibleDriversForBooking`);

      if (token) {
        console.log(`Push DISPATCH: PREPARING`);
        const payload = {
          to: token,
          title: notifTitle,
          body: notifBody,
          data: {
            bookingId: bookingIdStr,
            eventType: 'BOOKING_REQUEST',
            type: 'BOOKING_REQUEST',
            serviceType,
            origin: bookingOrigin,
            destination: bookingDest,
            bookingMode: booking.bookingMode,
            screen: 'Requests'
          },
          sound: 'default',
          priority: 'high',
          channelId: 'driver-booking-requests'
        };
        messages.push(payload);
        messageDriverMap.push({ driver, token, originalIndex: i });

        console.log('[PUSH_SEND_DEBUG]', {
          bookingId: bookingIdStr,
          driverId: String(driver._id),
          tokenPresent: true,
          title: notifTitle,
          type: payload.data.type,
          channelId: payload.channelId
        });

        if (scheduleBooking) {
          console.log('[SCHEDULE_PUSH_DEBUG]', {
            bookingId: bookingIdStr,
            driverId: String(driver._id),
            tokenPresent: true,
            tokenPrefix: token.substring(0, 15)
          });
        }
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

            console.log('[PUSH_TICKET_DEBUG]', {
              status: ticket?.status || (!pushResponse.ok ? 'HTTP_ERROR' : 'UNKNOWN'),
              ticketId: ticket?.id || null,
              details: ticket?.details || null,
              error: errorMsg || null
            });

            console.log(`[ROUTE-NOTIFICATION-TRACE] Push ticket ID: ${ticket?.id || 'N/A'}`);
            console.log(`[ROUTE-NOTIFICATION-TRACE] Push provider result: ${isOk ? 'ok' : 'error'} - ${errorMsg || ''}`);

            if (scheduleBooking) {
              console.log('[SCHEDULE_PUSH_TICKET]', {
                status: ticket?.status || (!pushResponse.ok ? 'HTTP_ERROR' : 'UNKNOWN'),
                ticketId: ticket?.id || null,
                error: errorMsg || null
              });
            }

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
    console.log(`ðŸ”” ${serviceType.toUpperCase()} BOOKING REQUEST BROADCAST`);
    console.log(`Booking: ${bookingIdStr}`);
    console.log(`Route: ${routeText}`);
    console.log(`Eligible drivers found: ${matchedDrivers.length}\n`);

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
    console.log(`Total Eligible: ${matchedDrivers.length} | Newly notified: ${newRequestDrivers.length}`);
    console.log(`Successful: ${successfulCount} | Failed: ${failedCount}`);
    console.log(`Latency - Query: ${tQueryEnd - tQueryStart}ms | Dispatch: ${tDispatchEnd - tDispatchStart}ms`);
    console.log('================================================================\n');

    console.log('\n[ROUTE_BROADCAST_TEST]');
    console.log(`bookingId=${bookingIdStr}`);
    console.log(`bookingMode=${booking.bookingMode || 'UNKNOWN'}`);
    console.log(`paymentMethod=${booking.paymentMethod || 'UNKNOWN'}`);
    console.log(`pickup=${bookingOrigin}`);
    console.log(`drop=${bookingDest}`);
    console.log(`eligibleDriverCount=${matchedDrivers.length}`);
    console.log(`eligibleDriverIds=${matchedDrivers.map(d => String(d._id)).join(',')}`);
    console.log(`eligibleDriverRoutes=${matchedDrivers.map(d => `${d.route?.origin}->${d.route?.destination}`).join(',')}`);
    console.log(`notificationCreatedDriverIds=${newRequestDrivers.map(d => String(d._id)).join(',')}`);
    console.log(`fcmAttemptDriverIds=${driverLogResults.map(r => r ? String(r.driver._id) : '').filter(Boolean).join(',')}`);
    console.log(`fcmSuccessDriverIds=${driverLogResults.filter(r => r && r.status === 'SENT').map(r => String(r.driver._id)).join(',')}`);
    console.log(`fcmFailureDriverIds=${driverLogResults.filter(r => r && r.status && r.status.startsWith('FAILED')).map(r => String(r.driver._id)).join(',')}`);
    console.log(`requestCreatedDriverIds=${newRequestDrivers.map(d => String(d._id)).join(',')}`);
    console.log('[/ROUTE_BROADCAST_TEST]\n');

  } catch (error) {
    console.error('Error in notifyEligibleDriversForBooking:', error.message || error);
  }
};

const notifyAssignedDriverForScheduleBooking = async (booking) => {
  if (!booking || booking.bookingMode !== 'SCHEDULE') return;
  
  if (booking.serviceType !== 'Car') {
    return notifyEligibleDriversForBooking(booking, { scheduleBooking: true });
  }

  const bookingOrigin = booking.pickupLocation || booking.route?.origin || '';
  const bookingDest = booking.dropLocation || booking.route?.destination || '';
  const bookingIdStr = booking.bookingId || (booking._id ? booking._id.toString() : '');

  const scheduleId = booking.scheduleId?._id || booking.scheduleId;
  let driver = null;

  if (scheduleId) {
    const activeSchedule = await Schedule.findById(scheduleId).lean();
    if (activeSchedule && activeSchedule.driver) {
      driver = await Driver.findById(activeSchedule.driver).populate('user', '_id name phone status').lean();
    }
  }

  if (!driver && booking.driver) {
     driver = await Driver.findById(booking.driver).populate('user', '_id name phone status').lean();
  }

  console.log('[SCHEDULE_RECIPIENT_DEBUG]', {
    bookingId: bookingIdStr,
    driverId: driver ? String(driver._id) : 'none',
    driverName: driver ? driver.name : 'none',
    driverRoute: driver ? `${driver.route?.origin}->${driver.route?.destination}` : 'none',
    eligible: !!driver,
    reason: driver ? 'car-schedule-assigned-driver' : 'no-driver-found'
  });

  if (!driver) return;

  const recipientId = driver.user?._id || driver.user;
  const notifTitle = `New Scheduled Booking Request`;
  const routeText = `${bookingOrigin.split('(')[0].trim()} -> ${bookingDest.split('(')[0].trim()}`;
  
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
        bookingId: bookingIdStr,
        driverId: driver._id,
        origin: bookingOrigin,
        destination: bookingDest,
        status: 'Unread'
      }
    },
    { upsert: true }
  );

  console.log('[SCHEDULE_NOTIFICATION_DB]', {
    bookingId: bookingIdStr,
    driverId: String(driver._id),
    notificationId: 'upserted', 
    created: result.upsertedCount > 0
  });

  if (result.upsertedCount === 0) return;

  const token = (driver.pushToken || driver.fcmToken || '').trim();

  console.log('[SCHEDULE_PUSH_DEBUG]', {
    bookingId: bookingIdStr,
    driverId: String(driver._id),
    tokenPresent: !!token,
    tokenPrefix: token ? token.substring(0, 15) : 'none'
  });

  if (token) {
    try {
      const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        },
        body: JSON.stringify([{
          to: token,
          title: notifTitle,
          body: `${routeText} booking request. Tap to view.`,
          data: {
            type: 'BOOKING_REQUEST',
            bookingId: bookingIdStr,
            bookingMode: 'SCHEDULE',
            origin: bookingOrigin,
            destination: bookingDest,
            serviceType: booking.serviceType,
            screen: 'Requests'
          },
          sound: 'default',
          priority: 'high',
          channelId: 'driver-booking-requests'
        }])
      });

      const pushResult = await pushResponse.json();
      const ticket = pushResult.data && pushResult.data[0];

      console.log('[SCHEDULE_PUSH_TICKET]', {
        status: ticket?.status || 'UNKNOWN',
        ticketId: ticket?.id || 'none',
        error: ticket?.message || ticket?.details?.error || null
      });
      
    } catch (e) {
      console.error('Push send error:', e);
    }
  }
};

const notifyAssignedCarDriverForScheduleBooking = notifyAssignedDriverForScheduleBooking;

module.exports = {
  vehicleMatchesBookingRoute,
  notifyEligibleDriversForBooking,
  notifyAssignedDriverForScheduleBooking,
  notifyAssignedCarDriverForScheduleBooking,
  notifyEligibleDriversForBusBooking: notifyEligibleDriversForBooking
};
