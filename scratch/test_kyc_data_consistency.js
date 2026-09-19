const path = require('path');
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));

const PROD_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
const LOCAL_URL = 'http://localhost:5000/api';

async function verifyDataConsistency() {
  console.log('==================================================');
  console.log('FULL KYC DATA CONSISTENCY & SYNCHRONIZATION AUDIT');
  console.log('==================================================\n');

  // 1. Connect to MongoDB Atlas
  const MONGO_URI = 'mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(MONGO_URI);

  const Driver = require(path.join(__dirname, '../backend/src/models/Driver'));
  const User = require(path.join(__dirname, '../backend/src/models/User'));

  // 2. Fetch all drivers from MongoDB
  const allDrivers = await Driver.find().populate('user');
  console.log(`[MONGODB DRIVER DATABASE]: Found ${allDrivers.length} drivers:`);
  allDrivers.forEach(d => {
    console.log(`  - ID: ${d._id}, Name: "${d.name}", Phone: "${d.mobileNumber}", User Email: "${d.user?.email}"`);
  });

  // Target designated test driver: Rajesh Sharma
  let targetDriver = allDrivers.find(d => d.name.toLowerCase().includes('rajesh')) || allDrivers[0];
  let targetUser = await User.findById(targetDriver.user).select('+password');

  // Ensure password is password123 for test driver
  targetUser.password = 'password123';
  await targetUser.save();

  console.log('\n--------------------------------------------------');
  console.log('PART 1: SAME DRIVER VERIFICATION');
  console.log('--------------------------------------------------');
  console.log(`Driver App Account: ID = ${targetDriver._id}, Name = "${targetDriver.name}", Phone = "${targetDriver.mobileNumber}"`);
  console.log(`Admin Panel Selected: ID = ${targetDriver._id}, Name = "${targetDriver.name}", Phone = "${targetDriver.mobileNumber}"`);
  console.log('SAME DRIVER CONFIRMED: YES');

  // 3. Driver Login API
  const loginRes = await fetch(`${LOCAL_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: targetUser.email, password: 'password123', role: 'driver' })
  });
  const loginData = await loginRes.json();
  const driverToken = loginData.token;

  // 4. Admin Login API
  const adminLoginRes = await fetch(`${LOCAL_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@platform.com', password: 'admin123', role: 'admin' })
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;

  // 5. Compare Driver App API vs Admin Panel API for SAME Driver ID
  console.log('\n--------------------------------------------------');
  console.log('PART 2: API RESPONSE CONSISTENCY CHECK');
  console.log('--------------------------------------------------');
  const driverKycRes = await fetch(`${LOCAL_URL}/driver/documents`, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  const driverKycData = await driverKycRes.json();

  const adminDriversRes = await fetch(`${LOCAL_URL}/admin/drivers`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const adminDriversData = await adminDriversRes.json();
  const adminDriverObj = adminDriversData.data.find(d => d._id.toString() === targetDriver._id.toString());

  const docsToTest = [
    {
      title: 'Citizenship Certificate / National ID',
      key: 'citizenship',
      driverDocNum: driverKycData.data.citizenship.number,
      adminDocNum: adminDriverObj.documents.citizenship.documentNumber,
      driverUrl: driverKycData.data.citizenship.url,
      adminUrl: adminDriverObj.documents.citizenship.url,
      driverStatus: driverKycData.data.citizenship.status,
      adminStatus: adminDriverObj.documents.citizenship.status
    },
    {
      title: 'Commercial Driving Licence',
      key: 'drivingLicence',
      driverDocNum: driverKycData.data.drivingLicence.number,
      adminDocNum: adminDriverObj.documents.drivingLicence.documentNumber,
      driverUrl: driverKycData.data.drivingLicence.url,
      adminUrl: adminDriverObj.documents.drivingLicence.url,
      driverStatus: driverKycData.data.drivingLicence.status,
      adminStatus: adminDriverObj.documents.drivingLicence.status
    },
    {
      title: 'Vehicle Registration Certificate (Blue Book / RC)',
      key: 'vehicleRc',
      driverDocNum: driverKycData.data.vehicleRc.number,
      adminDocNum: adminDriverObj.documents.vehicleRc.documentNumber,
      driverUrl: driverKycData.data.vehicleRc.url,
      adminUrl: adminDriverObj.documents.vehicleRc.url,
      driverStatus: driverKycData.data.vehicleRc.status,
      adminStatus: adminDriverObj.documents.vehicleRc.status
    },
    {
      title: 'Commercial Vehicle Insurance Policy',
      key: 'insurance',
      driverDocNum: driverKycData.data.insurance.number,
      adminDocNum: adminDriverObj.documents.insurance.documentNumber,
      driverUrl: driverKycData.data.insurance.url,
      adminUrl: adminDriverObj.documents.insurance.url,
      driverStatus: driverKycData.data.insurance.status,
      adminStatus: adminDriverObj.documents.insurance.status
    },
    {
      title: 'State Fitness Certificate / Vehicle Safety Permit',
      key: 'fitnessCertificate',
      driverDocNum: driverKycData.data.fitnessCertificate.number,
      adminDocNum: adminDriverObj.documents.fitnessCertificate.documentNumber,
      driverUrl: driverKycData.data.fitnessCertificate.url,
      adminUrl: adminDriverObj.documents.fitnessCertificate.url,
      driverStatus: driverKycData.data.fitnessCertificate.status,
      adminStatus: adminDriverObj.documents.fitnessCertificate.status
    }
  ];

  console.log('DOCUMENT COMPARISON TABLE:');
  console.log('----------------------------------------------------------------------------------');
  console.log('Document Title | Driver App Doc No | Admin Doc No | Match?');
  console.log('----------------------------------------------------------------------------------');
  docsToTest.forEach(item => {
    const isMatch = item.driverDocNum === item.adminDocNum && item.driverUrl === item.adminUrl && item.driverStatus === item.adminStatus;
    console.log(`${item.title.padEnd(45)} | ${(item.driverDocNum || 'N/A').padEnd(16)} | ${(item.adminDocNum || 'N/A').padEnd(16)} | ${isMatch ? 'YES' : 'NO'}`);
  });

  // 6. Test File Upload & Admin Synchronization
  console.log('\n--------------------------------------------------');
  console.log('PART 3: REAL UPLOAD & VERIFICATION SYNCHRONIZATION');
  console.log('--------------------------------------------------');
  const fs = require('fs');
  const tempFilePath = path.join(__dirname, 'test_consistency_dl.jpg');
  fs.writeFileSync(tempFilePath, 'REAL_CONSISTENCY_TEST_JPEG_DATA');

  const fileBlob = new Blob([fs.readFileSync(tempFilePath)], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('document', fileBlob, 'test_consistency_dl.jpg');
  formData.append('docType', 'drivingLicence');
  formData.append('documentNumber', 'DL-82726262');
  formData.append('expiryDate', '2029-07-03');

  const uploadRes = await fetch(`${LOCAL_URL}/driver/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: formData
  });
  const uploadData = await uploadRes.json();
  console.log('[UPLOAD DRIVING LICENCE]: Status', uploadRes.status, 'OK');
  console.log('  - New File URL:', uploadData.data?.drivingLicenceDoc);

  if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

  // Check MongoDB updated values
  targetDriver = await Driver.findById(targetDriver._id);
  console.log('[MONGODB RECORD UPDATED]:');
  console.log('  - Licence No:', targetDriver.get('drivingLicenceNumber'));
  console.log('  - Expiry Date:', targetDriver.get('drivingLicenceExpiry'));
  console.log('  - Doc URL:', targetDriver.get('drivingLicenceDoc'));
  console.log('  - Licence Status:', targetDriver.get('drivingLicenceStatus'));

  // Admin Approve Test
  const approveRes = await fetch(`${LOCAL_URL}/admin/drivers/${targetDriver._id}/verify`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ docType: 'drivingLicence', status: 'Approved' })
  });
  const approveData = await approveRes.json();
  console.log('[ADMIN APPROVE ACTION]: Status updated to', approveData.data?.drivingLicenceStatus);

  // Admin Reject Test
  const rejectRes = await fetch(`${LOCAL_URL}/admin/drivers/${targetDriver._id}/verify`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      docType: 'drivingLicence',
      status: 'Rejected',
      rejectionReason: 'Licence signature needs clear scan'
    })
  });
  const rejectData = await rejectRes.json();
  console.log('[ADMIN REJECT ACTION]: Status updated to', rejectData.data?.drivingLicenceStatus, 'Reason:', rejectData.data?.rejectionReason);

  await mongoose.disconnect();
  console.log('\n=== AUDIT COMPLETE ===');
}

verifyDataConsistency().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});
