const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Cancellation = require('../src/models/Cancellation');
const Compensation = require('../src/models/Compensation');
const Insurance = require('../src/models/Insurance');
const ServiceControl = require('../src/models/ServiceControl');

const adminController = require('../src/controllers/adminController');
const driverController = require('../src/controllers/driverController');

// Mock response object
const createMockRes = () => {
  let statusCode = 200;
  let responseData = null;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    getData: () => responseData,
    getCode: () => statusCode
  };
};

async function benchmark() {
  console.log('=== CONNECTING TO DATABASE ===');
  const connStart = Date.now();
  await mongoose.connect(process.env.MONGODB_URI);
  const connTime = Date.now() - connStart;
  console.log(`Connected to MongoDB Atlas in ${connTime}ms`);

  console.log('\n======================================================');
  console.log('PHASE 1 — BEFORE OPTIMIZATION BENCHMARK');
  console.log('======================================================');

  // Find a test driver
  const testDriver = await Driver.findOne();
  if (!testDriver) {
    console.error('No driver found in database for testing.');
    process.exit(1);
  }

  // 1. Admin Dashboard Cold Call
  console.log('\n--- 1. ADMIN DASHBOARD PROFILING ---');
  const adminReq = { user: { role: 'admin', _id: 'admin_user_id' } };
  const adminResCold = createMockRes();
  
  const adminColdStart = Date.now();
  await adminController.getDashboardStats(adminReq, adminResCold, (err) => console.error(err));
  const adminColdTime = Date.now() - adminColdStart;
  const adminColdPayload = JSON.stringify(adminResCold.getData());
  const adminColdPayloadSize = Buffer.byteLength(adminColdPayload, 'utf8');

  console.log(`Admin Dashboard Cold Latency: ${adminColdTime}ms`);
  console.log(`Admin Dashboard Response Size: ${adminColdPayloadSize} bytes`);

  // Admin Dashboard Warm Runs (10 runs)
  const adminWarmTimes = [];
  for (let i = 0; i < 10; i++) {
    const res = createMockRes();
    const start = Date.now();
    await adminController.getDashboardStats(adminReq, res, (err) => console.error(err));
    adminWarmTimes.push(Date.now() - start);
  }
  const adminWarmAvg = (adminWarmTimes.reduce((a, b) => a + b, 0) / adminWarmTimes.length).toFixed(1);
  console.log(`Admin Dashboard Warm Latencies (10 runs): ${adminWarmTimes.join(', ')} ms`);
  console.log(`Admin Dashboard Warm Average: ${adminWarmAvg}ms`);

  // Admin DB Individual Breakdown
  console.log('\nAdmin DB Query Breakdown (Sequential):');
  const t1 = Date.now();
  await User.countDocuments({ role: 'customer' });
  const tUser = Date.now() - t1;

  const t2 = Date.now();
  await Driver.countDocuments();
  const tDriver = Date.now() - t2;

  const t3 = Date.now();
  await Vehicle.countDocuments();
  await Vehicle.countDocuments({ vehicleStatus: 'Active' });
  await Vehicle.countDocuments({ vehicleStatus: 'Inactive' });
  await Vehicle.countDocuments({ vehicleStatus: 'Blocked' });
  const tVehicles = Date.now() - t3;

  const t4 = Date.now();
  await Booking.countDocuments();
  const tBooking = Date.now() - t4;

  const t5 = Date.now();
  const payments = await Payment.find();
  const tPayments = Date.now() - t5;

  const t6 = Date.now();
  await Driver.countDocuments({
    $or: [{ drivingLicenceStatus: 'Pending' }, { rcStatus: 'Pending' }, { insuranceStatus: 'Pending' }, { fitnessStatus: 'Pending' }]
  });
  await Driver.countDocuments({
    $or: [{ drivingLicenceStatus: 'Pending' }, { rcStatus: 'Pending' }]
  });
  const tDocCounts = Date.now() - t6;

  const t7 = Date.now();
  await Cancellation.countDocuments();
  await Compensation.countDocuments();
  await Insurance.countDocuments();
  const tOtherCounts = Date.now() - t7;

  const t8 = Date.now();
  await ServiceControl.findOne();
  const tService = Date.now() - t8;

  const t9 = Date.now();
  await Booking.find().populate('vehicle').populate('driver').sort({ createdAt: -1 }).limit(6);
  const tRecent = Date.now() - t9;

  console.log(`  - User.countDocuments: ${tUser}ms`);
  console.log(`  - Driver.countDocuments: ${tDriver}ms`);
  console.log(`  - Vehicle counts (4 queries): ${tVehicles}ms`);
  console.log(`  - Booking.countDocuments: ${tBooking}ms`);
  console.log(`  - Payment.find() [Unbounded Full Scan]: ${tPayments}ms (${payments.length} docs loaded)`);
  console.log(`  - Driver verification counts (2 queries): ${tDocCounts}ms`);
  console.log(`  - Cancellation/Compensation/Insurance counts: ${tOtherCounts}ms`);
  console.log(`  - ServiceControl.findOne: ${tService}ms`);
  console.log(`  - Booking.find with 2x populates: ${tRecent}ms`);
  console.log(`  Total sequential sum of individual DB round-trips: ${tUser + tDriver + tVehicles + tBooking + tPayments + tDocCounts + tOtherCounts + tService + tRecent}ms`);

  // 2. Driver Dashboard Profiling
  console.log('\n--- 2. DRIVER DASHBOARD PROFILING ---');
  const driverReq = { driver: testDriver };
  const driverResCold = createMockRes();

  const driverColdStart = Date.now();
  await driverController.getDriverDashboard(driverReq, driverResCold, (err) => console.error(err));
  const driverColdTime = Date.now() - driverColdStart;
  const driverColdPayload = JSON.stringify(driverResCold.getData());
  const driverColdPayloadSize = Buffer.byteLength(driverColdPayload, 'utf8');

  console.log(`Driver Dashboard Cold Latency: ${driverColdTime}ms`);
  console.log(`Driver Dashboard Response Size: ${driverColdPayloadSize} bytes`);

  // Driver Dashboard Warm Runs (10 runs)
  const driverWarmTimes = [];
  for (let i = 0; i < 10; i++) {
    const res = createMockRes();
    const start = Date.now();
    await driverController.getDriverDashboard(driverReq, res, (err) => console.error(err));
    driverWarmTimes.push(Date.now() - start);
  }
  const driverWarmAvg = (driverWarmTimes.reduce((a, b) => a + b, 0) / driverWarmTimes.length).toFixed(1);
  console.log(`Driver Dashboard Warm Latencies (10 runs): ${driverWarmTimes.join(', ')} ms`);
  console.log(`Driver Dashboard Warm Average: ${driverWarmAvg}ms`);

  // 3. Explain stats for key queries
  console.log('\n--- 3. MONGODB EXPLAIN STATS (CURRENT INDEXES) ---');
  const bookingExplain = await Booking.find({
    driver: testDriver._id,
    bookingStatus: { $in: ['Confirmed', 'Ongoing', 'Completed', 'Cancelled'] }
  }).explain('executionStats');
  
  console.log('Booking Driver History Query Winning Stage:', bookingExplain.queryPlanner.winningPlan.stage);
  console.log('Booking Driver History Execution Docs Examined:', bookingExplain.executionStats.totalDocsExamined);
  console.log('Booking Driver History Execution Keys Examined:', bookingExplain.executionStats.totalKeysExamined);
  console.log('Booking Driver History Execution Time:', bookingExplain.executionStats.executionTimeMillis, 'ms');

  const paymentExplain = await Payment.find({ driver: testDriver._id }).explain('executionStats');
  console.log('Payment Driver Query Winning Stage:', paymentExplain.queryPlanner.winningPlan.stage);
  console.log('Payment Driver Execution Docs Examined:', paymentExplain.executionStats.totalDocsExamined);
  console.log('Payment Driver Execution Keys Examined:', paymentExplain.executionStats.totalKeysExamined);
  console.log('Payment Driver Execution Time:', paymentExplain.executionStats.executionTimeMillis, 'ms');

  await mongoose.disconnect();
  console.log('\nBenchmark completed.');
}

benchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
