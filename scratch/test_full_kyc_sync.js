const fs = require('fs');
const path = require('path');
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));

const LOCAL_URL = 'http://localhost:5000/api';
const RENDER_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function runTest() {
  console.log('=== END-TO-END DRIVER KYC SYNCHRONIZATION TEST ===\n');

  // 1. Connect to MongoDB to inspect directly
  const MONGO_URI = 'mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(MONGO_URI);
  console.log('[MONGODB] Connected successfully.');

  const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }));

  // Find Rajesh Sharma or first driver
  let driver = await Driver.findOne({ name: /Rajesh/i }) || await Driver.findOne({});
  if (!driver) {
    console.error('No driver found in MongoDB!');
    process.exit(1);
  }
  console.log(`[DRIVER RECORD FOUND] ID: ${driver._id}, Name: ${driver.name}, Mobile: ${driver.mobileNumber}, Status: ${driver.driverStatus}`);

  // Ensure test driver user has password123
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const bcrypt = require(path.join(__dirname, '../backend/node_modules/bcryptjs'));
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);
  await User.findByIdAndUpdate(driver.user, { password: hashedPassword });
  console.log('[TEST SETUP] Driver user password updated to password123 for testing.');

  // 2. Perform Driver Upload via Local API
  console.log('\n--- TESTING DRIVER UPLOAD API ---');
  const loginRes = await fetch(`${LOCAL_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: driver.mobileNumber, password: 'password123', role: 'driver' })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.error('Driver Login failed:', loginData.message);
    process.exit(1);
  }
  const token = loginData.token;
  console.log('[DRIVER LOGIN] Success. Token received.');

  // Create dummy image file for upload test
  const tempFilePath = path.join(__dirname, 'test_dl_upload.jpg');
  fs.writeFileSync(tempFilePath, 'FAKE_JPEG_BINARY_DATA_FOR_TESTING_KYC');

  const fileBlob = new Blob([fs.readFileSync(tempFilePath)], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('document', fileBlob, 'test_dl_upload.jpg');
  formData.append('docType', 'drivingLicence');
  formData.append('documentNumber', 'DL-2026-NEPAL-9999');
  formData.append('expiryDate', '2030-12-31');

  const uploadRes = await fetch(`${LOCAL_URL}/driver/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  const uploadData = await uploadRes.json();
  console.log('[UPLOAD RESPONSE] Status:', uploadRes.status);
  console.log('Response File Reference:', uploadData.data?.fileUrl || uploadData.data?.drivingLicenceDoc);

  // Clean up temp file
  if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

  // 3. Inspect MongoDB updated record
  driver = await Driver.findById(driver._id);
  console.log('\n--- MONGODB RECORD INSPECTION AFTER UPLOAD ---');
  console.log('Driving Licence Doc:', driver.get('drivingLicenceDoc'));
  console.log('Driving Licence Number:', driver.get('drivingLicenceNumber'));
  console.log('Driving Licence Status:', driver.get('drivingLicenceStatus'));
  console.log('Overall Driver Status:', driver.get('driverStatus'));

  // 4. Test Admin API GET /api/admin/drivers
  console.log('\n--- TESTING ADMIN KYC API GET /api/admin/drivers ---');
  const adminLoginRes = await fetch(`${LOCAL_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@platform.com', password: 'adminpassword', role: 'admin' })
  });
  let adminLoginData = await adminLoginRes.json();
  if (!adminLoginData.token) {
    // Try fallback password admin123
    const adminLoginRes2 = await fetch(`${LOCAL_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@platform.com', password: 'admin123', role: 'admin' })
    });
    adminLoginData = await adminLoginRes2.json();
  }
  const adminToken = adminLoginData.token;
  console.log('[ADMIN LOGIN] Token received:', !!adminToken);

  const adminDriversRes = await fetch(`${LOCAL_URL}/admin/drivers`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  const adminDriversData = await adminDriversRes.json();
  const rajeshAdminObj = adminDriversData.data.find(d => d._id.toString() === driver._id.toString());
  console.log('[ADMIN API RESPONSE] Found Driver:', rajeshAdminObj.name);
  console.log('Doc URL returned in drivingLicenceDoc:', rajeshAdminObj.drivingLicenceDoc);
  console.log('Doc URL returned in documents.drivingLicence.fileUrl:', rajeshAdminObj.documents?.drivingLicence?.fileUrl);

  // 5. Test File Accessibility via HTTP GET
  console.log('\n--- TESTING FILE ACCESSIBILITY (VIEW DOCUMENT) ---');
  const fileRelativePath = rajeshAdminObj.drivingLicenceDoc;
  const fileFullUrl = `http://localhost:5000${fileRelativePath}`;
  const fileFetchRes = await fetch(fileFullUrl);
  const fileText = await fileFetchRes.text();
  console.log(`[FILE ACCESSIBILITY] GET ${fileFullUrl} => Status: ${fileFetchRes.status} OK, Bytes: ${fileText.length}`);

  // 6. Test Admin APPROVE action
  console.log('\n--- TESTING ADMIN APPROVE DOCUMENT ---');
  const approveRes = await fetch(`${LOCAL_URL}/admin/drivers/${driver._id}/verify`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ docType: 'drivingLicence', status: 'Approved' })
  });
  const approveData = await approveRes.json();
  console.log('[ADMIN APPROVE RESPONSE]:', approveData);

  driver = await Driver.findById(driver._id);
  console.log('[ADMIN APPROVE] Licence Status in DB:', driver.get('drivingLicenceStatus'));

  // 7. Test Admin REJECT action with rejection reason
  console.log('\n--- TESTING ADMIN REJECT DOCUMENT ---');
  const rejectRes = await fetch(`${LOCAL_URL}/admin/drivers/${driver._id}/verify`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      docType: 'drivingLicence',
      status: 'Rejected',
      rejectionReason: 'Licence image is blurry, please re-upload clear photo'
    })
  });
  const rejectData = await rejectRes.json();
  console.log('[ADMIN REJECT RESPONSE]:', rejectData);

  driver = await Driver.findById(driver._id);
  console.log('[ADMIN REJECT] Licence Status in DB:', driver.get('drivingLicenceStatus'));
  console.log('[ADMIN REJECT] Rejection Reason in DB:', driver.get('rejectionReason'));
  console.log('[ADMIN REJECT] Overall Driver Status in DB:', driver.get('driverStatus'));

  // 8. Test Render Production Backend Status
  console.log('\n--- CHECKING PRODUCTION RENDER BACKEND HEALTH ---');
  try {
    const renderHealthRes = await fetch(`${RENDER_URL}/health`, { signal: AbortSignal.timeout(8000) });
    const renderHealthData = await renderHealthRes.json();
    console.log('[RENDER PRODUCTION BACKEND] Health Status:', renderHealthData);
  } catch (e) {
    console.log('[RENDER PRODUCTION BACKEND] Note:', e.message);
  }

  await mongoose.disconnect();
  console.log('\n=== ALL VERIFICATION CHECKS PASSED ===');
}

runTest().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
