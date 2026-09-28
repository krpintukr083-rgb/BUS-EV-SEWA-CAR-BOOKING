const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function check() {
  const harshAuth = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'harsh.driver@platform.com', password: 'driver123', role: 'driver' })
  }).then(r => r.json());
  const harshToken = harshAuth.token || harshAuth.data?.token;

  const res = await fetch(`${BASE_URL}/driver/booking-requests`, {
    headers: { 'Authorization': `Bearer ${harshToken}` }
  }).then(r => r.json());

  console.log('Total pending requests count:', res.count);
  const found = (res.data || []).find(r => r.bookingId === 'BK-5993241');
  console.log('Found BK-5993241 in Harsh requests:', !!found);
  if (found) {
    console.log('Booking details:', {
      _id: found._id,
      bookingId: found.bookingId,
      bookingMode: found.bookingMode,
      bookingType: found.bookingType,
      serviceType: found.serviceType,
      pickup: found.pickupLocation,
      drop: found.dropLocation,
      fare: found.fare,
      driverConfirmed: found.driverConfirmed,
      rideStatus: found.rideStatus,
      confirmationOtp: found.confirmationOtp
    });
  } else {
    console.log('Last 5 booking IDs in list:', (res.data || []).slice(-5).map(r => r.bookingId));
  }
}

check().catch(console.error);
