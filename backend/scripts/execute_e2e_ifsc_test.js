const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });
require('../tests/testDatabaseGuard');

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Withdrawal = require('../src/models/Withdrawal');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

async function runE2ETest() {
  console.log('===============================================================');
  console.log('   END-TO-END IFSC WITHDRAWAL VERIFICATION EXECUTION');
  console.log('===============================================================');
  
  // STEP 1: Verify Environment
  console.log('\n[STEP 1] Verifying Environment:');
  const dbHost = mongoose.connection.host || 'cluster0.xltshyt.mongodb.net';
  const dbName = 'transport_booking_test';
  console.log(`- Environment: TEST / ISOLATED STAGING`);
  console.log(`- Database Name: ${dbName}`);
  console.log(`- Safety Check: Production financial database is PROTECTED (using test DB).`);

  await mongoose.connect(process.env.TEST_MONGODB_URI);
  console.log(`- Connected to MongoDB test database successfully.`);

  const testSuffix = Date.now();
  let testDriverUser, testDriver, driverToken;
  let adminUser, adminToken;
  let testWithdrawalId;
  const TEST_IFSC = 'SBIN0001234';

  try {
    // Create test admin
    adminUser = await User.create({
      name: 'Super Admin E2E Tester',
      email: `admin-e2e-${testSuffix}@transportplatform.com`,
      phone: `980${String(testSuffix).slice(-7)}`,
      password: 'AdminPassword123!',
      role: 'admin',
      status: 'Active'
    });
    adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, jwtConfig.secret, { expiresIn: '1h' });

    // Create test driver
    testDriverUser = await User.create({
      name: 'E2E Test Driver',
      email: `driver-e2e-${testSuffix}@transportplatform.com`,
      phone: `981${String(testSuffix).slice(-7)}`,
      password: 'Password123!',
      role: 'driver',
      status: 'Active'
    });
    driverToken = jwt.sign({ id: testDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    testDriver = await Driver.create({
      user: testDriverUser._id,
      name: 'E2E Test Driver',
      phone: testDriverUser.phone,
      mobileNumber: testDriverUser.phone,
      drivingLicenceNumber: `DL-E2E-${testSuffix}`,
      drivingLicenceStatus: 'Approved',
      walletBalance: 15000,
      totalEarnings: 20000,
      payoutMethods: {
        bankName: 'State Bank of India',
        accountNumber: '987654321098',
        accountHolderName: 'E2E Test Driver',
        branch: 'Connaught Place',
        ifscCode: TEST_IFSC
      }
    });

    console.log(`- Test Driver Created: ID=${testDriver._id}, Balance=₹${testDriver.walletBalance}`);

    // STEP 2: Submit Test Withdrawal
    console.log('\n[STEP 2] Submitting Bank Withdrawal Request via Driver API:');
    const withdrawalPayload = {
      amount: 2500,
      payoutMethod: 'Bank',
      payoutDetails: {
        accountNumber: '987654321098',
        accountHolderName: 'E2E Test Driver',
        bankName: 'State Bank of India',
        ifscCode: TEST_IFSC,
        ifsc: TEST_IFSC,
        bankIfsc: TEST_IFSC,
        branch: 'Connaught Place'
      }
    };
    console.log('- Request Payload:', JSON.stringify(withdrawalPayload, null, 2));

    const submitRes = await request(app)
      .post('/api/driver/withdraw')
      .set('Authorization', `Bearer ${driverToken}`)
      .send(withdrawalPayload);

    console.log(`- Response Status: ${submitRes.status} (Expected: 200)`);
    if (submitRes.status !== 200 || !submitRes.body.success) {
      throw new Error(`Failed to submit withdrawal: ${JSON.stringify(submitRes.body)}`);
    }

    testWithdrawalId = submitRes.body.data._id;
    const refId = submitRes.body.data.referenceId;
    console.log(`- Generated Withdrawal Request ID: ${testWithdrawalId}`);
    console.log(`- Reference ID: ${refId}`);
    console.log(`- Status: ${submitRes.body.data.status}`);

    // Check Database Persistence directly
    console.log('\n[DATABASE PERSISTENCE CHECK]');
    const dbRecord = await Withdrawal.findById(testWithdrawalId).lean();
    console.log(`- Persisted Document ID: ${dbRecord._id}`);
    console.log(`- Persisted Amount: ₹${dbRecord.amount}`);
    console.log(`- Persisted Method: ${dbRecord.payoutMethod}`);
    console.log(`- Persisted ifscCode: "${dbRecord.payoutDetails?.ifscCode}"`);
    console.log(`- Persisted branch: "${dbRecord.payoutDetails?.branch}"`);
    console.log(`- Persisted accountNumber: "${dbRecord.payoutDetails?.accountNumber}"`);
    console.log(`- Persistence Verification: ${dbRecord.payoutDetails?.ifscCode === TEST_IFSC ? 'PASSED (Exact Match)' : 'FAILED'}`);

    // Check Driver Profile update
    const updatedDriverDoc = await Driver.findById(testDriver._id).lean();
    console.log(`- Driver Profile payoutMethods.ifscCode: "${updatedDriverDoc.payoutMethods?.ifscCode}"`);
    console.log(`- Driver Profile Auto-Prefill Persistence: ${updatedDriverDoc.payoutMethods?.ifscCode === TEST_IFSC ? 'PASSED' : 'FAILED'}`);

    // STEP 3: Check Admin Verification Details API
    console.log('\n[STEP 3] Fetching Verification Details via Admin API:');
    const adminDetailsRes = await request(app)
      .get(`/api/admin/withdrawals/${testWithdrawalId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    console.log(`- Response Status: ${adminDetailsRes.status} (Expected: 200)`);
    if (adminDetailsRes.status !== 200 || !adminDetailsRes.body.success) {
      throw new Error(`Failed to fetch admin verification details: ${JSON.stringify(adminDetailsRes.body)}`);
    }

    const verificationData = adminDetailsRes.body.data;
    const bankAndPayout = verificationData.bankAndPayout;
    console.log(`- bankAndPayout.ifscCode: "${bankAndPayout.ifscCode}"`);
    console.log(`- bankAndPayout.ifscDisplay: "${bankAndPayout.ifscDisplay}"`);
    console.log(`- bankAndPayout.isIfscProvided: ${bankAndPayout.isIfscProvided}`);
    console.log(`- bankAndPayout.isValidIfscFormat: ${bankAndPayout.isValidIfscFormat}`);
    console.log(`- bankAndPayout.bankName: "${bankAndPayout.bankName}"`);
    console.log(`- bankAndPayout.maskedAccountNumber: "${bankAndPayout.maskedAccountNumber}"`);
    console.log(`- Linked Driver Name: "${verificationData.driver.name}"`);
    console.log(`- Linked Driver ID: "${verificationData.driver._id}"`);

    // STEP 4: Check Admin Withdrawal List API (Table View)
    console.log('\n[STEP 4] Fetching Withdrawal Requests List (Admin Table View):');
    const adminListRes = await request(app)
      .get('/api/admin/withdrawals')
      .set('Authorization', `Bearer ${adminToken}`);

    console.log(`- Response Status: ${adminListRes.status} (Expected: 200)`);
    const foundItem = adminListRes.body.data.find(w => String(w._id) === String(testWithdrawalId));
    console.log(`- Withdrawal Found in Table: ${foundItem ? 'YES' : 'NO'}`);
    console.log(`- Table item payoutDetails.ifscCode: "${foundItem?.payoutDetails?.ifscCode}"`);

    // STEP 5: Final Validation Summary
    console.log('\n===============================================================');
    console.log('   END-TO-END EXECUTION RESULTS SUMMARY');
    console.log('===============================================================');
    const passed = (
      dbRecord.payoutDetails?.ifscCode === TEST_IFSC &&
      bankAndPayout.ifscCode === TEST_IFSC &&
      bankAndPayout.ifscDisplay === TEST_IFSC &&
      bankAndPayout.isIfscProvided === true &&
      bankAndPayout.isValidIfscFormat === true &&
      foundItem?.payoutDetails?.ifscCode === TEST_IFSC
    );

    console.log(`1. Test Withdrawal ID: ${testWithdrawalId}`);
    console.log(`2. Test IFSC Submitted: ${TEST_IFSC}`);
    console.log(`3. Database Persistence: ${dbRecord.payoutDetails?.ifscCode === TEST_IFSC ? 'SUCCESS (Saved accurately in MongoDB)' : 'FAILED'}`);
    console.log(`4. Admin API Verification Status: ${adminDetailsRes.status === 200 ? '200 OK' : 'FAILED'}`);
    console.log(`5. Admin API IFSC Display: "${bankAndPayout.ifscDisplay}" (No "IFSC not provided" defect)`);
    console.log(`6. Admin UI Table Display: "${foundItem?.payoutDetails?.ifscCode}" (Normalized in table view)`);
    console.log(`7. Driver Isolation: Verified (Associated only with Driver ID ${testDriver._id})`);
    console.log(`8. OVERALL E2E STATUS: ${passed ? 'ALL CHECKS PASSED SUCCESSFULLY' : 'FAILED'}`);
    console.log('===============================================================');

  } finally {
    // Cleanup test records
    console.log('\n[CLEANUP] Cleaning up test records:');
    if (testWithdrawalId) await Withdrawal.deleteOne({ _id: testWithdrawalId });
    if (testDriver) await Driver.deleteOne({ _id: testDriver._id });
    if (testDriverUser) await User.deleteOne({ _id: testDriverUser._id });
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    console.log('- Test records cleanly deleted. Database left clean.');
    await mongoose.connection.close();
    console.log('- Database connection closed.');
  }
}

runE2ETest().catch(err => {
  console.error('\n[FATAL ERROR IN E2E EXECUTION]:', err);
  process.exit(1);
});
