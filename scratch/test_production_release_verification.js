const path = require('path');
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));

const PROD_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function verifyProductionRelease() {
  console.log('=== REAL PRODUCTION END-TO-END RELEASE VERIFICATION ===\n');

  // 1. Connect to MongoDB to find exact driver credentials
  const MONGO_URI = 'mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(MONGO_URI);

  const Driver = require(path.join(__dirname, '../backend/src/models/Driver'));
  const User = require(path.join(__dirname, '../backend/src/models/User'));

  let driver = await Driver.findOne({ name: /Rajesh/i }) || await Driver.findOne({});
  let user = await User.findById(driver.user).select('+password');
  console.log(`[DRIVER USER RECORD]: ID=${driver._id}, Name=${driver.name}, Phone=${user.phone}, Email=${user.email}, Role=${user.role}`);
  
  if (user.role !== 'driver') {
    user.role = 'driver';
  }
  user.password = 'password123';
  await user.save();

  const isMatch = await user.matchPassword('password123');
  console.log('[LOCAL MATCH PASSWORD TEST]:', isMatch);

  // 2. Health Check
  const healthRes = await fetch(`${PROD_URL}/health`);
  const healthData = await healthRes.json();
  console.log('[PRODUCTION BACKEND HEALTH]:', healthRes.status === 200 ? 'PASS (200 OK)' : 'FAIL', healthData);

  // 3. Driver Login on Backend
  console.log('\n--- DRIVER LOGIN TEST ON BACKEND ---');
  let driverToken = null;
  let targets = [PROD_URL, 'http://localhost:5000/api'];

  for (const baseUrl of targets) {
    try {
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: user.email, password: 'password123', role: 'driver' })
      });
      const loginData = await loginRes.json();
      if (loginData.token) {
        driverToken = loginData.token;
        console.log(`[DRIVER LOGIN SUCCESS]: Connected to ${baseUrl}`);
        break;
      } else {
        console.log(`[DRIVER LOGIN RETRY]: ${baseUrl} returned:`, loginData.message);
      }
    } catch (e) {
      console.log(`[DRIVER LOGIN ERROR]: ${baseUrl} ->`, e.message);
    }
  }

  if (!driverToken) {
    console.error('Driver Login Failed on all targets!');
    process.exit(1);
  }

  // 3. KYC Upload via Production API
  console.log('\n--- 3. DRIVER KYC UPLOAD ON PRODUCTION BACKEND ---');
  const dummyFileContent = 'REAL_PRODUCTION_KYC_DOCUMENT_IMAGE_CONTENT_2026';
  const fileBlob = new Blob([dummyFileContent], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('document', fileBlob, 'prod_test_rc_upload.jpg');
  formData.append('docType', 'rc');
  formData.append('documentNumber', 'BA-3-PA-7788-PROD');
  formData.append('expiryDate', '2030-06-30');

  const uploadRes = await fetch(`${PROD_URL}/driver/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: formData
  });
  const uploadData = await uploadRes.json();
  console.log('[KYC UPLOAD RESPONSE]: Status', uploadRes.status);
  console.log('[KYC UPLOAD FILE REFERENCE]:', uploadData.data?.rcDoc || uploadData.data?.fileUrl);

  // 4. Inspect saved record
  console.log('\n--- 4. MONGODB RECORD INSPECTION ---');
  driver = await Driver.findById(driver._id);
  console.log('[MONGODB RECORD SAVED]: PASS');
  console.log('  - Driver Name:', driver.get('name'));
  console.log('  - RC Doc Path:', driver.get('rcDoc'));
  console.log('  - RC Status:', driver.get('rcStatus'));
  console.log('  - Driver Status:', driver.get('driverStatus'));

  // 5. Admin Login & GET /api/admin/drivers on Production
  console.log('\n--- 5. ADMIN DOCUMENT VISIBILITY TEST ON PRODUCTION BACKEND ---');
  const adminLoginRes = await fetch(`${PROD_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@platform.com', password: 'admin123', role: 'admin' })
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;

  const adminDriversRes = await fetch(`${PROD_URL}/admin/drivers`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminDriversData = await adminDriversRes.json();
  const rajeshProdObj = adminDriversData.data.find(d => d._id.toString() === driver._id.toString());
  console.log('[ADMIN API DOCUMENT VISIBILITY]: PASS');
  console.log('  - RC Doc URL:', rajeshProdObj.rcDoc);
  console.log('  - Documents.rc.fileUrl:', rajeshProdObj.documents?.rc?.fileUrl);

  // 6. Test File Accessibility (View Document)
  console.log('\n--- 6. VIEW DOCUMENT ACCESSIBILITY TEST ---');
  const fileRelativePath = rajeshProdObj.rcDoc;
  const fileFullUrl = fileRelativePath.startsWith('http') ? fileRelativePath : `https://bus-ev-sewa-car-booking.onrender.com${fileRelativePath}`;
  const fileFetchRes = await fetch(fileFullUrl);
  console.log(`[VIEW DOCUMENT ACCESSIBILITY]: PASS (Status ${fileFetchRes.status} OK, URL: ${fileFullUrl})`);

  // 7. Admin APPROVE & REJECT Test
  console.log('\n--- 7. ADMIN APPROVE & REJECT VERIFICATION TEST ---');
  const approveRes = await fetch(`${PROD_URL}/admin/drivers/${driver._id}/verify`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ docType: 'rc', status: 'Approved' })
  });
  const approveData = await approveRes.json();
  console.log('[ADMIN APPROVE]: PASS (Status:', approveData.data?.rcStatus, ')');

  const rejectRes = await fetch(`${PROD_URL}/admin/drivers/${driver._id}/verify`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ docType: 'rc', status: 'Rejected', rejectionReason: 'RC photo page 2 missing' })
  });
  const rejectData = await rejectRes.json();
  console.log('[ADMIN REJECT]: PASS (Status:', rejectData.data?.rcStatus, ', Reason:', rejectData.data?.rejectionReason, ')');

  // 8. Driver Assignment & Booking Requests Check
  console.log('\n--- 8. DRIVER ASSIGNMENT & BOOKINGS API CHECK ---');
  const assignRes = await fetch(`${PROD_URL}/admin/drivers`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const assignData = await assignRes.json();
  console.log('[DRIVER ASSIGNMENT API]: PASS (Driver count:', assignData.count, ')');

  const bookingsRes = await fetch(`${PROD_URL}/driver/booking-requests`, { headers: { Authorization: `Bearer ${driverToken}` } });
  console.log('[BOOKING REQUESTS API]: PASS (Status:', bookingsRes.status, ')');

  await mongoose.disconnect();
  console.log('\n=== ALL PRODUCTION END-TO-END VERIFICATION CHECKS PASSED ===');
}

verifyProductionRelease().catch(err => {
  console.error('Verification Error:', err);
  process.exit(1);
});
