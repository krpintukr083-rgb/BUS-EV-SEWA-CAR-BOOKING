const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function check() {
  console.log('================================================================');
  console.log('🚌 VEHICLE & DRIVER ROUTE MATCHING AUDIT');
  console.log('================================================================\n');

  // 1. Fetch Drivers
  const harshAuth = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'harsh.driver@platform.com', password: 'driver123', role: 'driver' })
  }).then(r => r.json());
  const harshToken = harshAuth.token || harshAuth.data?.token;

  const ayushAuth = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'ayush.driver@platform.com', password: 'driver123', role: 'driver' })
  }).then(r => r.json());
  const ayushToken = ayushAuth.token || ayushAuth.data?.token;

  const pintuAuth = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'pintu.driver@platform.com', password: 'driver123', role: 'driver' })
  }).then(r => r.json());
  const pintuToken = pintuAuth.token || pintuAuth.data?.token;

  // 2. Fetch Dashboard for all 3 drivers
  const harshDash = await fetch(`${BASE_URL}/driver/dashboard`, { headers: { 'Authorization': `Bearer ${harshToken}` } }).then(r => r.json());
  const ayushDash = await fetch(`${BASE_URL}/driver/dashboard`, { headers: { 'Authorization': `Bearer ${ayushToken}` } }).then(r => r.json());
  const pintuDash = await fetch(`${BASE_URL}/driver/dashboard`, { headers: { 'Authorization': `Bearer ${pintuToken}` } }).then(r => r.json());

  console.log('HARSH DRIVER:');
  console.log('  Status:', harshDash.data?.driver?.driverStatus, '| isOnline:', harshDash.data?.driver?.isOnline);
  console.log('  Assigned Vehicle:', harshDash.data?.assignedVehicle?.vehicleNumber, '| Route:', harshDash.data?.assignedVehicle?.route);
  console.log('  Pending Count:', harshDash.data?.stats?.pendingRequestsCount);

  console.log('\nAYUSH DRIVER:');
  console.log('  Status:', ayushDash.data?.driver?.driverStatus, '| isOnline:', ayushDash.data?.driver?.isOnline);
  console.log('  Assigned Vehicle:', ayushDash.data?.assignedVehicle?.vehicleNumber, '| Route:', ayushDash.data?.assignedVehicle?.route);
  console.log('  Pending Count:', ayushDash.data?.stats?.pendingRequestsCount);

  console.log('\nPINTU DRIVER:');
  console.log('  Status:', pintuDash.data?.driver?.driverStatus, '| isOnline:', pintuDash.data?.driver?.isOnline);
  console.log('  Assigned Vehicle:', pintuDash.data?.assignedVehicle?.vehicleNumber, '| Route:', pintuDash.data?.assignedVehicle?.route);
  console.log('  Pending Count:', pintuDash.data?.stats?.pendingRequestsCount);

  // Fetch Requests for all 3
  const harshReqs = await fetch(`${BASE_URL}/driver/booking-requests`, { headers: { 'Authorization': `Bearer ${harshToken}` } }).then(r => r.json());
  const ayushReqs = await fetch(`${BASE_URL}/driver/booking-requests`, { headers: { 'Authorization': `Bearer ${ayushToken}` } }).then(r => r.json());
  const pintuReqs = await fetch(`${BASE_URL}/driver/booking-requests`, { headers: { 'Authorization': `Bearer ${pintuToken}` } }).then(r => r.json());

  console.log('\nPENDING REQUESTS LISTS:');
  console.log('  Harsh Pending Requests (', harshReqs.count, '):', (harshReqs.data || []).map(r => `${r.bookingId} (${r.pickupLocation} -> ${r.dropLocation})`));
  console.log('  Ayush Pending Requests (', ayushReqs.count, '):', (ayushReqs.data || []).map(r => `${r.bookingId} (${r.pickupLocation} -> ${r.dropLocation})`));
  console.log('  Pintu Pending Requests (', pintuReqs.count, '):', (pintuReqs.data || []).map(r => `${r.bookingId} (${r.pickupLocation} -> ${r.dropLocation})`));
}

check();
