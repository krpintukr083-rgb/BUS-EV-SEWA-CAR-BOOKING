const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function diagnose() {
  console.log('================================================================');
  console.log('🔍 DIAGNOSING PENDING BOOKING REQUESTS API & UI DISCREPANCY');
  console.log('================================================================\n');

  // 1. Authenticate Harsh Driver
  const harshAuth = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'harsh.driver@platform.com', password: 'driver123', role: 'driver' })
  }).then(r => r.json());
  const harshToken = harshAuth.token || harshAuth.data?.token;
  console.log('Harsh Logged In:', Boolean(harshToken));

  // 2. Fetch Dashboard & Booking Requests for Harsh BEFORE creating new booking
  const dashBefore = await fetch(`${BASE_URL}/driver/dashboard`, {
    headers: { 'Authorization': `Bearer ${harshToken}` }
  }).then(r => r.json());

  const reqsBefore = await fetch(`${BASE_URL}/driver/booking-requests`, {
    headers: { 'Authorization': `Bearer ${harshToken}` }
  }).then(r => r.json());

  console.log('BEFORE NEW BOOKING:');
  console.log('  Dashboard pendingRequestsCount:', dashBefore.data?.stats?.pendingRequestsCount);
  console.log('  Dashboard bookingRequests count:', dashBefore.data?.bookingRequests?.length);
  console.log('  BookingRequests API count:', reqsBefore.count, '| data length:', reqsBefore.data?.length);
  console.log('  BookingRequests IDs:', (reqsBefore.data || []).map(r => r.bookingId || r._id));

  // 3. Authenticate Customer & Create BRAND NEW Bus Booking
  const custAuth = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'harsh.customer@example.com', password: 'customer123', role: 'customer' })
  }).then(r => r.json());
  const custToken = custAuth.token || custAuth.data?.token;

  const vehicles = await fetch(`${BASE_URL}/vehicles`).then(r => r.json()).then(r => r.data || r);
  const targetBus = Array.isArray(vehicles) ? vehicles.find(v => v.vehicleType === 'Bus') : vehicles[0];

  const seatName = `H${Math.floor(10 + Math.random() * 80)}`;
  const newBooking = await fetch(`${BASE_URL}/customer/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
    body: JSON.stringify({
      vehicleId: targetBus._id,
      serviceType: 'Bus',
      selectedSeats: [seatName],
      travelDate: new Date().toISOString().split('T')[0],
      pickupLocation: 'Delhi (Kashmere Gate ISBT)',
      dropLocation: 'Jaipur (Sindhi Camp)',
      passengerDetails: [{ name: 'Harsh Customer', age: 28, gender: 'Male' }],
      fare: 850,
      paymentMethod: 'Offline Cash'
    })
  }).then(r => r.json()).then(r => r.data || r);

  const newBookingId = newBooking._id || newBooking.bookingId;
  console.log('\nNEW BOOKING CREATED:');
  console.log('  ID:', newBookingId);
  console.log('  bookingId String:', newBooking.bookingId);
  console.log('  vehicle ID:', newBooking.vehicle);
  console.log('  bookingStatus:', newBooking.bookingStatus);
  console.log('  paymentStatus:', newBooking.paymentStatus);
  console.log('  createdAt:', newBooking.createdAt);

  // 4. Fetch Dashboard & Booking Requests AFTER creating new booking
  const dashAfter = await fetch(`${BASE_URL}/driver/dashboard`, {
    headers: { 'Authorization': `Bearer ${harshToken}` }
  }).then(r => r.json());

  const reqsAfter = await fetch(`${BASE_URL}/driver/booking-requests`, {
    headers: { 'Authorization': `Bearer ${harshToken}` }
  }).then(r => r.json());

  console.log('\nAFTER NEW BOOKING:');
  console.log('  Dashboard pendingRequestsCount:', dashAfter.data?.stats?.pendingRequestsCount);
  console.log('  Dashboard bookingRequests count:', dashAfter.data?.bookingRequests?.length);
  console.log('  Dashboard bookingRequests IDs:', (dashAfter.data?.bookingRequests || []).map(r => r.bookingId || r._id));
  console.log('  BookingRequests API count:', reqsAfter.count, '| data length:', reqsAfter.data?.length);
  console.log('  BookingRequests IDs:', (reqsAfter.data || []).map(r => r.bookingId || r._id));

  const isNewInDashList = (dashAfter.data?.bookingRequests || []).some(r => (r._id || r.bookingId) === newBookingId || r.bookingId === newBooking.bookingId);
  const isNewInReqsList = (reqsAfter.data || []).some(r => (r._id || r.bookingId) === newBookingId || r.bookingId === newBooking.bookingId);

  console.log('\nCONCLUSION:');
  console.log('  Is New Booking Returned by /driver/dashboard list?:', isNewInDashList);
  console.log('  Is New Booking Returned by /driver/booking-requests list?:', isNewInReqsList);
}

diagnose();
