const API_BASE = 'https://bus-ev-sewa-car-booking.onrender.com/api';

const DRIVERS = {
  HARSH: { email: 'harsh.driver@platform.com', password: 'driver123', name: 'Harsh' },
  AYUSH: { email: 'ayush.driver@platform.com', password: 'driver123', name: 'Ayush' },
  PINTU: { email: 'pintu.driver@platform.com', password: 'driver123', name: 'Pintu' }
};

const CUSTOMER = {
  identifier: 'priya@example.com',
  password: 'customer123'
};

async function apiRequest(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function runTest() {
  console.log('=== SAME-ROUTE CUSTOMER OTP VALIDITY E2E TEST ===\n');

  try {
    // 1. Authenticate Customer & Drivers
    console.log('1. Authenticating Customer and 3 Same-Route Drivers...');
    
    let custRes = await apiRequest('POST', '/auth/login', {
      identifier: CUSTOMER.identifier,
      password: CUSTOMER.password,
      role: 'customer'
    });

    if (!custRes.ok) {
      custRes = await apiRequest('POST', '/auth/login', {
        identifier: '9876543210',
        password: 'password123',
        role: 'customer'
      });
    }
    const custToken = custRes.data.token;
    console.log('   ✓ Customer Logged In:', custRes.data.user.name);

    const driverTokens = {};
    for (const [key, d] of Object.entries(DRIVERS)) {
      const res = await apiRequest('POST', '/auth/login', {
        identifier: d.email,
        password: d.password,
        role: 'driver'
      });
      if (!res.ok) {
        throw new Error(`Driver ${d.name} login failed: ${res.data.message}`);
      }
      driverTokens[key] = res.data.token;
      
      // Ensure Driver is ONLINE & Active
      await apiRequest('PUT', '/driver/status', { isOnline: true }, res.data.token);
      console.log(`   ✓ Driver ${d.name} Logged In & Set ONLINE`);
    }

    // Get a Delhi -> Jaipur Bus Vehicle ID
    const vehRes = await apiRequest('GET', '/vehicles?type=bus&from=Delhi&to=Jaipur');
    const busVehicle = vehRes.data.data?.[0];
    if (!busVehicle) {
      throw new Error('No active Delhi -> Jaipur bus found!');
    }
    console.log(`   ✓ Delhi -> Jaipur Bus Found: ${busVehicle.vehicleName} (${busVehicle.vehicleNumber})`);

    // Helper: Create Fresh Booking
    async function createFreshBooking(tag) {
      console.log(`\n--- Creating Fresh Booking (${tag}) ---`);
      const payload = {
        vehicleId: busVehicle._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi (Kashmere Gate ISBT)',
        dropLocation: 'Jaipur (Sindhi Camp)',
        travelDate: new Date().toISOString().split('T')[0],
        selectedSeats: [`A${Math.floor(Math.random() * 15) + 1}`],
        passengerDetails: [{ name: 'Test Passenger', age: 25, gender: 'Male' }],
        paymentMethod: 'Offline Cash'
      };

      const res = await apiRequest('POST', '/customer/bookings', payload, custToken);
      if (!res.ok) {
        throw new Error(`Failed to create ${tag}: ${res.data.message}`);
      }

      const b = res.data.data;
      console.log(`   ✓ ${tag} Created: ID=${b.bookingId}, DB_ID=${b._id}`);
      console.log(`   ✓ Customer View OTP: ${b.confirmationOtp || b.customerViewOtp}`);
      console.log(`   ✓ Status: ${b.bookingStatus}, driverConfirmed: ${b.driverConfirmed}`);
      return b;
    }

    // Helper: Check Visibility in Driver Pending Requests
    async function checkDriverVisibility(driverKey, driverName, bookingId) {
      const token = driverTokens[driverKey];
      const res = await apiRequest('GET', '/driver/booking-requests', null, token);
      const list = res.data.data || [];
      const found = list.some(item => item.bookingId === bookingId || item._id === bookingId);
      console.log(`   -> Driver ${driverName} Pending Requests (${list.length} total): ${found ? 'VISIBLE (PASS)' : 'NOT VISIBLE (FAIL)'}`);
      return found;
    }

    // Helper: Verify OTP by Driver
    async function verifyOtpByDriver(driverKey, driverName, bookingId, otp) {
      const token = driverTokens[driverKey];
      const res = await apiRequest('POST', `/driver/bookings/${bookingId}/verify-otp`, { otp }, token);
      if (res.ok) {
        console.log(`   -> Driver ${driverName} OTP Verification: SUCCESS (PASS)`);
        console.log(`      Message: "${res.data.message}"`);
        console.log(`      Assigned Driver: ${res.data.data?.driver?.name || res.data.data?.driver}`);
        return { success: true, data: res.data };
      } else {
        console.log(`   -> Driver ${driverName} OTP Verification: REJECTED (Expected if claimed/invalid)`);
        console.log(`      Error: "${res.data.message}"`);
        return { success: false, error: res.data.message };
      }
    }

    // ==========================================
    // STEP 1 & 2 & 3: BOOKING #1 (TEST HARSH)
    // ==========================================
    console.log('\n=== STEP 1, 2, 3: FRESH BOOKING #1 (HARSH CLAIM TEST) ===');
    const b1 = await createFreshBooking('Booking #1');
    const otp1 = b1.confirmationOtp || b1.customerViewOtp;

    console.log('\nChecking Booking #1 Visibility across all 3 same-route drivers:');
    const vHarsh1 = await checkDriverVisibility('HARSH', 'Harsh', b1.bookingId);
    const vAyush1 = await checkDriverVisibility('AYUSH', 'Ayush', b1.bookingId);
    const vPintu1 = await checkDriverVisibility('PINTU', 'Pintu', b1.bookingId);

    console.log('\nTesting OTP Verification for Booking #1 by Harsh:');
    const resHarsh1 = await verifyOtpByDriver('HARSH', 'Harsh', b1._id, otp1);

    console.log('\nVerifying Booking #1 cannot be claimed by Ayush/Pintu after Harsh claim:');
    const resAyushAfterClaim = await verifyOtpByDriver('AYUSH', 'Ayush', b1._id, otp1);
    const resPintuAfterClaim = await verifyOtpByDriver('PINTU', 'Pintu', b1._id, otp1);

    // ==========================================
    // STEP 4: FRESH BOOKING #2 (TEST AYUSH)
    // ==========================================
    console.log('\n=== STEP 4: FRESH BOOKING #2 (AYUSH CLAIM TEST) ===');
    const b2 = await createFreshBooking('Booking #2');
    const otp2 = b2.confirmationOtp || b2.customerViewOtp;

    console.log('\nChecking Booking #2 Visibility for Ayush:');
    const vAyush2 = await checkDriverVisibility('AYUSH', 'Ayush', b2.bookingId);

    console.log('\nTesting OTP Verification for Booking #2 by Ayush:');
    const resAyush2 = await verifyOtpByDriver('AYUSH', 'Ayush', b2._id, otp2);

    // ==========================================
    // STEP 5: FRESH BOOKING #3 (TEST PINTU)
    // ==========================================
    console.log('\n=== STEP 5: FRESH BOOKING #3 (PINTU CLAIM TEST) ===');
    const b3 = await createFreshBooking('Booking #3');
    const otp3 = b3.confirmationOtp || b3.customerViewOtp;

    console.log('\nChecking Booking #3 Visibility for Pintu:');
    const vPintu3 = await checkDriverVisibility('PINTU', 'Pintu', b3.bookingId);

    console.log('\nTesting OTP Verification for Booking #3 by Pintu:');
    const resPintu3 = await verifyOtpByDriver('PINTU', 'Pintu', b3._id, otp3);

    // ==========================================
    // STEP 6: SECURITY TESTS (Wrong OTP, Reuse)
    // ==========================================
    console.log('\n=== STEP 6 & 10: SECURITY & BOUNDARY TESTS ===');
    const b4 = await createFreshBooking('Booking #4 (Security Test)');
    const otp4 = b4.confirmationOtp || b4.customerViewOtp;

    console.log('\n1. Testing Wrong OTP ("000000"):');
    const wrongOtpRes = await verifyOtpByDriver('HARSH', 'Harsh', b4._id, '000000');

    console.log('\n2. Testing Correct OTP verification:');
    const correctOtpRes = await verifyOtpByDriver('HARSH', 'Harsh', b4._id, otp4);

    console.log('\n3. Testing OTP Reuse (Same OTP second time):');
    const reuseOtpRes = await verifyOtpByDriver('HARSH', 'Harsh', b4._id, otp4);

    console.log('\n=== TEST COMPLETE SUMMARY ===');
    console.log({
      Booking1_Harsh_Verification: resHarsh1.success ? 'PASS' : 'FAIL',
      Booking1_Ayush_BlockedAfterClaim: !resAyushAfterClaim.success ? 'PASS' : 'FAIL',
      Booking1_Pintu_BlockedAfterClaim: !resPintuAfterClaim.success ? 'PASS' : 'FAIL',
      Booking2_Ayush_Verification: resAyush2.success ? 'PASS' : 'FAIL',
      Booking3_Pintu_Verification: resPintu3.success ? 'PASS' : 'FAIL',
      Security_WrongOtp_Blocked: !wrongOtpRes.success ? 'PASS' : 'FAIL',
      Security_OtpReuse_Blocked: !reuseOtpRes.success ? 'PASS' : 'FAIL'
    });

  } catch (err) {
    console.error('Test execution error:', err.message);
  }
}

runTest();
