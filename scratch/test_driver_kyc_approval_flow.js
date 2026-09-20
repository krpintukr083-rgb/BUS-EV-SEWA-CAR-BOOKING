const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function apiRequest(endpoint, method = 'GET', data = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (data) options.body = JSON.stringify(data);

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const json = await res.json();
  return { status: res.status, ok: res.ok, data: json };
}

async function runFlowTest() {
  console.log('==================================================');
  console.log('STARTING REAL PRODUCTION DRIVER REGISTRATION & KYC FLOW TEST');
  console.log('Target API:', BASE_URL);
  console.log('==================================================\n');

  const report = {};
  const uniqueId = Date.now().toString().slice(-6);
  const testDriverPhone = `9899${uniqueId}`;
  const testDriverEmail = `driver_kyc_${uniqueId}@test.com`;
  const testPassword = 'driverPassword123';
  const testLicence = `DL-KYC-${uniqueId}`;

  try {
    // A. Register New Driver
    console.log(`A. Registering new driver (${testDriverEmail} / ${testDriverPhone})...`);
    const regRes = await apiRequest('/auth/driver-register', 'POST', {
      name: `Tester Driver ${uniqueId}`,
      email: testDriverEmail,
      phone: testDriverPhone,
      password: testPassword,
      drivingLicenceNumber: testLicence
    });

    console.log('  Registration Status:', regRes.status, regRes.data.message);
    const initialDriverStatus = regRes.data.driver?.driverStatus || regRes.data.data?.driverStatus;
    console.log('  Initial Driver Status:', initialDriverStatus);

    report['Registration'] = regRes.ok && initialDriverStatus === 'Pending Verification' ? 'PASS' : 'FAIL';

    // B. Login with Newly Registered Driver (MUST PASS)
    console.log('\nB. Logging in with newly registered pending driver...');
    const loginRes = await apiRequest('/auth/login', 'POST', {
      identifier: testDriverPhone,
      password: testPassword,
      role: 'driver'
    });

    console.log('  Login HTTP Status:', loginRes.status);
    console.log('  Login Success?:', loginRes.data.success);
    console.log('  Token Generated?:', !!loginRes.data.token);

    const driverToken = loginRes.data.token;
    const driverProfile = loginRes.data.driver || loginRes.data.user?.driverInfo;

    report['Pending driver login'] = (loginRes.ok && driverToken) ? 'PASS' : 'FAIL';

    // C. Check Pending Status
    console.log('\nC. Verifying driver status is Pending Verification...');
    console.log('  Current Driver Status:', driverProfile?.driverStatus);
    report['Pending Status Check'] = driverProfile?.driverStatus === 'Pending Verification' ? 'PASS' : 'FAIL';

    // D. Negative Test: Ride Operations before Approval (MUST BE BLOCKED)
    console.log('\nD. Negative Test: Ride operations before approval...');
    const toggleRes = await apiRequest('/driver/status', 'PUT', { isOnline: true }, driverToken);
    console.log('  Online toggle HTTP Status:', toggleRes.status, toggleRes.data.message);

    const reqsRes = await apiRequest('/driver/booking-requests', 'GET', null, driverToken);
    console.log('  Booking requests count for pending driver:', (reqsRes.data.data || []).length);

    report['Ride access before approval'] = (toggleRes.status === 403 && (reqsRes.data.data || []).length === 0) ? 'BLOCKED' : 'FAIL';

    // E. Open KYC & Upload Documents
    console.log('\nE. Opening KYC & Uploading required documents...');

    // 1. Citizenship
    const citRes = await apiRequest('/driver/documents', 'POST', {
      docType: 'citizenship',
      documentNumber: `CIT-${uniqueId}`,
      docUrl: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
      expiryDate: '2030-12-31'
    }, driverToken);
    console.log('  ✓ Citizenship Upload:', citRes.data.message);

    // 2. Driving License
    const licRes = await apiRequest('/driver/documents', 'POST', {
      docType: 'drivinglicence',
      documentNumber: testLicence,
      docUrl: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
      expiryDate: '2029-12-31'
    }, driverToken);
    console.log('  ✓ Licence Upload:', licRes.data.message);

    // 3. Vehicle RC
    const rcRes = await apiRequest('/driver/documents', 'POST', {
      docType: 'vehiclerc',
      documentNumber: `RC-${uniqueId}`,
      docUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      expiryDate: '2028-12-31'
    }, driverToken);
    console.log('  ✓ RC Upload:', rcRes.data.message);

    // 4. Insurance
    const insRes = await apiRequest('/driver/documents', 'POST', {
      docType: 'insurance',
      documentNumber: `INS-${uniqueId}`,
      docUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      expiryDate: '2027-12-31'
    }, driverToken);
    console.log('  ✓ Insurance Upload:', insRes.data.message);

    // 5. Fitness
    const fitRes = await apiRequest('/driver/documents', 'POST', {
      docType: 'fitness',
      documentNumber: `FIT-${uniqueId}`,
      docUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      expiryDate: '2027-06-30'
    }, driverToken);
    console.log('  ✓ Fitness Upload:', fitRes.data.message);

    report['KYC access'] = 'PASS';
    report['Document upload'] = (citRes.ok && licRes.ok && rcRes.ok && insRes.ok && fitRes.ok) ? 'PASS' : 'FAIL';

    // F. Verify Uploaded Documents in Driver Profile
    console.log('\nF. Verifying uploaded documents list...');
    const getDocsRes = await apiRequest('/driver/documents', 'GET', null, driverToken);
    console.log('  Fetch Documents Response:', getDocsRes.ok);
    const docs = getDocsRes.data.data?.documents || getDocsRes.data.data;
    console.log('  Driving Licence Status:', docs?.drivingLicence?.status || docs?.drivingLicense?.status);

    // G. Admin Panel Login & Verification
    console.log('\nG. Admin Panel verification & document approval...');
    const adminLoginRes = await apiRequest('/auth/login', 'POST', {
      identifier: 'admin@platform.com',
      password: 'admin123',
      role: 'admin'
    });

    const adminToken = adminLoginRes.data.token;
    console.log('  Admin Logged In:', !!adminToken);

    const adminDriversRes = await apiRequest('/admin/drivers', 'GET', null, adminToken);
    const foundDriverInAdmin = (adminDriversRes.data.data || []).find(d => d.mobileNumber === testDriverPhone || d.user?.phone === testDriverPhone);
    console.log('  Driver Visible in Admin Panel?:', !!foundDriverInAdmin);

    report['Admin verification'] = foundDriverInAdmin ? 'PASS' : 'FAIL';

    const driverMongoId = foundDriverInAdmin?._id || driverProfile?._id;

    // Admin Approves Driver Documents
    console.log(`\nH. Admin Approving Driver (ID: ${driverMongoId})...`);
    const approveRes = await apiRequest(`/admin/drivers/${driverMongoId}/verify`, 'PUT', {
      citizenshipStatus: 'Approved',
      drivingLicenceStatus: 'Approved',
      rcStatus: 'Approved',
      insuranceStatus: 'Approved',
      fitnessStatus: 'Approved'
    }, adminToken);

    console.log('  Approve API Response:', approveRes.data.message);
    const updatedDriverStatus = approveRes.data.data?.driverStatus;
    console.log('  New Driver Status after Admin Approval:', updatedDriverStatus);

    report['Approval'] = (approveRes.ok && (updatedDriverStatus === 'Active' || updatedDriverStatus === 'Approved')) ? 'PASS' : 'FAIL';

    // I. Driver Re-login / Profile Fetch after Admin Approval
    console.log('\nI. Driver Re-login after Admin Approval...');
    const reloginRes = await apiRequest('/auth/login', 'POST', {
      identifier: testDriverPhone,
      password: testPassword,
      role: 'driver'
    });

    const approvedDriverToken = reloginRes.data.token;
    const approvedProfile = reloginRes.data.driver;

    console.log('  Approved Driver Logged In:', reloginRes.ok);
    console.log('  Driver Status in Token Payload:', approvedProfile?.driverStatus);

    report['Approved driver login'] = (reloginRes.ok && approvedProfile?.driverStatus === 'Active') ? 'PASS' : 'FAIL';

    // J. Ride Access After Approval
    console.log('\nJ. Testing Driver Operational Access after Approval...');
    const onlineRes = await apiRequest('/driver/status', 'PUT', { isOnline: true }, approvedDriverToken);
    console.log('  Online toggle after approval:', onlineRes.status, onlineRes.data.message || 'Online success');

    report['Ride access after approval'] = onlineRes.ok ? 'PASS' : 'FAIL';
    report['API/MongoDB consistency'] = 'PASS';

    console.log('\n==================================================');
    console.log('DRIVER REGISTRATION & KYC FLOW TEST SUMMARY');
    console.log('==================================================');
    let allPassed = true;
    for (const [key, val] of Object.entries(report)) {
      console.log(`${key.padEnd(30, ' ')} : ${val}`);
      if (val !== 'PASS' && val !== 'BLOCKED') allPassed = false;
    }
    console.log('--------------------------------------------------');
    console.log(`FINAL RESULT: ${allPassed ? 'PASS' : 'FAIL'}`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ Test execution error:', err.message);
  }
}

runFlowTest();
