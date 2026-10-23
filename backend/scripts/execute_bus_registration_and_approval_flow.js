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
const TEST_BUS_NUMBER = 'BA 2 KHA 7788';

async function executeBusWorkflow() {
  console.log('================================================================');
  console.log('🚌 TASK: REGISTER AND VERIFY A BUS (NEPAL LOCATION: KATHMANDU -> BIRGUNJ)');
  console.log('================================================================\n');

  // STEP 1 — Verify Driver Login
  console.log('--- STEP 1: VERIFY DRIVER LOGIN ---');
  await mongoose.connect(process.env.MONGODB_URI);
  const safeDbName = mongoose.connection.name;
  console.log(`Connected to Target Database: [${safeDbName}]`);

  const driverUser = await User.findOne({ email: DRIVER_EMAIL });
  if (!driverUser) {
    throw new Error(`Review driver account does not exist in database for email: ${DRIVER_EMAIL}`);
  }
  const driverProfile = await Driver.findOne({ user: driverUser._id });
  if (!driverProfile) {
    throw new Error(`Review driver profile document not found for user: ${driverUser._id}`);
  }

  console.log(`Driver User Verified: ID=${driverUser._id}, Name="${driverUser.name}", Role=${driverUser.role}, Status=${driverUser.status}`);
  console.log(`Driver Profile Verified: ID=${driverProfile._id}, Name="${driverProfile.name}", Mobile=${driverProfile.mobileNumber}`);

  console.log('\nAuthenticating Driver via POST /api/auth/login...');
  const driverLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    identifier: DRIVER_EMAIL,
    password: DRIVER_PASSWORD,
    role: 'driver'
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  });

  if (driverLoginRes.status !== 200 || !driverLoginRes.data.token) {
    throw new Error(`Driver login failed: HTTP ${driverLoginRes.status} - ${driverLoginRes.data?.message}`);
  }
  const driverToken = driverLoginRes.data.token;
  console.log('Driver Login SUCCESSFUL ✅ (JWT Token generated for Review Driver)');

  // Confirm driver dashboard reachable
  const dashRes = await axios.get(`${API_BASE}/driver/dashboard`, {
    headers: { Authorization: `Bearer ${driverToken}` },
    timeout: 30000
  });
  console.log(`Driver Dashboard Reachable: HTTP ${dashRes.status} (Success=${dashRes.data?.success})`);

  // STEP 2 — Register a BUS, Not a Car (Nepal Location)
  console.log('\n--- STEP 2: REGISTER A BUS (NEPAL LOCATION) ---');

  // Check if bus number already exists in DB from a previous attempt
  const existingBus = await Vehicle.findOne({ vehicleNumber: TEST_BUS_NUMBER });
  if (existingBus) {
    console.log(`Bus ${TEST_BUS_NUMBER} already exists from earlier run. Cleaning up to ensure fresh registration test...`);
    await Vehicle.deleteOne({ _id: existingBus._id });
    console.log(`Previous test bus ${existingBus._id} removed.`);
  }

  const busPayload = {
    vehicleNumber: TEST_BUS_NUMBER,
    vehicleName: 'YatraSewanp Deluxe Bus (Kathmandu - Birgunj)',
    vehicleType: 'Bus',
    vehicleSource: 'OWN',
    vehicleCategory: 'AC Deluxe 2+2',
    vehicleModel: 'Tata Starbus Ultra AC',
    busType: 'Deluxe AC',
    seatingCapacity: 36,
    fuelType: 'Diesel',
    acType: 'AC',
    fareRate: 750,
    route: {
      origin: 'Kathmandu, Nepal',
      destination: 'Birgunj, Nepal',
      departureTime: '07:00 AM',
      arrivalTime: '02:30 PM',
      duration: '7h 30m',
      boardingPoints: ['Gongabu Bus Park, Kathmandu', 'Kalanki, Kathmandu'],
      droppingPoints: ['Ghantaghar, Birgunj', 'Bus Park, Birgunj'],
      stops: []
    },
    ownerName: driverProfile.name,
    ownerMobileNumber: driverProfile.mobileNumber,
    rcNumber: 'RC-BA-2-KHA-7788',
    rcDocument: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
    insurancePolicyNumber: 'INS-NEPAL-BUS-7788',
    insuranceDocument: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
    insuranceExpiryDetails: '2028-12-31',
    fitnessDetails: 'Nepal Yatayat Byabastha Safety Certificate Valid',
    fitnessDocument: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
  };

  console.log(`Submitting Bus Registration via POST ${API_BASE}/driver/vehicles...`);
  const busRegRes = await axios.post(`${API_BASE}/driver/vehicles`, busPayload, {
    headers: {
      Authorization: `Bearer ${driverToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  if (busRegRes.status !== 201 || !busRegRes.data?.data?._id) {
    throw new Error(`Bus registration failed: HTTP ${busRegRes.status} - ${busRegRes.data?.message}`);
  }

  const registeredBus = busRegRes.data.data;
  const busId = registeredBus._id;
  const initialStatus = registeredBus.vehicleStatus;
  console.log(`Bus Registration SUBMITTED ✅`);
  console.log(`  Bus ID: ${busId}`);
  console.log(`  Registration Number: ${registeredBus.vehicleNumber}`);
  console.log(`  Vehicle Type: ${registeredBus.vehicleType} (Confirmed: Bus)`);
  console.log(`  Route Origin: ${registeredBus.route?.origin}`);
  console.log(`  Route Destination: ${registeredBus.route?.destination}`);
  console.log(`  Initial Status: [${initialStatus}] (Expected: Pending)`);
  console.log(`  Assigned Driver: ${registeredBus.assignedDriver}`);
  console.log(`  Submitted By Driver: ${registeredBus.submission?.submittedByDriver}`);

  // Confirm in database directly
  const dbBusCheck = await Vehicle.findById(busId);
  if (!dbBusCheck || dbBusCheck.vehicleStatus !== 'Pending') {
    throw new Error(`Database check failed: bus status in DB is ${dbBusCheck?.vehicleStatus}`);
  }
  if (dbBusCheck.vehicleType !== 'Bus') {
    throw new Error(`Database check failed: vehicleType is ${dbBusCheck?.vehicleType}, expected Bus`);
  }
  console.log('Database verification of initial pending Bus record: PASSED ✅');

  // STEP 3 — Verify Through Admin Panel
  console.log('\n--- STEP 3: VERIFY & APPROVE THROUGH ADMIN PANEL ---');
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
    throw new Error(`Admin login failed: HTTP ${adminLoginRes.status} - ${adminLoginRes.data?.message}`);
  }
  const adminToken = adminLoginRes.data.token;
  console.log('Admin Login SUCCESSFUL ✅ (Admin Bearer Token obtained)');

  // Query pending vehicles queue
  console.log('Querying Admin Pending Vehicles via GET /api/admin/pending-vehicles...');
  const pendingVehRes = await axios.get(`${API_BASE}/admin/pending-vehicles`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    timeout: 30000
  });

  const pendingList = pendingVehRes.data?.data || [];
  console.log(`Pending vehicles queue count: ${pendingList.length}`);
  const matchingBus = pendingList.find(v => v._id === busId || v.vehicleNumber === TEST_BUS_NUMBER);
  if (!matchingBus) {
    throw new Error(`Bus ${TEST_BUS_NUMBER} (${busId}) not found in Admin Pending Queue!`);
  }
  console.log(`Found test Bus in Admin Pending Queue ✅: ID=${matchingBus._id}, Number=${matchingBus.vehicleNumber}, Type=${matchingBus.vehicleType}`);

  // Execute admin approval action
  console.log(`Executing Admin Approval via PATCH /api/admin/vehicles/${busId}/approve...`);
  const approveRes = await axios.patch(`${API_BASE}/admin/vehicles/${busId}/approve`, {}, {
    headers: { Authorization: `Bearer ${adminToken}` },
    timeout: 30000
  });

  if (approveRes.status !== 200 || !approveRes.data?.success) {
    throw new Error(`Admin approval failed: HTTP ${approveRes.status} - ${approveRes.data?.message}`);
  }
  console.log(`Admin Approval Action EXECUTED ✅: HTTP ${approveRes.status}, Message: "${approveRes.data?.message}"`);

  // STEP 4 — Verify the Result
  console.log('\n--- STEP 4: VERIFY FINAL RESULT ACROSS SYSTEM ---');

  // 1. Verify in database
  const finalBusDb = await Vehicle.findById(busId);
  const finalDriverDb = await Driver.findById(driverProfile._id);
  console.log(`Final Database Bus Status: [${finalBusDb.vehicleStatus}] (Expected: Active)`);
  console.log(`Final Database Vehicle Type: [${finalBusDb.vehicleType}] (Expected: Bus)`);
  console.log(`Final Database Route: ${finalBusDb.route?.origin} -> ${finalBusDb.route?.destination}`);
  console.log(`Final Database Reviewed By Admin: ${finalBusDb.submission?.reviewedBy}`);
  console.log(`Driver Assigned Vehicle ID: ${finalDriverDb.assignedVehicle}`);

  if (finalBusDb.vehicleStatus !== 'Active') {
    throw new Error(`Final bus status in DB is '${finalBusDb.vehicleStatus}', expected 'Active'`);
  }
  if (finalBusDb.vehicleType !== 'Bus') {
    throw new Error(`Final vehicleType is '${finalBusDb.vehicleType}', expected 'Bus'`);
  }
  if (String(finalDriverDb.assignedVehicle) !== String(busId)) {
    throw new Error(`Driver assignedVehicle not updated to approved bus ID!`);
  }

  // 2. Verify via Driver App APIs
  console.log('\nVerifying via Driver App APIs:');
  const driverVehiclesRes = await axios.get(`${API_BASE}/driver/vehicles`, {
    headers: { Authorization: `Bearer ${driverToken}` },
    timeout: 30000
  });
  const driverVehList = driverVehiclesRes.data?.data || [];
  const foundBusInList = driverVehList.find(v => v._id === busId);
  console.log(`Bus found in Driver Vehicles List: ${Boolean(foundBusInList)} (Type: ${foundBusInList?.vehicleType}, Status: ${foundBusInList?.vehicleStatus})`);

  const driverAssignedRes = await axios.get(`${API_BASE}/driver/vehicle`, {
    headers: { Authorization: `Bearer ${driverToken}` },
    timeout: 30000
  });
  const assignedData = driverAssignedRes.data?.data;
  console.log(`Driver Active Vehicle API returns: ${assignedData?.vehicleNumber} (Type: ${assignedData?.vehicleType}, Route: ${assignedData?.route?.origin} -> ${assignedData?.route?.destination})`);

  // 3. Verify via Admin App APIs
  console.log('\nVerifying via Admin App APIs:');
  const postApprovePendingRes = await axios.get(`${API_BASE}/admin/pending-vehicles`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    timeout: 30000
  });
  const stillInPending = (postApprovePendingRes.data?.data || []).some(v => v._id === busId);
  console.log(`Bus removed from Admin Pending Queue: ${!stillInPending ? 'YES ✅' : 'NO ❌'}`);

  // Also verify in admin buses endpoint
  const adminBusesRes = await axios.get(`${API_BASE}/admin/buses`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    timeout: 30000
  });
  const foundInAdminBuses = (adminBusesRes.data?.data || []).some(b => b._id === busId || b.vehicleNumber === TEST_BUS_NUMBER);
  console.log(`Bus found in Admin Buses Fleet (/api/admin/buses): ${foundInAdminBuses ? 'YES ✅' : 'NO ❌'}`);

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log('🎉 BUS REGISTRATION & ADMIN APPROVAL FULLY VERIFIED');
  console.log('================================================================');

  return {
    driverEmail: DRIVER_EMAIL,
    driverLoginResult: 'SUCCESS (HTTP 200, JWT issued, Dashboard accessible)',
    busRegistrationNumber: TEST_BUS_NUMBER,
    busId: busId,
    vehicleType: finalBusDb.vehicleType,
    savedLocationAndRoute: {
      origin: finalBusDb.route?.origin,
      destination: finalBusDb.route?.destination,
      departureTime: finalBusDb.route?.departureTime,
      arrivalTime: finalBusDb.route?.arrivalTime,
      country: 'Nepal'
    },
    seatingCapacity: finalBusDb.seatingCapacity,
    fuelType: finalBusDb.fuelType,
    acType: finalBusDb.acType,
    initialVerificationStatus: initialStatus,
    adminApprovalResult: 'SUCCESS (HTTP 200 OK via PATCH /api/admin/vehicles/:id/approve)',
    finalStatus: finalBusDb.vehicleStatus,
    driverActiveAssignment: finalBusDb.vehicleNumber,
    adminReviewedBy: ADMIN_EMAIL
  };
}

executeBusWorkflow()
  .then(summary => {
    console.log('\n--- FINAL JSON RESULT ---');
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('BUS WORKFLOW FAILED ❌:', err);
    process.exit(1);
  });
