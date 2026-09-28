// fareResolver utility
export const getBookingDisplayFare = (booking) => {
  if (!booking) return undefined;
  // priority: finalFare, fare, totalFare
  const candidates = [booking.finalFare, booking.fare, booking.totalFare];
  for (const val of candidates) {
    const num = Number(val);
    if (!isNaN(num) && num > 0) return num;
  }
  return undefined;
};
