const ACTIVE_INSTANT_BOOKING_STATUSES = [
  'Pending Admin Confirmation',
  'PENDING_ADMIN_CONFIRMATION',
  'Admin Confirmed',
  'ADMIN_CONFIRMED',
  'Pending',
  'Pending Driver Confirmation',
  'Awaiting Cash Collection',
  'Confirmed',
  'Ongoing'
];

const ACTIVE_INSTANT_RIDE_STATUSES = ['Accepted', 'Arrived', 'Started', 'Ongoing'];
const ACTIVE_INSTANT_DRIVER_CONFIRMATION_STATUSES = ['Pending', 'Confirmed'];
const ACTIVE_INSTANT_CANCELLATION_STATUSES = ['None', 'Requested'];
const ACTIVE_INSTANT_PAYMENT_STATUSES = ['Pending', 'Pending Cash', 'Paid', 'Successful'];

const getActiveInstantBookingFilter = () => {
  // Treat bookings older than 6 hours as stale/abandoned so they don't block new Instant requests
  const staleThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000);

  return {
    bookingMode: 'INSTANT',
    bookingStatus: { $in: ACTIVE_INSTANT_BOOKING_STATUSES },
    rideStatus: { $in: ACTIVE_INSTANT_RIDE_STATUSES },
    driverConfirmationStatus: { $in: ACTIVE_INSTANT_DRIVER_CONFIRMATION_STATUSES },
    cancellationStatus: { $in: ACTIVE_INSTANT_CANCELLATION_STATUSES },
    paymentStatus: { $in: ACTIVE_INSTANT_PAYMENT_STATUSES },
    completedAt: null,
    createdAt: { $gte: staleThreshold }
  };
};

const getActiveInstantBookingQuery = (driver) => ({
  driver,
  ...getActiveInstantBookingFilter()
});

const getActiveReservedSeats = async (vehicleId) => {
  const mongoose = require('mongoose');
  const Booking = mongoose.model('Booking');
  
  const activeInstantBookings = await Booking.find({
    vehicle: vehicleId,
    ...getActiveInstantBookingFilter()
  }).select('passengerDetails').lean();

  let reserved = 0;
  for (const b of activeInstantBookings) {
    if (b.passengerDetails && b.passengerDetails.length > 0) {
      reserved += b.passengerDetails.length;
    } else {
      reserved += 1;
    }
  }
  return reserved;
};

module.exports = {
  ACTIVE_INSTANT_BOOKING_STATUSES,
  ACTIVE_INSTANT_RIDE_STATUSES,
  ACTIVE_INSTANT_DRIVER_CONFIRMATION_STATUSES,
  ACTIVE_INSTANT_CANCELLATION_STATUSES,
  ACTIVE_INSTANT_PAYMENT_STATUSES,
  getActiveInstantBookingFilter,
  getActiveInstantBookingQuery,
  getActiveReservedSeats
};
