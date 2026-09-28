async function checkPendingBookings() {
  const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
  let adminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@platform.com', password: 'adminpassword', role: 'admin' })
  });
  let adminData = await adminRes.json();
  if (!adminData.token) {
    adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@platform.com', password: 'admin123', role: 'admin' })
    });
    adminData = await adminRes.json();
  }
  const adminToken = adminData.token;

  const bookingsRes = await fetch(`${BASE_URL}/admin/bookings`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const bookingsData = await bookingsRes.json();
  const allBookings = bookingsData.data || bookingsData.bookings || [];

  const pending = allBookings.filter(b => b.bookingStatus === 'Pending Driver Confirmation');
  console.log(`Found ${pending.length} bookings in Pending Driver Confirmation:`);
  pending.forEach(b => {
    console.log(`- ${b.bookingId}: mode=${b.bookingMode}, driver=${b.driver?._id || b.driver}, vehicle=${b.vehicle?._id || b.vehicle}, rideStatus=${b.rideStatus}, confirmed=${b.driverConfirmed}, created=${b.createdAt}`);
  });
}

checkPendingBookings().catch(console.error);
