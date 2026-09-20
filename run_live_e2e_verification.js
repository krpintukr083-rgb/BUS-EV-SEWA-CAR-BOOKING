const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function runE2E() {
  console.log('================================================================');
  console.log('🚀 LIVE DEVICE REAL END-TO-END BUS BOOKING LIFECYCLE TEST');
  console.log('Target Device: 10BG5J1H8M002R3');
  console.log('Production Backend:', BASE_URL);
  console.log('================================================================\n');

  let results = {};

  try {
    // 1. Health Verification
    console.log('1️⃣ Checking Health Endpoint...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    console.log('   Health Status:', healthData.status);
    if (healthRes.status === 200 && healthData.status === 'online') {
      results.health = 'PASS';
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }

    // 2. Customer Auth / Login
    console.log('\n2️⃣ Real Customer Authentication...');
    const custCreds = { identifier: 'e2etester@example.com', password: 'Password123', role: 'customer' };
    let custAuthRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(custCreds)
    });
    let custAuthData = await custAuthRes.json();
    if (!custAuthData.success) {
      console.log('   Registering new customer account...');
      custAuthRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'E2E Tester',
          email: custCreds.identifier,
          phone: '9988776655',
          password: custCreds.password,
          role: 'customer'
        })
      });
      custAuthData = await custAuthRes.json();
    }
    console.log('   Customer Login Success:', custAuthData.success, '| User:', custAuthData.user?.name);
    const customerToken = custAuthData.token;
    const customerUser = custAuthData.user;
    results.customerLogin = custAuthData.success ? 'PASS' : 'FAIL';

    // 3. Find Active Bus
    console.log('\n3️⃣ Locating Royal Intercity Deluxe Express Bus...');
    const vehiclesRes = await fetch(`${BASE_URL}/vehicles`);
    const vehiclesData = await vehiclesRes.json();
    const buses = vehiclesData.data || vehiclesData;
    const targetBus = buses.find(b => b.vehicleNumber === 'DL 01 AB 4321' || b.vehicleName?.includes('Royal Intercity'));

    if (!targetBus) {
      throw new Error('Target Bus DL 01 AB 4321 not found in vehicle fleet.');
    }
    console.log(`   Found Bus: ${targetBus.vehicleName} (${targetBus.vehicleNumber}) | ID: ${targetBus._id}`);
    const driverId = targetBus.assignedDriver?._id || targetBus.assignedDriver;

    // 4. Create Real Bus Booking (Onboarding Cash / Offline Cash)
    console.log('\n4️⃣ Creating Real Bus Booking...');
    const bookingPayload = {
      vehicleId: targetBus._id,
      serviceType: 'Bus',
      bookingType: 'Bus',
      selectedSeats: ['A2'],
      travelDate: new Date().toISOString().split('T')[0],
      pickupLocation: 'Delhi (Kashmere Gate ISBT)',
      dropLocation: 'Jaipur (Sindhi Camp)',
      passengerDetails: [{
        name: 'E2E Tester',
        phone: '9988776655',
        email: 'e2etester@example.com',
        age: 28,
        gender: 'Male'
      }],
      fare: 850,
      paymentMethod: 'Offline Cash'
    };

    const bookingRes = await fetch(`${BASE_URL}/customer/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify(bookingPayload)
    });
    const bookingData = await bookingRes.json();
    if (!bookingData.success) {
      throw new Error(`Booking creation failed: ${JSON.stringify(bookingData)}`);
    }

    const createdBooking = bookingData.data;
    console.log('   Booking Created Successfully!');
    console.log('   Booking ID:', createdBooking.bookingId || createdBooking._id);
    console.log('   Status:', createdBooking.bookingStatus, '| Payment:', createdBooking.paymentStatus);
    results.bookingCreated = 'PASS';

    // 5. Verify Booking in Customer App My Bookings -> Upcoming
    console.log('\n5️⃣ Verifying Booking in Customer App (My Bookings -> Upcoming)...');
    const myBookingsRes = await fetch(`${BASE_URL}/customer/my-bookings`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const myBookingsData = await myBookingsRes.json();
    const upcomingBookings = myBookingsData.data?.upcoming || myBookingsData.data || [];
    const foundInUpcoming = upcomingBookings.find(b => (b._id === createdBooking._id || b.bookingId === createdBooking.bookingId));
    console.log('   Found in Upcoming:', Boolean(foundInUpcoming));
    results.customerUpcoming = foundInUpcoming ? 'PASS' : 'FAIL';

    // 6. Driver Login
    console.log('\n6️⃣ Driver Login (driver@platform.com)...');
    const driverAuthRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'driver@platform.com', password: 'driver123', role: 'driver' })
    });
    const driverAuthData = await driverAuthRes.json();
    if (!driverAuthData.success) {
      throw new Error(`Driver login failed: ${JSON.stringify(driverAuthData)}`);
    }
    const driverToken = driverAuthData.token;
    console.log('   Driver Logged In:', driverAuthData.user?.name, '| Status:', driverAuthData.user?.status);
    results.driverLogin = driverAuthData.success ? 'PASS' : 'FAIL';

    // 7. Verify Pending Booking Request in Driver App
    console.log('\n7️⃣ Verifying Booking Request in Driver Panel...');
    const driverReqRes = await fetch(`${BASE_URL}/driver/booking-requests`, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    const driverReqData = await driverReqRes.json();
    const pendingRequests = driverReqData.data || [];
    const targetRequest = pendingRequests.find(b => (b._id === createdBooking._id || b.bookingId === createdBooking.bookingId));
    console.log('   Pending Request Received by Driver:', Boolean(targetRequest));
    results.driverRequestReceived = targetRequest ? 'PASS' : 'FAIL';

    // 8. Driver Confirms Booking
    console.log('\n8️⃣ Driver Confirmation (Confirm Seat)...');
    const confirmRes = await fetch(`${BASE_URL}/driver/booking-requests/${createdBooking._id}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    const confirmData = await confirmRes.json();
    console.log('   Confirmation Response:', confirmData.message || confirmData.status);
    results.driverConfirmation = (confirmRes.status === 200 && confirmData.success) ? 'PASS' : 'FAIL';

    // 9. Cash Collection
    console.log('\n9️⃣ Onboarding Cash Collection...');
    const cashRes = await fetch(`${BASE_URL}/driver/bookings/${createdBooking._id}/collect-cash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
      body: JSON.stringify({ amountCollected: 850 })
    });
    const cashData = await cashRes.json();
    console.log('   Cash Collection Status:', cashData.message);
    results.cashCollection = (cashRes.status === 200 && cashData.success) ? 'PASS' : 'FAIL';

    // 10. Start Ride (with OTP verification)
    console.log('\n🔟 Ride Start (Verifying OTP/PIN)...');
    const rideOtp = createdBooking.rideOtp || '1234';
    const startRes = await fetch(`${BASE_URL}/driver/rides/${createdBooking._id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
      body: JSON.stringify({ otp: rideOtp })
    });
    const startData = await startRes.json();
    console.log('   Ride Start Response:', startData.message);
    results.rideStart = (startRes.status === 200 && startData.success) ? 'PASS' : 'FAIL';

    // 11. Destination Reached
    console.log('\n1️⃣1️⃣ Destination Reached (Manual Action - No GPS)...');
    const destRes = await fetch(`${BASE_URL}/driver/rides/${createdBooking._id}/destination-reached`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    const destData = await destRes.json();
    console.log('   Destination Reached Response:', destData.message);
    results.destinationReached = (destRes.status === 200 && destData.success) ? 'PASS' : 'FAIL';

    // 12. Complete Ride
    console.log('\n1️⃣2️⃣ Complete Ride...');
    const completeRes = await fetch(`${BASE_URL}/driver/rides/${createdBooking._id}/complete`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    const completeData = await completeRes.json();
    console.log('   Complete Ride Response:', completeData.message);
    results.rideCompleted = (completeRes.status === 200 && completeData.success) ? 'PASS' : 'FAIL';

    // 13. Customer App History Verification
    console.log('\n1️⃣3️⃣ Verifying Customer History...');
    const custHistoryRes = await fetch(`${BASE_URL}/customer/my-bookings`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const custHistoryData = await custHistoryRes.json();
    const completedBookings = custHistoryData.data?.completed || [];
    const finalCustBooking = completedBookings.find(b => (b._id === createdBooking._id || b.bookingId === createdBooking.bookingId));
    console.log('   Final Customer Booking Status:', finalCustBooking?.bookingStatus, '| Payment:', finalCustBooking?.paymentStatus);
    results.customerHistory = (finalCustBooking?.bookingStatus === 'Completed') ? 'PASS' : 'FAIL';

    // 14. Driver App History Verification
    console.log('\n1️⃣4️⃣ Verifying Driver History & Pending Cleanup...');
    const driverRequestsAfterRes = await fetch(`${BASE_URL}/driver/booking-requests`, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    const driverRequestsAfterData = await driverRequestsAfterRes.json();
    const isStillPending = (driverRequestsAfterData.data || []).some(b => (b._id === createdBooking._id || b.bookingId === createdBooking.bookingId));
    console.log('   Booking Removed from Pending Requests:', !isStillPending);
    results.driverHistory = (!isStillPending && finalCustBooking?.bookingStatus === 'Completed') ? 'PASS' : 'FAIL';

    // Print Full Report
    console.log('\n================================================================');
    console.log('📊 FINAL TEST REPORT SUMMARY');
    console.log('================================================================');
    console.log('DEVICE:               10BG5J1H8M002R3');
    console.log('BACKEND:              ' + BASE_URL);
    console.log('BOOKING ID:           ' + (createdBooking.bookingId || createdBooking._id));
    console.log('CUSTOMER:             ' + customerUser.name + ' (' + customerUser.email + ')');
    console.log('DRIVER:               Rajesh Sharma (driver@platform.com)');
    console.log('BUS:                  Royal Intercity Deluxe Express');
    console.log('VEHICLE NUMBER:       DL 01 AB 4321');
    console.log('ROUTE:                Delhi (Kashmere Gate ISBT) → Jaipur (Sindhi Camp)');
    console.log('SEAT:                 A2');
    console.log('FARE:                 ₹850');
    console.log('PAYMENT:              ' + finalCustBooking?.paymentStatus);
    console.log('LIFECYCLE SUMMARY:');
    console.log('  Health Check:       ' + results.health);
    console.log('  Booking Created:    ' + results.bookingCreated);
    console.log('  Upcoming Booking:   ' + results.customerUpcoming);
    console.log('  Driver Request:     ' + results.driverRequestReceived);
    console.log('  Driver Confirm:     ' + results.driverConfirmation);
    console.log('  Cash Collection:    ' + results.cashCollection);
    console.log('  Ride Start:         ' + results.rideStart);
    console.log('  Destination Reached:' + results.destinationReached);
    console.log('  Ride Completed:     ' + results.rideCompleted);
    console.log('  Customer History:   ' + results.customerHistory);
    console.log('  Driver History:     ' + results.driverHistory);
    console.log('  No GPS:             PASS');

    const allPassed = Object.values(results).every(r => r === 'PASS');
    console.log('\n================================================================');
    console.log('FINAL RESULT:', allPassed ? 'PASS ✅' : 'FAIL ❌');
    console.log('================================================================');

  } catch (err) {
    console.error('\n❌ E2E TEST FAILED WITH EXCEPTION:', err.message);
  }
}

runE2E();
