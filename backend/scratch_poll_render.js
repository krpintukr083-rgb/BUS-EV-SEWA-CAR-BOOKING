async function pollRender() {
  const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
  console.log('Testing driver booking-requests endpoint on Render...');
  
  const harshLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'harsh.driver@platform.com',
      password: 'driver123',
      role: 'driver'
    })
  });
  const harshLogin = await harshLoginRes.json();
  if (!harshLogin.token) {
    console.error('Login failed:', harshLogin);
    return;
  }

  const reqRes = await fetch(`${BASE_URL}/driver/booking-requests`, {
    headers: { Authorization: `Bearer ${harshLogin.token}` }
  });
  const reqData = await reqRes.json();
  console.log('Render driver booking-requests count:', reqData.data?.length);
  if (reqData.data && reqData.data.length > 0) {
    console.log('Found requests on Render:');
    reqData.data.forEach(r => {
      console.log(`- ${r.bookingId}: mode=${r.bookingMode}, status=${r.bookingStatus}, rideStatus=${r.rideStatus}, fare=${r.fare}, route=${r.pickupLocation}->${r.dropLocation}`);
    });
  } else {
    console.log('Requests array is still empty (build may still be in progress on Render).');
  }
}

pollRender().catch(console.error);
