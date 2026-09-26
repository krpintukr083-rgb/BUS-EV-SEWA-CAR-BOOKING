const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getBookingDateKey = travelDate => {
  if (!travelDate) return null;
  if (typeof travelDate === 'string') {
    const datePrefix = travelDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (datePrefix) return `${datePrefix[1]}-${datePrefix[2]}-${datePrefix[3]}`;
  }

  const date = travelDate instanceof Date ? travelDate : new Date(travelDate);
  return Number.isNaN(date.getTime()) ? null : getLocalDateKey(date);
};

const filterBookingsForLocalDate = (bookings, date = new Date()) => {
  const todayKey = getLocalDateKey(date);
  return bookings.filter(booking => getBookingDateKey(booking.travelDate) === todayKey);
};

const formatBookingDate = travelDate => {
  const key = getBookingDateKey(travelDate);
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
  formatBookingDate
};
