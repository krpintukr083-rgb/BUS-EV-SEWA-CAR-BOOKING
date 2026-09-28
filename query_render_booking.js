const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function check() {
  const custAuth = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'harr@gmail.com', password: 'singhsi8@', role: 'customer' })
  }).then(r => r.json());

  console.log('Customer logged in:', custAuth.user?.name);
  const custToken = custAuth.token;

  const myBookings = await fetch(`${BASE_URL}/customer/my-bookings`, {
    headers: { 'Authorization': `Bearer ${custToken}` }
  }).then(r => r.json());

  console.log('Total bookings returned:', myBookings.data?.upcoming?.length || (Array.isArray(myBookings.data) ? myBookings.data.length : 0));
  const list = myBookings.data?.upcoming || myBookings.data || [];
  for (const b of list) {
    console.log({
      bookingId: b.bookingId,
      status: b.bookingStatus,
      payment: b.paymentStatus,
      otp: b.confirmationOtp || b.customerViewOtp,
      vehicle: b.vehicle?.vehicleNumber || b.vehicle,
      route: `${b.pickupLocation} -> ${b.dropLocation}`,
      assignedDriver: b.assignedDriver
    });
  }
}

check().catch(console.error);
