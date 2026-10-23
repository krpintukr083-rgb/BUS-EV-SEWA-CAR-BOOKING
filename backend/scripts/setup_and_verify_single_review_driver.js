require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');

async function run() {
  const targetEmail = 'krpintukr083+driverreview@gmail.com'.toLowerCase();
  const targetPassword = 'YatraDriver@Review26!';
  const targetName = 'YatraSewanp Review Driver';
  const targetPhone = '+9779800000099';
  const roleName = 'driver'; // Exact schema enum: ['admin', 'sub_admin', 'driver', 'customer']

  console.log('=== STEP 2: CONFIRMING DATABASE TARGET ===');
  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI not found in environment.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const safeDbName = mongoose.connection.name;
  console.log(`Database connected successfully. Safe Database Name: [${safeDbName}]`);

  console.log('\n=== STEP 3: CREATE OR VERIFY SINGLE REVIEW DRIVER ===');
  let userExisted = false;
  let user = await User.findOne({ email: targetEmail });

  if (user) {
    userExisted = true;
    console.log(`Driver user already exists with ID: ${user._id}. Aligning name, role, and password...`);
    user.name = targetName;
    user.role = roleName;
    user.status = 'Active';
    user.password = targetPassword; // Triggers Mongoose pre-save hook to hash with bcrypt
    if (!user.phone) user.phone = targetPhone;
    await user.save();
  } else {
    console.log('Driver user does not exist. Creating new dedicated review Driver user...');
    user = await User.create({
      name: targetName,
      email: targetEmail,
      phone: targetPhone,
      password: targetPassword, // Triggers Mongoose pre-save hook to hash with bcrypt
      role: roleName,
      status: 'Active',
      profilePhoto: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'
    });
  }

  // Check or create Driver Profile
  let driver = await Driver.findOne({ user: user._id });
  if (driver) {
    console.log(`Driver profile already exists with ID: ${driver._id}. Aligning details and approval...`);
    driver.name = targetName;
    driver.mobileNumber = user.phone;
    driver.driverStatus = 'Active';
    driver.isOnline = true;
    driver.canViewCustomerPhone = true;
    driver.drivingLicenceStatus = 'Approved';
    driver.citizenshipStatus = 'Approved';
    driver.rcStatus = 'Approved';
    driver.insuranceStatus = 'Approved';
    driver.fitnessStatus = 'Approved';
    driver.requiredDocumentsStatus = 'Approved';
    await driver.save();
  } else {
    console.log('Creating linked Driver profile document...');
    driver = await Driver.create({
      user: user._id,
      name: targetName,
      mobileNumber: user.phone,
      driverStatus: 'Active',
      isOnline: true,
      canViewCustomerPhone: true,
      drivingLicenceNumber: 'DL-REVIEW-2026',
      drivingLicenceDoc: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
      drivingLicenceStatus: 'Approved',
      citizenshipNumber: 'CIT-REVIEW-2026',
      citizenshipStatus: 'Approved',
      rcNumber: 'BA 2 KHA 2026',
      rcDetails: 'Commercial Passenger Carriage Permit',
      rcStatus: 'Approved',
      insurancePolicyNumber: 'INS-REVIEW-2026',
      vehicleInsurance: 'Comprehensive Commercial Fleet Insurance',
      insuranceStatus: 'Approved',
      fitnessDetails: 'Periodic Safety & Roadworthiness Inspection Passed',
      fitnessStatus: 'Approved',
      requiredDocumentsStatus: 'Approved'
    });
  }

  // Verify password hash in database
  const userCheck = await User.findById(user._id).select('+password');
  const isHashed = userCheck.password.startsWith('$2a$') || userCheck.password.startsWith('$2b$');
  const passwordMatch = await userCheck.matchPassword(targetPassword);
  console.log(`Password is bcrypt hashed: ${isHashed ? 'YES' : 'NO'}`);
  console.log(`Bcrypt password match verified: ${passwordMatch ? 'YES' : 'NO'}`);

  console.log('\n=== STEP 4: VERIFY LOGIN VIA API ===');
  const PROD_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
  console.log(`Testing login against review backend API: ${PROD_URL}`);

  let loginSuccess = false;
  let returnedRole = null;
  let returnedStatus = null;
  let reachedDashboard = false;
  let privateDataExposed = false;

  try {
    const loginRes = await axios.post(`${PROD_URL}/auth/login`, {
      identifier: targetEmail,
      password: targetPassword,
      role: roleName
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    if (loginRes.status === 200 && loginRes.data.success && loginRes.data.token) {
      loginSuccess = true;
      returnedRole = loginRes.data.user?.role;
      returnedStatus = loginRes.data.user?.status;
      const token = loginRes.data.token;

      // Check if password or hash exposed in response
      if (loginRes.data.user?.password || JSON.stringify(loginRes.data).includes('$2a$')) {
        privateDataExposed = true;
      }

      // Test driver dashboard
      const dashRes = await axios.get(`${PROD_URL}/driver/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      });
      if (dashRes.status === 200 && dashRes.data.success) {
        reachedDashboard = true;
      }
    }
  } catch (err) {
    console.error('Login test error:', err.response?.data || err.message);
  }

  await mongoose.disconnect();

  console.log('\n=== EXECUTION SUMMARY ===');
  console.log(JSON.stringify({
    userExisted,
    safeDbName,
    driverName: targetName,
    driverEmail: targetEmail,
    role: returnedRole,
    status: returnedStatus,
    isPasswordHashed: isHashed,
    loginSucceeded: loginSuccess,
    reachedDashboard,
    privateDataExposed,
    otpRequired: false,
    pendingApprovalsRemaining: false
  }, null, 2));
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
