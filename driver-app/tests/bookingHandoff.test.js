const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getAcceptedBookingId,
  getConfirmationBookings,
  getOtpBookingId,
  filterIncomingRequests
} = require('../src/utils/bookingHandoff');

const accepted = (bookingMode, _id, bookingId) => ({
  data: {
    success: true,
    data: { _id, bookingId, bookingMode }
  }
});

test('NORMAL accept response supplies the explicit confirmation booking ID', () => {
  const response = accepted('NORMAL', 'normal-mongo-id', 'BK-NORMAL');
  const id = getAcceptedBookingId(response);
  assert.equal(id, 'normal-mongo-id');
  assert.deepEqual(getConfirmationBookings([response.data.data], id, null).bookings, [response.data.data]);
});

test('SCHEDULE accept response supplies the explicit confirmation booking ID', () => {
  const response = accepted('SCHEDULE', 'schedule-mongo-id', 'BK-SCHEDULE');
  const id = getAcceptedBookingId(response);
  assert.equal(id, 'schedule-mongo-id');
  assert.deepEqual(getConfirmationBookings([response.data.data], id, null).bookings, [response.data.data]);
});

test('INSTANT accept response supplies the explicit confirmation booking ID', () => {
  const response = accepted('INSTANT', 'instant-mongo-id', 'BK-INSTANT');
  const id = getAcceptedBookingId(response);
  assert.equal(id, 'instant-mongo-id');
  assert.deepEqual(getConfirmationBookings([response.data.data], id, null).bookings, [response.data.data]);
});

test('an explicit accepted booking wins over older bookings in the active list', () => {
  const older = { _id: 'booking-a', bookingId: 'BK-A' };
  const acceptedBooking = { _id: 'booking-b', bookingId: 'BK-B' };
  const result = getConfirmationBookings([older, acceptedBooking], 'booking-b', older);
  assert.deepEqual(result.bookings, [acceptedBooking]);
  assert.equal(result.notFound, false);
});

test('a missing explicit booking does not fall back to passed or older booking data', () => {
  const older = { _id: 'booking-a', bookingId: 'BK-A' };
  const passed = { _id: 'booking-b', bookingId: 'BK-B' };
  const result = getConfirmationBookings([older], 'booking-b', passed);
  assert.deepEqual(result, { bookings: [], notFound: true });
});

test('accepted bookings remain excluded from incoming actionable requests', () => {
  const pending = { _id: 'pending', rideStatus: 'None', driverConfirmed: false, bookingStatus: 'Pending' };
  const acceptedBooking = { _id: 'accepted', rideStatus: 'Accepted', driverConfirmed: false, bookingStatus: 'Pending Driver Confirmation' };
  assert.deepEqual(filterIncomingRequests([pending, acceptedBooking]), [pending]);
});

test('OTP verification uses the explicit accepted booking ID', () => {
  const booking = { _id: 'booking-b', bookingId: 'BK-B' };
  assert.equal(getOtpBookingId(booking, 'booking-b'), 'booking-b');
  assert.equal(getOtpBookingId(booking, null), 'booking-b');
});

test('accept response ID extraction supports existing wrapped response shapes only', () => {
  assert.equal(getAcceptedBookingId({ data: { data: { bookingId: 'BK-WRAPPED' } } }), 'BK-WRAPPED');
  assert.equal(getAcceptedBookingId({ data: { booking: { _id: 'nested-id' } } }), 'nested-id');
  assert.equal(getAcceptedBookingId({ data: { data: { booking: { _id: 'nested-data-id' } } } }), 'nested-data-id');
  assert.equal(getAcceptedBookingId({ data: { success: true } }), null);
});
