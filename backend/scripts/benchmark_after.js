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
const { dashboardCache } = require('../src/utils/cache');

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
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  console.log('\n======================================================');
  console.log('PHASE 11 — AFTER OPTIMIZATION BENCHMARK');
  console.log('======================================================');

  const testDriver = await Driver.findOne();
  if (!testDriver) {
    console.error('No driver found.');
    process.exit(1);
  }

  // Clear cache for fresh measurement
  dashboardCache.clear();

  // 1. Admin Dashboard Benchmark (Uncached / DB execution)
  console.log('\n--- 1. ADMIN DASHBOARD PROFILING (OPTIMIZED) ---');
  const adminReq = { user: { role: 'admin', _id: 'admin_user_id' } };
  
  // Uncached DB execution time (Parallel Promise.all)
  const dbStart = Date.now();
  const uncachedRes = createMockRes();
  await adminController.getDashboardStats(adminReq, uncachedRes, (err) => console.error(err));
  const uncachedTime = Date.now() - dbStart;
  const adminPayload = JSON.stringify(uncachedRes.getData());
  const adminPayloadSize = Buffer.byteLength(adminPayload, 'utf8');

  console.log(`Admin Dashboard Optimized DB Query Time (Uncached): ${uncachedTime}ms`);
  console.log(`Admin Dashboard Response Size: ${adminPayloadSize} bytes`);

  // Cached Warm calls (10 runs)
  const adminWarmTimes = [];
  for (let i = 0; i < 10; i++) {
    const res = createMockRes();
    const start = Date.now();
    await adminController.getDashboardStats(adminReq, res, (err) => console.error(err));
    adminWarmTimes.push(Date.now() - start);
  }
  const adminWarmAvg = (adminWarmTimes.reduce((a, b) => a + b, 0) / adminWarmTimes.length).toFixed(2);
  console.log(`Admin Dashboard Cached Warm Latencies (10 runs): ${adminWarmTimes.join(', ')} ms`);
  console.log(`Admin Dashboard Cached Warm Average: ${adminWarmAvg}ms`);

  // 2. Driver Dashboard Benchmark (Optimized)
  console.log('\n--- 2. DRIVER DASHBOARD PROFILING (OPTIMIZED) ---');
  dashboardCache.clear();
  const driverReq = { driver: testDriver };

  const driverDbStart = Date.now();
  const driverUncachedRes = createMockRes();
  await driverController.getDriverDashboard(driverReq, driverUncachedRes, (err) => console.error(err));
  const driverUncachedTime = Date.now() - driverDbStart;
  const driverPayload = JSON.stringify(driverUncachedRes.getData());
  const driverPayloadSize = Buffer.byteLength(driverPayload, 'utf8');

  console.log(`Driver Dashboard Optimized DB Query Time (Uncached): ${driverUncachedTime}ms`);
  console.log(`Driver Dashboard Response Size: ${driverPayloadSize} bytes`);

  // Cached Warm calls (10 runs)
  const driverWarmTimes = [];
  for (let i = 0; i < 10; i++) {
    const res = createMockRes();
    const start = Date.now();
    await driverController.getDriverDashboard(driverReq, res, (err) => console.error(err));
    driverWarmTimes.push(Date.now() - start);
  }
  const driverWarmAvg = (driverWarmTimes.reduce((a, b) => a + b, 0) / driverWarmTimes.length).toFixed(2);
  console.log(`Driver Dashboard Cached Warm Latencies (10 runs): ${driverWarmTimes.join(', ')} ms`);
  console.log(`Driver Dashboard Cached Warm Average: ${driverWarmAvg}ms`);

  // 3. MongoDB Explain stats with Indexes
  console.log('\n--- 3. MONGODB EXPLAIN STATS (OPTIMIZED INDEXES) ---');
  // Trigger index sync
  await Booking.syncIndexes();
  await Payment.syncIndexes();
  await Vehicle.syncIndexes();
  await Driver.syncIndexes();

  const bookingExplain = await Booking.find({
    driver: testDriver._id,
    bookingStatus: { $in: ['Confirmed', 'Ongoing', 'Completed', 'Cancelled'] }
  }).explain('executionStats');
  
  console.log('Booking Driver Query Winning Stage:', bookingExplain.queryPlanner.winningPlan.stage);
  if (bookingExplain.queryPlanner.winningPlan.inputStage) {
    console.log('Booking Query Input Stage:', bookingExplain.queryPlanner.winningPlan.inputStage.stage);
  }
  console.log('Booking Docs Examined:', bookingExplain.executionStats.totalDocsExamined);
  console.log('Booking Keys Examined:', bookingExplain.executionStats.totalKeysExamined);
  console.log('Booking Execution Time:', bookingExplain.executionStats.executionTimeMillis, 'ms');

  const paymentExplain = await Payment.find({ driver: testDriver._id }).explain('executionStats');
  console.log('Payment Driver Query Winning Stage:', paymentExplain.queryPlanner.winningPlan.stage);
  if (paymentExplain.queryPlanner.winningPlan.inputStage) {
    console.log('Payment Query Input Stage:', paymentExplain.queryPlanner.winningPlan.inputStage.stage);
  }
  console.log('Payment Docs Examined:', paymentExplain.executionStats.totalDocsExamined);
  console.log('Payment Keys Examined:', paymentExplain.executionStats.totalKeysExamined);
  console.log('Payment Execution Time:', paymentExplain.executionStats.executionTimeMillis, 'ms');

  await mongoose.disconnect();
  console.log('\nVerification completed.');
}

benchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
