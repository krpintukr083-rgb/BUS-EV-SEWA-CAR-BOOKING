const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
const crypto = require('crypto');

async function run() {
  const adminAuth = await fetch(BASE_URL + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@platform.com', password: 'admin123', role: 'admin' })
  }).then(r=>r.json());
  const aToken = adminAuth.token;

  const uniqueA = crypto.randomBytes(4).toString('hex');
  const uniqueB = crypto.randomBytes(4).toString('hex');

  const custAuth = await fetch(BASE_URL + '/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Cust ' + uniqueA, email: `cust_${uniqueA}@test.com`, phone: '+9199988' + Math.floor(10000+Math.random()*90000), password: 'user123', role: 'customer' })
  }).then(r=>r.json());
  const cToken = custAuth.data ? custAuth.data.token : custAuth.token;

  // Create Driver A
  const dARes = await fetch(BASE_URL + '/admin/drivers', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aToken },
    body: JSON.stringify({
      name: 'Driver A ' + uniqueA,
      email: `drivera_${uniqueA}@test.com`,
      mobileNumber: '+91999' + Math.floor(1000000 + Math.random() * 9000000),
      password: 'password123',
      drivingLicenceNumber: 'DL-' + uniqueA
    })
  }).then(r=>r.json());
  console.log('Driver A created:', dARes.success);
  const driverAId = dARes.data._id;

  // Create Driver B
  const dBRes = await fetch(BASE_URL + '/admin/drivers', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aToken },
    body: JSON.stringify({
      name: 'Driver B ' + uniqueB,
      email: `driverb_${uniqueB}@test.com`,
      mobileNumber: '+91999' + Math.floor(1000000 + Math.random() * 9000000),
      password: 'password123',
      drivingLicenceNumber: 'DL-' + uniqueB
    })
  }).then(r=>r.json());
  console.log('Driver B created:', dBRes.success);
  const driverBId = dBRes.data._id;

  // Approve Drivers
  await fetch(BASE_URL + '/admin/drivers/' + driverAId + '/status', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aToken },
    body: JSON.stringify({ status: 'Approved' })
  });
  await fetch(BASE_URL + '/admin/drivers/' + driverBId + '/status', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aToken },
    body: JSON.stringify({ status: 'Approved' })
  });

  // Create Vehicle A (Delhi -> Jaipur)
  const vARes = await fetch(BASE_URL + '/admin/vehicles', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aToken },
    body: JSON.stringify({
      vehicleNumber: 'V-A-' + uniqueA,
      vehicleName: 'Bus A ' + uniqueA,
      vehicleType: 'Bus',
      seatingCapacity: 40,
      assignedDriver: driverAId,
      vehicleStatus: 'Active',
      route: { origin: 'Delhi', destination: 'Jaipur' }
    })
  }).then(r=>r.json());
  console.log('Vehicle A created:', vARes.success);

  // Create Vehicle B (Jaipur -> Delhi)
  const vBRes = await fetch(BASE_URL + '/admin/vehicles', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aToken },
    body: JSON.stringify({
      vehicleNumber: 'V-B-' + uniqueB,
      vehicleName: 'Bus B ' + uniqueB,
      vehicleType: 'Bus',
      seatingCapacity: 40,
      assignedDriver: driverBId,
      vehicleStatus: 'Active',
      route: { origin: 'Jaipur', destination: 'Delhi' }
    })
  }).then(r=>r.json());
  console.log('Vehicle B created:', vBRes.success);

  // Login as Drivers to get their tokens
  const dALogin = await fetch(BASE_URL + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: `drivera_${uniqueA}@test.com`, password: 'password123', role: 'driver' })
  }).then(r=>r.json());
  const tokenA = dALogin.data ? dALogin.data.token : dALogin.token;

  const dBLogin = await fetch(BASE_URL + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: `driverb_${uniqueB}@test.com`, password: 'password123', role: 'driver' })
  }).then(r=>r.json());
  const tokenB = dBLogin.data ? dBLogin.data.token : dBLogin.token;

  // Set Online
  await fetch(BASE_URL + '/driver/online-status', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenA },
    body: JSON.stringify({ isOnline: true })
  });
  await fetch(BASE_URL + '/driver/online-status', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokenB },
    body: JSON.stringify({ isOnline: true })
  });

  // Create Instant Booking (Delhi -> Jaipur)
  const bRes = await fetch(BASE_URL + '/bookings/instant', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cToken },
    body: JSON.stringify({
      serviceType: 'Bus',
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      passengerDetails: [{ name: 'Test', age: 30, gender: 'Male' }]
    })
  }).then(r=>r.json());
  console.log('Booking created:', bRes);
  const bookingId = bRes.data?._id;

  // Wait a moment for notifications
  await new Promise(r => setTimeout(r, 2000));

  // Check Driver A Dashboard
  const dashA = await fetch(BASE_URL + '/driver/dashboard', {
    headers: { 'Authorization': 'Bearer ' + tokenA }
  }).then(r=>r.json());
  const hasA = dashA.data?.bookingRequests?.some(b => b._id === bookingId);
  console.log('Driver A (Delhi->Jaipur) received via API:', hasA ? 'YES' : 'NO');

  // Check Driver B Dashboard
  const dashB = await fetch(BASE_URL + '/driver/dashboard', {
    headers: { 'Authorization': 'Bearer ' + tokenB }
  }).then(r=>r.json());
  const hasB = dashB.data?.bookingRequests?.some(b => b._id === bookingId);
  console.log('Driver B (Jaipur->Delhi) received via API:', hasB ? 'YES' : 'NO');
}
run().catch(console.error);
