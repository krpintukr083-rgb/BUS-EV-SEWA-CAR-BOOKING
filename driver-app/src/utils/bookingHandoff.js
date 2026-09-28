const getAcceptedBookingId = (response) => {
  const responseBooking = response?.data?.data;
  const nestedBooking = response?.data?.booking;
  const dataBooking = responseBooking?.booking;
  const bookings = [responseBooking, dataBooking, nestedBooking];
  const id = bookings
    .map(booking => booking?._id || booking?.bookingId)
    .find(value => value != null);

  return id == null ? null : String(id);
};

const findBookingById = (bookings, bookingId) => {
  if (!bookingId || !Array.isArray(bookings)) return null;
  const expectedId = String(bookingId);

  return bookings.find(booking =>
    String(booking?._id || '') === expectedId ||
    String(booking?.bookingId || '') === expectedId
  ) || null;
};

const getConfirmationBookings = (bookings, acceptedBookingId, passedBooking) => {
  if (acceptedBookingId) {
    const exactBooking = findBookingById(bookings, acceptedBookingId);
    return {
      bookings: exactBooking ? [exactBooking] : [],
      notFound: !exactBooking
    };
  }

  if (!passedBooking) {
    return { bookings: Array.isArray(bookings) ? bookings : [], notFound: false };
  }

  const exactPassedBooking = findBookingById(bookings, passedBooking._id || passedBooking.bookingId);
  const selectedBooking = exactPassedBooking || passedBooking;
  const remainingBookings = (Array.isArray(bookings) ? bookings : []).filter(booking =>
    !(
      (selectedBooking._id && String(booking?._id) === String(selectedBooking._id)) ||
      (selectedBooking.bookingId && booking?.bookingId === selectedBooking.bookingId)
    )
  );

  return {
    bookings: [selectedBooking, ...remainingBookings],
    notFound: false
  };
};

const getOtpBookingId = (booking, acceptedBookingId) =>
  acceptedBookingId || booking?._id || booking?.bookingId || null;

const filterIncomingRequests = (requests) => requests.filter(
  request => !request.driverConfirmed
    && request.rideStatus !== 'Accepted'
    && request.bookingStatus !== 'Confirmed'
    && request.bookingStatus !== 'Awaiting Cash Collection'
    && !request.cashCollected
);

module.exports = {
  getAcceptedBookingId,
  findBookingById,
  getConfirmationBookings,
  getOtpBookingId,
  filterIncomingRequests
};
