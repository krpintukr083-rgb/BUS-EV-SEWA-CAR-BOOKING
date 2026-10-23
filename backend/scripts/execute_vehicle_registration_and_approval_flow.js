require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');

const API_BASE = 'https://bus-ev-sewa-car-booking.onrender.com/api';
const DRIVER_EMAIL = 'krpintukr083+driverreview@gmail.com'.toLowerCase();
const DRIVER_PASSWORD = 'YatraDriver@Review26!';
const ADMIN_EMAIL = 'admin@platform.com';
const ADMIN_PASSWORD = 'admin123';
const TEST_VEHICLE_NUMBER = 'UP70TR1234';

async function executeVehicleFlow() {
  console.log('================================================================');
  console.log('🚀 TASK: REGISTER TEST VEHICLE & APPROVE VIA ADMIN PANEL WORKFLOW');
  console.log('================================================================\n');

  // STEP 1 — Verify Driver Account
  console.log('--- STEP 1: VERIFY DRIVER ACCOUNT ---');
  await mongoose.connect(process.env.MONGODB_URI);
  const safeDbName = mongoose.connection.name;
  console.log(`Connected to Target Database: [${safeDbName}]`);

  const driverUser = await User.findOne({ email: DRIVER_EMAIL });
  if (!driverUser) {
    throw new Error(`Review driver user not found in database for email: ${DRIVER_EMAIL}`);
  }
  const driverProfile = await Driver.findOne({ user: driverUser._id });
  if (!driverProfile) {
    throw new Error(`Review driver profile document not found for user: ${driverUser._id}`);
  }
  console.log(`Driver User Found: ID=${driverUser._id}, Role=${driverUser.role}, Status=${driverUser.status}`);
  console.log(`Driver Profile Found: ID=${driverProfile._id}, Name=${driverProfile.name}, Status=${driverProfile.driverStatus}`);

  // Authenticate driver through actual API
  console.log('\nLogging in Driver via POST /api/auth/login...');
  const driverLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    identifier: DRIVER_EMAIL,
    password: DRIVER_PASSWORD,
    role: 'driver'
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  });

  if (driverLoginRes.status !== 200 || !driverLoginRes.data.token) {
    throw new Error(`Driver login failed: Status=${driverLoginRes.status}, Message=${driverLoginRes.data?.message}`);
  }
  const driverToken = driverLoginRes.data.token;
  console.log('Driver Login SUCCESSFUL ✅ (JWT Token received)');

  // Verify Driver Dashboard access
  const driverDashRes = await axios.get(`${API_BASE}/driver/dashboard`, {
    headers: { Authorization: `Bearer ${driverToken}` },
    timeout: 30000
  });
  console.log(`Driver Dashboard Access: Status=${driverDashRes.status} (Success=${driverDashRes.data?.success})`);

  // STEP 2 — Register a Vehicle
  console.log('\n--- STEP 2: REGISTER TEST VEHICLE ---');
  // Check if test vehicle already exists in DB
  const existingVeh = await Vehicle.findOne({ vehicleNumber: TEST_VEHICLE_NUMBER });
  if (existingVeh) {
    console.log(`Vehicle ${TEST_VEHICLE_NUMBER} already exists from earlier run. Cleaning up to ensure fresh test...`);
    await Vehicle.deleteOne({ _id: existingVeh._id });
    console.log(`Existing vehicle ${existingVeh._id} removed for clean registration test.`);
  }

  const vehiclePayload = {
    vehicleNumber: TEST_VEHICLE_NUMBER,
    vehicleName: 'Yatra Review Car',
    vehicleType: 'Car',
    vehicleSource: 'OWN',
    vehicleCategory: 'Sedan',
    vehicleModel: 'Swift Dzire ZXI',
    seatingCapacity: 4,
    fuelType: 'Petrol',
    ownerName: driverProfile.name,
    ownerMobileNumber: driverProfile.mobileNumber,
    rcNumber: 'RC-UP70TR1234',
    rcDocument: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
    insurancePolicyNumber: 'INS-UP70TR1234',
    insuranceDocument: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
    insuranceExpiryDetails: '2028-12-31',
    fitnessDetails: 'State Transport Safety Certified Valid',
    fitnessDocument: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
  };

  console.log(`Submitting Vehicle Registration via POST ${API_BASE}/driver/vehicles...`);
  const regRes = await axios.post(`${API_BASE}/driver/vehicles`, vehiclePayload, {
    headers: {
      Authorization: `Bearer ${driverToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  if (regRes.status !== 201 || !regRes.data?.data?._id) {
    throw new Error(`Vehicle registration failed: Status=${regRes.status}, Message=${regRes.data?.message}`);
  }

  const createdVehicle = regRes.data.data;
  const vehicleId = createdVehicle._id;
  const initialStatus = createdVehicle.vehicleStatus;
  console.log(`Vehicle Registration SUBMITTED ✅`);
  console.log(`  Vehicle ID: ${vehicleId}`);
  console.log(`  Vehicle Number: ${createdVehicle.vehicleNumber}`);
  console.log(`  Initial Vehicle Status: [${initialStatus}] (Expected: Pending)`);
  console.log(`  Assigned Driver: ${createdVehicle.assignedDriver}`);
  console.log(`  Submitted By Driver: ${createdVehicle.submission?.submittedByDriver}`);

  // Confirm in database directly
  const dbVehCheck = await Vehicle.findById(vehicleId);
  if (!dbVehCheck || dbVehCheck.vehicleStatus !== 'Pending') {
    throw new Error(`Database check failed: vehicleStatus is not Pending, got ${dbVehCheck?.vehicleStatus}`);
  }
  console.log('Database verification of initial pending state: PASSED ✅');

  // STEP 3 — Approve Through Admin Panel
  console.log('\n--- STEP 3: APPROVE THROUGH ADMIN PANEL WORKFLOW ---');
  console.log('Logging in Admin via POST /api/auth/login...');
  const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    identifier: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin'
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  });

  if (adminLoginRes.status !== 200 || !adminLoginRes.data.token) {
    throw new Error(`Admin login failed: Status=${adminLoginRes.status}, Message=${adminLoginRes.data?.message}`);
  }
  const adminToken = adminLoginRes.data.token;
  console.log('Admin Login SUCCESSFUL ✅ (Admin JWT Token received)');

  // Navigate to pending-vehicles in Admin API
  console.log('\nQuerying Admin Pending Vehicles via GET /api/admin/pending-vehicles...');
  const pendingVehRes = await axios.get(`${API_BASE}/admin/pending-vehicles`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    timeout: 30000
  });

  const pendingList = pendingVehRes.data?.data || [];
  console.log(`Admin pending vehicles count: ${pendingList.length}`);
  const matchingPending = pendingList.find(v => v._id === vehicleId || v.vehicleNumber === TEST_VEHICLE_NUMBER);
  if (!matchingPending) {
    throw new Error(`Vehicle ${TEST_VEHICLE_NUMBER} (${vehicleId}) not found in admin pending-vehicles list!`);
  }
  console.log(`Found test vehicle in Admin Pending Queue ✅: ID=${matchingPending._id}, Number=${matchingPending.vehicleNumber}`);

  // Approve through existing admin approval action
  console.log(`\nExecuting Admin Approval via PATCH /api/admin/vehicles/${vehicleId}/approve...`);
  const approveRes = await axios.patch(`${API_BASE}/admin/vehicles/${vehicleId}/approve`, {}, {
    headers: { Authorization: `Bearer ${adminToken}` },
    timeout: 30000
  });

  if (approveRes.status !== 200 || !approveRes.data?.success) {
    throw new Error(`Admin approval failed: Status=${approveRes.status}, Message=${approveRes.data?.message}`);
  }
  console.log(`Admin Approval Action EXECUTED ✅: HTTP ${approveRes.status}, Message: "${approveRes.data?.message}"`);

  // STEP 4 — Verify the Complete Flow
  console.log('\n--- STEP 4: VERIFY COMPLETE WORKFLOW INTEGRITY ---');

  // 1. Verify in database
  const finalVehDb = await Vehicle.findById(vehicleId);
  const finalDriverDb = await Driver.findById(driverProfile._id);
  console.log(`Final Database Vehicle Status: [${finalVehDb.vehicleStatus}] (Expected: Active)`);
  console.log(`Final Database Reviewed By Admin: ${finalVehDb.submission?.reviewedBy}`);
  console.log(`Final Driver Assigned Vehicle: ${finalDriverDb.assignedVehicle}`);

  if (finalVehDb.vehicleStatus !== 'Active') {
    throw new Error(`Final vehicle status verification failed: Expected 'Active', got '${finalVehDb.vehicleStatus}'`);
  }
  if (String(finalDriverDb.assignedVehicle) !== String(vehicleId)) {
    throw new Error(`Driver assignedVehicle not updated to approved vehicle!`);
  }

  // 2. Verify via Driver App APIs
  console.log('\nVerifying via Driver App APIs:');
  const driverVehiclesRes = await axios.get(`${API_BASE}/driver/vehicles`, {
    headers: { Authorization: `Bearer ${driverToken}` },
    timeout: 30000
  });
  const driverVehList = driverVehiclesRes.data?.data || [];
  const foundInDriverVehicles = driverVehList.find(v => v._id === vehicleId);
  console.log(`Driver's Vehicles List contains approved vehicle: ${Boolean(foundInDriverVehicles)} (Status: ${foundInDriverVehicles?.vehicleStatus})`);

  const driverAssignedRes = await axios.get(`${API_BASE}/driver/vehicle`, {
    headers: { Authorization: `Bearer ${driverToken}` },
    timeout: 30000
  });
  const assignedData = driverAssignedRes.data?.data;
  console.log(`Driver's Active Vehicle Endpoint returns: ${assignedData?.vehicleNumber} (ID: ${assignedData?._id})`);

  // 3. Verify via Admin App APIs
  console.log('\nVerifying via Admin Panel APIs:');
  const postApprovePendingRes = await axios.get(`${API_BASE}/admin/pending-vehicles`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    timeout: 30000
  });
  const stillPending = (postApprovePendingRes.data?.data || []).some(v => v._id === vehicleId);
  console.log(`Test vehicle removed from Admin Pending Queue: ${!stillPending ? 'YES ✅' : 'NO ❌'}`);

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log('🎉 FULL WORKFLOW VERIFICATION COMPLETE AND SUCCESSFUL');
  console.log('================================================================');

  return {
    driverEmail: DRIVER_EMAIL,
    driverLoginResult: 'SUCCESS (HTTP 200, JWT issued)',
    vehicleNumber: TEST_VEHICLE_NUMBER,
    vehicleId: vehicleId,
    vehicleType: 'Car',
    model: 'Swift Dzire ZXI',
    initialStatus: initialStatus,
    finalStatus: finalVehDb.vehicleStatus,
    adminApprovalAction: 'PATCH /api/admin/vehicles/:id/approve',
    adminApprovedBy: ADMIN_EMAIL,
    driverAssignedVehicleUpdated: true
  };
}

executeVehicleFlow()
  .then(summary => {
    console.log('\n--- FINAL JSON RESULT ---');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('FLOW FAILED ❌:', err);
    process.exit(1);
  });
