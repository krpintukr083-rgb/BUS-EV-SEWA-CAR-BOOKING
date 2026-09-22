const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
const DEVICE_ID = 'emulator-5554';
const ARTIFACT_DIR = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\36aa31c5-ea9b-4abd-894f-0928a3a8adbc';

function adbExec(cmd) {
  try {
    return execSync(`cmd /c "adb -s ${DEVICE_ID} ${cmd}"`, { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    return err.stdout || err.message || '';
  }
}

function captureScreenshot(filename) {
  const localPath = path.join(__dirname, filename);
  const targetPath = path.join(ARTIFACT_DIR, filename);
  adbExec(`shell screencap -p /sdcard/${filename}`);
  adbExec(`pull /sdcard/${filename} "${localPath}"`);
  if (fs.existsSync(localPath)) {
    fs.copyFileSync(localPath, targetPath);
    console.log(`   📸 Screenshot captured & copied to artifact: ${filename}`);
  }
}

async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json };
}

function getRandomSeat() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K'];
  const row = rows[Math.floor(Math.random() * rows.length)];
  const num = Math.floor(Math.random() * 4) + 1;
  return `${row}${num}`;
}

async function runTest() {
  console.log('================================================================');
  console.log('🚌 LIVE EMULATOR TEST — SAME-ROUTE CUSTOMER OTP VALIDITY FOR ALL 3 DRIVERS');
  console.log('Production Backend:', BASE_URL);
  console.log('Android Emulator:', DEVICE_ID);
  console.log('================================================================\n');

  const report = {};

  // 0. Driver Credentials & Login
  console.log('--- 0. LOGGING IN 3 SAME-ROUTE DRIVERS & CUSTOMER ---');
  const harshLogin = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'harsh.driver@platform.com', password: 'driver123', role: 'driver' })
  });
  const ayushLogin = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'ayush.driver@platform.com', password: 'driver123', role: 'driver' })
  });
  const pintuLogin = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'pintu.driver@platform.com', password: 'driver123', role: 'driver' })
  });

  const harshToken = harshLogin.data.token;
  const ayushToken = ayushLogin.data.token;
  const pintuToken = pintuLogin.data.token;

  console.log('Harsh Login Status:', harshLogin.status);
  console.log('Ayush Login Status:', ayushLogin.status);
  console.log('Pintu Login Status:', pintuLogin.status);

  // Customer Login
  const custLogin = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'priya.nair@example.com', password: 'user123', role: 'customer' })
  });
  const custToken = custLogin.data.token;
  console.log('Customer Login Status:', custLogin.status);

  // Vehicles
  const vList = await apiRequest('/vehicles');
  const vehicles = vList.data.data || vList.data;
  const harshBus = vehicles.find(v => v.vehicleNumber === 'DL 01 AB 4321');
  const ayushBus = vehicles.find(v => v.vehicleNumber === 'DL 02 CD 5678');
  const pintuBus = vehicles.find(v => v.vehicleNumber === 'DL 03 EF 9012');

  console.log('\n--- STEP 1: CREATE FRESH BOOKING #1 (Delhi -> Jaipur) ---');
  let b1Res = await apiRequest('/customer/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
    body: JSON.stringify({
      vehicleId: harshBus._id,
      serviceType: 'Bus',
      bookingType: 'Bus',
      selectedSeats: [getRandomSeat()],
      travelDate: new Date().toISOString().split('T')[0],
      pickupLocation: 'Delhi (Kashmere Gate ISBT)',
      dropLocation: 'Jaipur (Sindhi Camp)',
      passengerDetails: [{ name: 'Priya Nair', age: 28, gender: 'Female' }],
      fare: 850,
      paymentMethod: 'Offline Cash'
    })
  });
  if (!b1Res.ok) {
    // Retry with different seat if seat was taken
    b1Res = await apiRequest('/customer/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
      body: JSON.stringify({
        vehicleId: harshBus._id,
        serviceType: 'Bus',
        bookingType: 'Bus',
        selectedSeats: [getRandomSeat()],
        travelDate: new Date().toISOString().split('T')[0],
        pickupLocation: 'Delhi (Kashmere Gate ISBT)',
        dropLocation: 'Jaipur (Sindhi Camp)',
        passengerDetails: [{ name: 'Priya Nair', age: 28, gender: 'Female' }],
        fare: 850,
        paymentMethod: 'Offline Cash'
      })
    });
  }

  const b1Data = b1Res.data.data || b1Res.data;
  const b1Id = b1Data?.bookingId || b1Data?._id;
  const b1MongoId = b1Data?._id;

  const custB1List = await apiRequest('/customer/my-bookings', {
    headers: { 'Authorization': `Bearer ${custToken}` }
  });
  const custB1 = (custB1List.data.data?.upcoming || []).find(b => b._id === b1MongoId || b.bookingId === b1Id);
  const otp1 = custB1?.confirmationOtp || custB1?.customerViewOtp || b1Data?.confirmationOtp;

  console.log('Booking #1 Created!');
  console.log('  Booking ID:', b1Id);
  console.log('  Mongo ID:', b1MongoId);
  console.log('  OTP #1:', otp1);
  console.log('  Initial bookingStatus:', custB1?.bookingStatus);
  console.log('  driverConfirmationStatus:', custB1?.driverConfirmationStatus);
  console.log('  driverConfirmed:', custB1?.driverConfirmed);
  console.log('  confirmationOtpVerifiedAt:', custB1?.confirmationOtpVerifiedAt);
  console.log('  confirmationOtpVerifiedBy:', custB1?.confirmationOtpVerifiedBy);
  console.log('  assignedDriverId:', custB1?.assignedDriverId || null);

  report.step1 = {
    bookingId: b1Id,
    otp: otp1,
    status: custB1?.bookingStatus,
    driverConfirmed: custB1?.driverConfirmed,
    pass: !!(b1Id && otp1 && custB1?.bookingStatus === 'Pending Driver Confirmation')
  };

  // Launch Customer App on Emulator and screenshot
  adbExec('shell am force-stop com.travelease.customer');
  adbExec('shell monkey -p com.travelease.customer -c android.intent.category.LAUNCHER 1');
  await new Promise(r => setTimeout(r, 4000));
  captureScreenshot('step1_customer_app_booking1.png');

  console.log('\n--- STEP 2: VERIFY SAME-ROUTE VISIBILITY FOR HARSH, AYUSH, PINTU ---');
  const harshReqs1 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${harshToken}` } });
  const ayushReqs1 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${ayushToken}` } });
  const pintuReqs1 = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${pintuToken}` } });

  const harshHasB1 = (harshReqs1.data.data || []).some(r => r.bookingId === b1Id || r._id === b1MongoId);
  const ayushHasB1 = (ayushReqs1.data.data || []).some(r => r.bookingId === b1Id || r._id === b1MongoId);
  const pintuHasB1 = (pintuReqs1.data.data || []).some(r => r.bookingId === b1Id || r._id === b1MongoId);

  console.log('Harsh sees Booking #1:', harshHasB1 ? 'YES (PASS)' : 'NO (FAIL)');
  console.log('Ayush sees Booking #1:', ayushHasB1 ? 'YES (PASS)' : 'NO (FAIL)');
  console.log('Pintu sees Booking #1:', pintuHasB1 ? 'YES (PASS)' : 'NO (FAIL)');

  report.step2 = {
    harshVisible: harshHasB1,
    ayushVisible: ayushHasB1,
    pintuVisible: pintuHasB1,
    pass: harshHasB1 && ayushHasB1 && pintuHasB1
  };

  // Launch Driver App for Harsh on emulator & capture screenshot
  adbExec('shell am force-stop com.travelease.driver');
  adbExec('shell monkey -p com.travelease.driver -c android.intent.category.LAUNCHER 1');
  await new Promise(r => setTimeout(r, 4000));
  captureScreenshot('step2_driver_app_requests_harsh.png');

  console.log('\n--- STEP 3: TEST OTP WITH HARSH (BOOKING #1) ---');
  const harshVerify1 = await apiRequest(`/driver/bookings/${b1MongoId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${harshToken}` },
    body: JSON.stringify({ otp: otp1 })
  });

  console.log('Harsh Verify Status Code:', harshVerify1.status);
  console.log('Harsh Verify Message:', harshVerify1.data.message);

  const afterHarshList = await apiRequest('/customer/my-bookings', { headers: { 'Authorization': `Bearer ${custToken}` } });
  const afterHarshB1 = (afterHarshList.data.data?.upcoming || []).find(b => b._id === b1MongoId || b.bookingId === b1Id);

  console.log('Post-Harsh Booking State:');
  console.log('  bookingStatus:', afterHarshB1?.bookingStatus);
  console.log('  driverConfirmationStatus:', afterHarshB1?.driverConfirmationStatus);
  console.log('  driverConfirmed:', afterHarshB1?.driverConfirmed);
  console.log('  assignedDriverId:', afterHarshB1?.assignedDriverId || afterHarshB1?.driver?._id || afterHarshB1?.driver);
  console.log('  confirmationOtpVerifiedAt:', afterHarshB1?.confirmationOtpVerifiedAt);

  const ayushReqsAfterHarsh = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${ayushToken}` } });
  const pintuReqsAfterHarsh = await apiRequest('/driver/booking-requests', { headers: { 'Authorization': `Bearer ${pintuToken}` } });
  const ayushStillSeesB1 = (ayushReqsAfterHarsh.data.data || []).some(r => r.bookingId === b1Id || r._id === b1MongoId);
  const pintuStillSeesB1 = (pintuReqsAfterHarsh.data.data || []).some(r => r.bookingId === b1Id || r._id === b1MongoId);

  console.log('Ayush sees Booking #1 after Harsh claim:', ayushStillSeesB1 ? 'YES' : 'NO (Correctly removed upon claim)');
  console.log('Pintu sees Booking #1 after Harsh claim:', pintuStillSeesB1 ? 'YES' : 'NO (Correctly removed upon claim)');

  report.step3 = {
    httpStatus: harshVerify1.status,
    message: harshVerify1.data.message,
    bookingStatus: afterHarshB1?.bookingStatus,
    driverConfirmed: afterHarshB1?.driverConfirmed,
    assignedDriver: afterHarshB1?.assignedDriverId || afterHarshB1?.driver?._id || afterHarshB1?.driver,
    otherDriversRemovedFromRequests: !ayushStillSeesB1 && !pintuStillSeesB1,
    pass: harshVerify1.ok && afterHarshB1?.driverConfirmed
  };

  captureScreenshot('step3_harsh_otp_verified.png');

  console.log('\n--- STEP 4: CONTROLLED OTP TEST FOR AYUSH (FRESH BOOKING #2) ---');
  let b2Res = await apiRequest('/customer/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
    body: JSON.stringify({
      vehicleId: ayushBus._id,
      serviceType: 'Bus',
      bookingType: 'Bus',
      selectedSeats: [getRandomSeat()],
      travelDate: new Date().toISOString().split('T')[0],
      pickupLocation: 'Delhi (Kashmere Gate ISBT)',
      dropLocation: 'Jaipur (Sindhi Camp)',
      passengerDetails: [{ name: 'Priya Nair', age: 28, gender: 'Female' }],
      fare: 850,
      paymentMethod: 'Offline Cash'
    })
  });
  if (!b2Res.ok) {
    b2Res = await apiRequest('/customer/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
      body: JSON.stringify({
        vehicleId: ayushBus._id,
        serviceType: 'Bus',
        bookingType: 'Bus',
        selectedSeats: [getRandomSeat()],
        travelDate: new Date().toISOString().split('T')[0],
        pickupLocation: 'Delhi (Kashmere Gate ISBT)',
        dropLocation: 'Jaipur (Sindhi Camp)',
        passengerDetails: [{ name: 'Priya Nair', age: 28, gender: 'Female' }],
        fare: 850,
        paymentMethod: 'Offline Cash'
      })
    });
  }
  const b2Data = b2Res.data.data || b2Res.data;
  const b2Id = b2Data?.bookingId || b2Data?._id;
  const b2MongoId = b2Data?._id;

  const custB2List = await apiRequest('/customer/my-bookings', { headers: { 'Authorization': `Bearer ${custToken}` } });
  const custB2 = (custB2List.data.data?.upcoming || []).find(b => b._id === b2MongoId || b.bookingId === b2Id);
  const otp2 = custB2?.confirmationOtp || custB2?.customerViewOtp || b2Data?.confirmationOtp;

  console.log('Booking #2 Created!');
  console.log('  Booking ID:', b2Id);
  console.log('  OTP #2:', otp2);

  const ayushVerify2 = await apiRequest(`/driver/bookings/${b2MongoId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ayushToken}` },
    body: JSON.stringify({ otp: otp2 })
  });

  console.log('Ayush Verify Status Code:', ayushVerify2.status);
  console.log('Ayush Verify Message:', ayushVerify2.data.message);

  const afterAyushList = await apiRequest('/customer/my-bookings', { headers: { 'Authorization': `Bearer ${custToken}` } });
  const afterAyushB2 = (afterAyushList.data.data?.upcoming || []).find(b => b._id === b2MongoId || b.bookingId === b2Id);

  console.log('Post-Ayush Booking State:');
  console.log('  bookingStatus:', afterAyushB2?.bookingStatus);
  console.log('  driverConfirmed:', afterAyushB2?.driverConfirmed);
  console.log('  assignedDriverId:', afterAyushB2?.assignedDriverId || afterAyushB2?.driver?._id || afterAyushB2?.driver);

  report.step4 = {
    bookingId: b2Id,
    otp: otp2,
    httpStatus: ayushVerify2.status,
    message: ayushVerify2.data.message,
    bookingStatus: afterAyushB2?.bookingStatus,
    driverConfirmed: afterAyushB2?.driverConfirmed,
    assignedDriver: afterAyushB2?.assignedDriverId || afterAyushB2?.driver?._id || afterAyushB2?.driver,
    pass: ayushVerify2.ok && afterAyushB2?.driverConfirmed
  };

  captureScreenshot('step4_ayush_otp_verified.png');

  console.log('\n--- STEP 5: CONTROLLED OTP TEST FOR PINTU (FRESH BOOKING #3) ---');
  let b3Res = await apiRequest('/customer/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
    body: JSON.stringify({
      vehicleId: pintuBus._id,
      serviceType: 'Bus',
      bookingType: 'Bus',
      selectedSeats: [getRandomSeat()],
      travelDate: new Date().toISOString().split('T')[0],
      pickupLocation: 'Delhi (Kashmere Gate ISBT)',
      dropLocation: 'Jaipur (Sindhi Camp)',
      passengerDetails: [{ name: 'Priya Nair', age: 28, gender: 'Female' }],
      fare: 850,
      paymentMethod: 'Offline Cash'
    })
  });
  if (!b3Res.ok) {
    b3Res = await apiRequest('/customer/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
      body: JSON.stringify({
        vehicleId: pintuBus._id,
        serviceType: 'Bus',
        bookingType: 'Bus',
        selectedSeats: [getRandomSeat()],
        travelDate: new Date().toISOString().split('T')[0],
        pickupLocation: 'Delhi (Kashmere Gate ISBT)',
        dropLocation: 'Jaipur (Sindhi Camp)',
        passengerDetails: [{ name: 'Priya Nair', age: 28, gender: 'Female' }],
        fare: 850,
        paymentMethod: 'Offline Cash'
      })
    });
  }
  const b3Data = b3Res.data.data || b3Res.data;
  const b3Id = b3Data?.bookingId || b3Data?._id;
  const b3MongoId = b3Data?._id;

  const custB3List = await apiRequest('/customer/my-bookings', { headers: { 'Authorization': `Bearer ${custToken}` } });
  const custB3 = (custB3List.data.data?.upcoming || []).find(b => b._id === b3MongoId || b.bookingId === b3Id);
  const otp3 = custB3?.confirmationOtp || custB3?.customerViewOtp || b3Data?.confirmationOtp;

  console.log('Booking #3 Created!');
  console.log('  Booking ID:', b3Id);
  console.log('  OTP #3:', otp3);

  const pintuVerify3 = await apiRequest(`/driver/bookings/${b3MongoId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pintuToken}` },
    body: JSON.stringify({ otp: otp3 })
  });

  console.log('Pintu Verify Status Code:', pintuVerify3.status);
  console.log('Pintu Verify Message:', pintuVerify3.data.message);

  const afterPintuList = await apiRequest('/customer/my-bookings', { headers: { 'Authorization': `Bearer ${custToken}` } });
  const afterPintuB3 = (afterPintuList.data.data?.upcoming || []).find(b => b._id === b3MongoId || b.bookingId === b3Id);

  console.log('Post-Pintu Booking State:');
  console.log('  bookingStatus:', afterPintuB3?.bookingStatus);
  console.log('  driverConfirmed:', afterPintuB3?.driverConfirmed);
  console.log('  assignedDriverId:', afterPintuB3?.assignedDriverId || afterPintuB3?.driver?._id || afterPintuB3?.driver);

  report.step5 = {
    bookingId: b3Id,
    otp: otp3,
    httpStatus: pintuVerify3.status,
    message: pintuVerify3.data.message,
    bookingStatus: afterPintuB3?.bookingStatus,
    driverConfirmed: afterPintuB3?.driverConfirmed,
    assignedDriver: afterPintuB3?.assignedDriverId || afterPintuB3?.driver?._id || afterPintuB3?.driver,
    pass: pintuVerify3.ok && afterPintuB3?.driverConfirmed
  };

  captureScreenshot('step5_pintu_otp_verified.png');

  console.log('\n--- STEP 6: TEST WRONG ROUTE DRIVER REJECTION ---');
  let b4Res = await apiRequest('/customer/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
    body: JSON.stringify({
      vehicleId: harshBus._id,
      serviceType: 'Bus',
      bookingType: 'Bus',
      selectedSeats: [getRandomSeat()],
      travelDate: new Date().toISOString().split('T')[0],
      pickupLocation: 'Delhi (Kashmere Gate ISBT)',
      dropLocation: 'Jaipur (Sindhi Camp)',
      passengerDetails: [{ name: 'Priya Nair', age: 28, gender: 'Female' }],
      fare: 850,
      paymentMethod: 'Offline Cash'
    })
  });
  if (!b4Res.ok) {
    b4Res = await apiRequest('/customer/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
      body: JSON.stringify({
        vehicleId: harshBus._id,
        serviceType: 'Bus',
        bookingType: 'Bus',
        selectedSeats: [getRandomSeat()],
        travelDate: new Date().toISOString().split('T')[0],
        pickupLocation: 'Delhi (Kashmere Gate ISBT)',
        dropLocation: 'Jaipur (Sindhi Camp)',
        passengerDetails: [{ name: 'Priya Nair', age: 28, gender: 'Female' }],
        fare: 850,
        paymentMethod: 'Offline Cash'
      })
    });
  }
  const b4MongoId = (b4Res.data.data || b4Res.data)._id;

  // Login wrong driver (whose vehicle is Lucknow -> Jaipur)
  const wrongDriverLogin = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'wrong.driver@platform.com', password: 'driver123', role: 'driver' })
  });

  const wrongRouteVerify = await apiRequest(`/driver/bookings/${b4MongoId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wrongDriverLogin.data.token}` },
    body: JSON.stringify({ otp: '123456' })
  });

  console.log('Wrong Route Driver Status Code:', wrongRouteVerify.status);
  console.log('Wrong Route Driver Response Message:', wrongRouteVerify.data.message);

  report.step6 = {
    httpStatus: wrongRouteVerify.status,
    message: wrongRouteVerify.data.message,
    blocked: wrongRouteVerify.status === 403,
    pass: wrongRouteVerify.status === 403
  };

  console.log('\n--- STEP 10: SECURITY & NEGATIVE EDGE CASES ---');
  // 10a: Wrong OTP
  const wrongOtpRes = await apiRequest(`/driver/bookings/${b4MongoId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${harshToken}` },
    body: JSON.stringify({ otp: '000000' })
  });
  console.log('Wrong OTP Result Status:', wrongOtpRes.status, '| Message:', wrongOtpRes.data.message);

  // 10b: Second driver after first claim (Ayush trying to verify Booking #1 after Harsh claimed it)
  const secondClaimRes = await apiRequest(`/driver/bookings/${b1MongoId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ayushToken}` },
    body: JSON.stringify({ otp: otp1 })
  });
  console.log('Second Driver Claim Result Status:', secondClaimRes.status, '| Message:', secondClaimRes.data.message);

  // 10c: OTP reuse after successful claim (Harsh trying to verify Booking #1 again)
  const otpReuseRes = await apiRequest(`/driver/bookings/${b1MongoId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${harshToken}` },
    body: JSON.stringify({ otp: otp1 })
  });
  console.log('OTP Reuse Result Status:', otpReuseRes.status, '| Message:', otpReuseRes.data.message);

  report.security = {
    wrongOtpBlocked: wrongOtpRes.status === 400 && wrongOtpRes.data.message.includes('Invalid OTP'),
    secondDriverBlocked: secondClaimRes.status === 400,
    otpReuseBlocked: otpReuseRes.status === 400 && otpReuseRes.data.message.includes('already verified')
  };

  console.log('\n================================================================');
  console.log('📊 FINAL TEST AUDIT SUMMARY');
  console.log('================================================================');
  console.log(JSON.stringify(report, null, 2));

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'test_report.json'), JSON.stringify(report, null, 2));
}

runTest();
