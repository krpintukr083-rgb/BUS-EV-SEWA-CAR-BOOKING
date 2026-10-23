const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getBookingDateKey = (travelDate, fallbackDate) => {
  const raw = travelDate || fallbackDate;
  if (!raw) return null;

  // Pure date string without time (e.g. "2026-10-13")
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return raw.trim();
  }

  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : getLocalDateKey(date);
};

const filterBookingsForLocalDate = (bookings, date = new Date()) => {
  if (!Array.isArray(bookings)) return [];
  const todayKey = getLocalDateKey(date);
  return bookings.filter(booking => {
    const key = getBookingDateKey(booking.travelDate, booking.createdAt);
    return key === todayKey;
  });
};

const formatBookingDate = (travelDate, fallbackDate) => {
  const raw = travelDate || fallbackDate;
  if (!raw) return 'Date unavailable';
  const key = getBookingDateKey(raw);
  if (!key) return 'Date unavailable';
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

module.exports = {
  filterBookingsForLocalDate,
  formatBookingDate,
  getLocalDateKey,
  getBookingDateKey
};
