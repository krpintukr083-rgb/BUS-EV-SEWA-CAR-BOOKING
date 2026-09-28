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

const getActiveInstantBookingFilter = () => ({
  bookingMode: 'INSTANT',
  bookingStatus: { $in: ACTIVE_INSTANT_BOOKING_STATUSES },
  rideStatus: { $in: ACTIVE_INSTANT_RIDE_STATUSES },
  driverConfirmationStatus: { $in: ACTIVE_INSTANT_DRIVER_CONFIRMATION_STATUSES },
  cancellationStatus: { $in: ACTIVE_INSTANT_CANCELLATION_STATUSES },
  paymentStatus: { $in: ACTIVE_INSTANT_PAYMENT_STATUSES },
  completedAt: null
});

const getActiveInstantBookingQuery = (driver) => ({
  driver,
  ...getActiveInstantBookingFilter()
});

module.exports = {
  ACTIVE_INSTANT_BOOKING_STATUSES,
  ACTIVE_INSTANT_RIDE_STATUSES,
  ACTIVE_INSTANT_DRIVER_CONFIRMATION_STATUSES,
  ACTIVE_INSTANT_CANCELLATION_STATUSES,
  ACTIVE_INSTANT_PAYMENT_STATUSES,
  getActiveInstantBookingFilter,
  getActiveInstantBookingQuery
};
