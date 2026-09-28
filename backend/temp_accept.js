exports.acceptBookingRequest = async (req, res, next) => {
  try {
    const driver = req.driver;
    const { id } = req.params;

    const booking = await Booking.findOne(getBookingQuery(id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking request not found' });
    }

    // Driver Data Isolation & Vehicle Assignment Security Barrier
    const isAuthorized = await verifyDriverVehicleAccess(driver, booking);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept bookings for this vehicle'
      });
    }

    // Prevent accepting already accepted/confirmed bookings
    if (['Confirmed', 'Completed', 'Cancelled', 'Rejected'].includes(booking.bookingStatus) || booking.driverConfirmed || booking.confirmationOtpVerifiedAt || booking.rideStatus === 'Accepted') {
      if (booking.driver && booking.driver.toString() === driver._id.toString()) {
        return res.json({
          success: true,
          message: 'Booking already accepted by this driver',
          data: driverBookingResponse(booking, driver.canViewCustomerPhone === true)
        });
      }
      return res.status(400).json({
        success: false,
        message: `Booking is already in '${booking.bookingStatus}' status and cannot be accepted again.`
      });
    }

    // Explicit bookingMode branching for active conflict evaluation
    const isInstant = booking.bookingMode === 'INSTANT';

    if (isInstant) {
      // INSTANT BOOKING CONFLICT RULE:
      // A driver cannot accept multiple simultaneous active instant bookings.
      const activeInstantBooking = await Booking.findOne({
        _id: { $ne: booking._id },
        driver: driver._id,
        bookingMode: 'INSTANT',
        rideStatus: { $in: ['Accepted', 'Arrived', 'Started'] }
      }).select('bookingId bookingStatus rideStatus').lean();

      if (activeInstantBooking) {
        return res.status(409).json({
          success: false,
          code: 'DRIVER_HAS_ACTIVE_INSTANT_BOOKING',
          message: 'This driver has already accepted another instant booking.'
        });
      }
    } else {
      // SCHEDULE BOOKING CONFLICT RULE:
      // Schedule bookings are NOT blocked by active instant bookings.
      // Schedule bookings are evaluated using their own booking mode, travel date/time,
      // assigned vehicle/driver, and existing schedule availability rules.
      if (booking.driver && booking.driver.toString() !== driver._id.toString()) {
        return res.status(409).json({
          success: false,
          message: 'This schedule booking request has already been assigned to another driver.'
        });
      }
    }

    let assignedVehicleId = driver.assignedVehicle ? (driver.assignedVehicle._id || driver.assignedVehicle) : null;
    if (!assignedVehicleId) {
      let vByDriver = await Vehicle.findOne({ assignedDriver: driver._id, vehicleStatus: 'Active' }).select('_id').lean();
      if (!vByDriver) {
         vByDriver = await Vehicle.findOne({ assignedDriver: driver._id }).sort({ createdAt: -1 }).select('_id').lean();
      }
      if (vByDriver) assignedVehicleId = vByDriver._id;
    }
    const assignedVehicle = assignedVehicleId ? await Vehicle.findById(assignedVehicleId).lean() : null;

    const finalServiceType = booking.serviceType === 'Any' && assignedVehicle ? assignedVehicle.vehicleType : booking.serviceType;
    const isBus = finalServiceType === 'Bus';
    const isOfflineCash = booking.paymentMethod === 'Offline Cash' || booking.paymentMethod === 'Cash';
    const isPaid = booking.paymentStatus === 'Paid' || booking.paymentStatus === 'Successful';

    let nextBookingStatus;
    if (isBus) {
      if (isPaid) {
        nextBookingStatus = 'Confirmed';
      } else {
        nextBookingStatus = 'Pending Driver Confirmation';
      }
    } else {
      // Car / EV-Sewa ride flow
      nextBookingStatus = 'Ongoing';
    }


    const updateSet = {
      driver: driver._id,
      assignedDriverId: driver._id,
      driverConfirmationStatus: 'Pending',
      driverConfirmed: false,
      rideStatus: 'Accepted',
      bookingStatus: nextBookingStatus
    };

    if (booking.bookingMode === 'INSTANT' && (booking.serviceType === 'Any' || !booking.vehicle) && assignedVehicle) {
      updateSet.vehicle = assignedVehicle._id;
      updateSet.serviceType = assignedVehicle.vehicleType;
      
      const { getRouteSegmentFare } = require('../utils/routeFares');
      let fare = assignedVehicle.fareRate || assignedVehicle.fare || 0;
      if (Array.isArray(assignedVehicle.route?.stops) && assignedVehicle.route.stops.length > 0) {
        const segFare = getRouteSegmentFare(assignedVehicle.route, booking.pickupLocation, booking.dropLocation);
        if (segFare != null) fare = segFare;
      }
      
      const passCount = booking.passengerDetails?.length || 1;
      updateSet.fare = fare * passCount;
      updateSet.originalFare = fare * passCount;
      updateSet.finalFare = fare * passCount;
    }

    let claimedBooking;
    try {
      claimedBooking = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          driverConfirmed: { $ne: true },
          driverConfirmationStatus: { $ne: 'Confirmed' },
          confirmationOtpVerifiedAt: null,
          otpVerified: { $ne: true },
          cashCollected: { $ne: true },
          rideStatus: { $ne: 'Accepted' },
          bookingStatus: {
            $in: ['Pending Driver Confirmation', 'Pending', 'Pending Admin Confirmation', 'Admin Confirmed', 'ADMIN_CONFIRMED']
          },
          driver: { $in: [null, driver._id] }
        },
        { $set: updateSet },
        { new: true }
      );
    } catch (error) {
      console.error('!!! ACCEPT RIDE DB ERROR:', error);
      console.error('!!! DRIVER ID:', driver._id);
      require('fs').writeFileSync('accept_ride_error.json', JSON.stringify({
        error: error.message,
        code: error.code,
        driverId: driver._id,
        bookingMode: booking.bookingMode,
        rawError: error
      }, null, 2));
      if (
        booking.bookingMode === 'INSTANT' &&
        error.code === 11000 &&
        error.message.includes('one_active_instant_booking_per_driver')
      ) {
        return res.status(409).json({
          success: false,
          message: 'This driver has already accepted another instant booking.'
        });
      }
      throw error;
    }
    if (!claimedBooking) {
      const freshBooking = await Booking.findById(booking._id).lean();
      if (freshBooking && freshBooking.driver && freshBooking.driver.toString() === driver._id.toString()) {
        return res.json({
          success: true,
          message: 'Booking already accepted by this driver',
          data: driverBookingResponse(freshBooking, driver.canViewCustomerPhone === true)
        });
      }
      return res.status(409).json({
        success: false,
        message: 'This booking request has already been accepted by another driver.'
      });
    }
    booking.set(claimedBooking.toObject());

    // Create customer notification
    const customerId = await getValidRecipientId(booking);
    const customerName = booking.customer?.name || (typeof booking.customer === 'string' ? booking.customer : 'Customer');
    await Notification.create({
      title: booking.bookingStatus === 'Confirmed' ? 'Booking Confirmed!' : 'Ride Request Accepted',
      message: `Your booking #${booking.bookingId} has been accepted by driver ${driver.name}. Pickup: ${booking.pickupLocation}`,
      recipient: `Customer: ${customerName}`,
      recipientRole: 'customer',
      ...(customerId ? { recipientId: customerId } : {}),
      status: 'Unread'
    });

    // Send push notification to Customer for real-time fare update
    if (customerId && booking.bookingMode === 'INSTANT') {
      try {
        const User = require('../models/User');
        const custUser = await User.findById(customerId).select('pushToken fcmToken');
        if (custUser && (custUser.pushToken || custUser.fcmToken)) {
          const custToken = (custUser.pushToken || custUser.fcmToken).trim();
          if (custToken) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                to: custToken,
                title: 'Instant Booking Fare Calculated',
                body: `Driver ${driver.name} accepted. Final fare is ₹${updateSet.finalFare}. Tap to view.`,
                data: {
                  type: 'INSTANT_BOOKING_FARE_UPDATED',
                  bookingId: booking._id.toString()
                },
                sound: 'default',
                priority: 'high',
                channelId: 'customer-booking-updates'
              })
            });
          }
        }
      } catch (pushErr) {
        console.warn('Customer push notification failed:', pushErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Booking request accepted successfully',
      data: {
        ...driverBookingResponse(booking, driver.canViewCustomerPhone === true),
        rideStatus: booking.rideStatus,
        pickupNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.pickupLocation)}`,
        dropNavigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.dropLocation)}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject Booking Request
// @route   POST /api/driver/booking-requests/:id/reject, POST /api/driver/requests/:id/reject
// @access  Private (Driver Only)
