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
    const exactBooking =
      findBookingById(bookings, acceptedBookingId) ||
      (passedBooking &&
      (String(passedBooking._id || '') === String(acceptedBookingId) ||
        String(passedBooking.bookingId || '') === String(acceptedBookingId))
        ? passedBooking
        : null);
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

const normalizeIncomingRequests = (requests) => {
  const byId = new Map();

  filterIncomingRequests(Array.isArray(requests) ? requests : []).forEach(request => {
    if (!request || request._id == null) return;
    const id = String(request._id);
    const existing = byId.get(id);
    if (
      !existing ||
      new Date(request.createdAt).getTime() > new Date(existing.createdAt).getTime()
    ) byId.set(id, request);
  });

  return [...byId.values()].sort((left, right) => {
    const leftCreatedAt = new Date(left.createdAt).getTime();
    const rightCreatedAt = new Date(right.createdAt).getTime();
    const leftTime = Number.isFinite(leftCreatedAt) ? leftCreatedAt : 0;
    const rightTime = Number.isFinite(rightCreatedAt) ? rightCreatedAt : 0;
    return rightTime - leftTime;
  });
};

module.exports = {
  getAcceptedBookingId,
  findBookingById,
  getConfirmationBookings,
  getOtpBookingId,
  filterIncomingRequests,
  normalizeIncomingRequests
};
