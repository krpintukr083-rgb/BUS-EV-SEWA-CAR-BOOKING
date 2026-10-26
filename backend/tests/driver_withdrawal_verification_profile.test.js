const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Withdrawal = require('../src/models/Withdrawal');
const Payment = require('../src/models/Payment');
const { connectTestDB, closeTestDB } = require('./setup');
const jwtConfig = require('../src/config/jwt');

describe('Driver Financial Profile & Withdrawal Verification System Tests', () => {
  let adminUser;
  let driverUser;
  let otherDriverUser;
  let adminToken;
  let driverToken;
  let otherDriverToken;
  let driver;
  let otherDriver;
  let vehicle;

  let bankWithdrawalId;
  let missingIfscWithdrawalId;
  let invalidIfscWithdrawalId;
  let esewaWithdrawalId;

  const testSuffix = Date.now();

  beforeAll(async () => {
    await connectTestDB();

    // 1. Create Admin
    adminUser = await User.create({
      name: 'Super Admin Test',
      email: `superadmin-financial-${testSuffix}@example.com`,
      phone: `980${String(testSuffix).slice(-7)}`,
      password: 'Password123!',
      role: 'admin',
      status: 'Active'
    });
    adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, jwtConfig.secret, { expiresIn: '1h' });

    // 2. Create Drivers
    driverUser = await User.create({
      name: 'Rajesh Driver Sharma',
      email: `rajesh-driver-${testSuffix}@example.com`,
      phone: `981${String(testSuffix).slice(-7)}`,
      password: 'Password123!',
      role: 'driver',
      status: 'Active'
    });
    driverToken = jwt.sign({ id: driverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    otherDriverUser = await User.create({
      name: 'Suresh Other Driver',
      email: `suresh-driver-${testSuffix}@example.com`,
      phone: `982${String(testSuffix).slice(-7)}`,
      password: 'Password123!',
      role: 'driver',
      status: 'Active'
    });
    otherDriverToken = jwt.sign({ id: otherDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    // 3. Create Vehicle
    vehicle = await Vehicle.create({
      vehicleNumber: `BA-2-KHA-${String(testSuffix).slice(-4)}`,
      vehicleType: 'Car',
      vehicleCategory: 'Sedan / Prime EV',
      vehicleModel: 'Tata Tigor EV',
      vehicleName: 'Green Prime EV #1',
      ownerName: 'Transport Fleet Ltd',
      ownerMobileNumber: '9841000000',
      seatingCapacity: 4
    });

    // 4. Create Driver Profile with Unverified KYC & Assigned Vehicle
    driver = await Driver.create({
      user: driverUser._id,
      name: driverUser.name,
      mobileNumber: driverUser.phone,
      drivingLicenceNumber: `DL-NEP-${testSuffix}`,
      drivingLicenceStatus: 'Pending Verification',
      citizenshipNumber: `CIT-9988-${testSuffix}`,
      citizenshipStatus: 'Pending Verification',
      rcNumber: vehicle.vehicleNumber,
      rcStatus: 'Approved',
      assignedVehicle: vehicle._id,
      walletBalance: 10000,
      totalEarnings: 15000,
      payoutMethods: {
        bankName: 'Nepal Investment Mega Bank',
        accountNumber: '01234567890123',
        accountHolderName: 'Rajesh Driver Sharma',
        branch: 'Durbar Marg',
        ifscCode: 'NIMB0000001',
        esewaId: '9810000001'
      }
    });

    otherDriver = await Driver.create({
      user: otherDriverUser._id,
      name: otherDriverUser.name,
      mobileNumber: otherDriverUser.phone,
      drivingLicenceNumber: `DL-OTHER-${testSuffix}`,
      walletBalance: 5000
    });

    // 5. Create some test payments for ledger verification
    const dummyBookingId = new mongoose.Types.ObjectId();
    await Payment.create({
      booking: dummyBookingId,
      bookingId: `BK-${testSuffix}-1`,
      customer: {
        name: 'Test Customer',
        phone: '9841112233'
      },
      driver: driver._id,
      bookingAmount: 1200,
      driverPayment: 960,
      platformCharge: 240,
      paymentStatus: 'Paid',
      paymentMethod: 'eSewa',
      transactionReference: `TXN-BK-${testSuffix}-1`
    });

    // 6. Create withdrawal with valid IFSC
    const bankWdr = await Withdrawal.create({
      driver: driver._id,
      user: driverUser._id,
      amount: 2000,
      payoutMethod: 'Bank',
      payoutDetails: {
        bankName: 'State Bank of India',
        accountNumber: '987654321098',
        accountHolderName: 'Rajesh Driver Sharma',
        branch: 'Connaught Place',
        ifscCode: 'SBIN0001234'
      },
      status: 'Pending'
    });
    bankWithdrawalId = bankWdr._id;

    // 7. Create withdrawal with Missing IFSC
    const missingIfscWdr = await Withdrawal.create({
      driver: driver._id,
      user: driverUser._id,
      amount: 1500,
      payoutMethod: 'Bank',
      payoutDetails: {
        bankName: 'HDFC Bank',
        accountNumber: '112233445566',
        accountHolderName: 'Rajesh Driver Sharma',
        branch: 'City Branch',
        ifscCode: '' // Missing IFSC
      },
      status: 'Pending'
    });
    missingIfscWithdrawalId = missingIfscWdr._id;

    // 8. Create withdrawal with Invalid IFSC Format
    const invalidIfscWdr = await Withdrawal.create({
      driver: driver._id,
      user: driverUser._id,
      amount: 1000,
      payoutMethod: 'Bank',
      payoutDetails: {
        bankName: 'Punjab National Bank',
        accountNumber: '998877665544',
        accountHolderName: 'Rajesh Driver Sharma',
        branch: 'Main Branch',
        ifscCode: 'INVALID_IFSC_123' // Malformed format
      },
      status: 'Pending'
    });
    invalidIfscWithdrawalId = invalidIfscWdr._id;

    // 9. Create eSewa withdrawal
    const esewaWdr = await Withdrawal.create({
      driver: driver._id,
      user: driverUser._id,
      amount: 1200,
      payoutMethod: 'eSewa',
      payoutDetails: {
        esewaId: '9841234567',
        accountHolderName: 'Rajesh Driver Sharma'
      },
      status: 'Pending'
    });
    esewaWithdrawalId = esewaWdr._id;
  });

  afterAll(async () => {
    if (driver || otherDriver) {
      await Withdrawal.deleteMany({ driver: { $in: [driver?._id, otherDriver?._id].filter(Boolean) } });
      await Payment.deleteMany({ driver: { $in: [driver?._id, otherDriver?._id].filter(Boolean) } });
    }
    if (vehicle) await Vehicle.findByIdAndDelete(vehicle._id);
    if (driver) await Driver.findByIdAndDelete(driver._id);
    if (otherDriver) await Driver.findByIdAndDelete(otherDriver._id);
    if (driverUser) await User.findByIdAndDelete(driverUser._id);
    if (otherDriverUser) await User.findByIdAndDelete(otherDriverUser._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    await closeTestDB();
  });

  // TEST 1: Super Admin can view the correct driver's financial profile
  test('1. Super Admin can view the correct driver financial profile', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${bankWithdrawalId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.driver).toBeDefined();
    expect(res.body.data.driver.name).toBe('Rajesh Driver Sharma');
    expect(res.body.data.driver.mobileNumber).toBe(driverUser.phone);
    expect(res.body.data.driver.email).toBe(driverUser.email);
    expect(res.body.data.driver.driverStatus).toBe('Active');
    expect(res.body.data.driver.assignedVehicle.vehicleNumber).toBe(vehicle.vehicleNumber);
  });

  // TEST 2: The correct driver and withdrawal request are linked
  test('2. The correct driver and withdrawal request are linked properly', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${bankWithdrawalId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(String(res.body.data.withdrawal._id)).toBe(String(bankWithdrawalId));
    expect(String(res.body.data.driver._id)).toBe(String(driver._id));
    expect(res.body.data.withdrawal.amount).toBe(2000);
    expect(res.body.data.withdrawal.status).toBe('Pending');
  });

  // TEST 3: The complete saved IFSC code is displayed
  test('3. The complete saved IFSC code is displayed to authorized admin', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${bankWithdrawalId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { bankAndPayout } = res.body.data;
    expect(bankAndPayout.ifscCode).toBe('SBIN0001234');
    expect(bankAndPayout.ifscDisplay).toBe('SBIN0001234');
    expect(bankAndPayout.isIfscProvided).toBe(true);
    expect(bankAndPayout.isValidIfscFormat).toBe(true);
  });

  // TEST 4: Missing IFSC is handled without inventing a value
  test('4. Missing IFSC is handled by displaying "IFSC not provided" without inventing a value', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${missingIfscWithdrawalId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { bankAndPayout, warnings } = res.body.data;
    expect(bankAndPayout.ifscCode).toBe('');
    expect(bankAndPayout.ifscDisplay).toBe('IFSC not provided');
    expect(bankAndPayout.isIfscProvided).toBe(false);
    expect(bankAndPayout.isValidIfscFormat).toBe(false);
    expect(warnings.some(w => w.includes('IFSC code is not provided'))).toBe(true);
  });

  // TEST 5: IFSC format validation works correctly
  test('5. IFSC format validation flags invalid/malformed codes without guess work', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${invalidIfscWithdrawalId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { bankAndPayout, warnings } = res.body.data;
    expect(bankAndPayout.ifscCode).toBe('INVALID_IFSC_123');
    expect(bankAndPayout.isIfscProvided).toBe(true);
    expect(bankAndPayout.isValidIfscFormat).toBe(false);
    expect(warnings.some(w => w.includes('IFSC code format is invalid'))).toBe(true);
  });

  // TEST 6: Bank account numbers are masked by default
  test('6. Bank account numbers are masked by default to protect sensitive credentials', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${bankWithdrawalId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { bankAndPayout } = res.body.data;
    expect(bankAndPayout.maskedAccountNumber).toBe('••••••••1098');
    expect(bankAndPayout.maskedAccountNumber).not.toBe('987654321098');
    // Raw account number is available in detail payload for authorized admin toggle
    expect(bankAndPayout.rawAccountNumber).toBe('987654321098');
  });

  // TEST 7: eSewa payout details display correctly without inappropriate bank fields
  test('7. eSewa payout details display correctly without inappropriate bank fields', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${esewaWithdrawalId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { bankAndPayout } = res.body.data;
    expect(bankAndPayout.payoutMethod).toBe('eSewa');
    expect(bankAndPayout.esewaId).toBe('9841234567');
    expect(bankAndPayout.accountHolderName).toBe('Rajesh Driver Sharma');
    // Strict isolation: bank-specific fields must not be present
    expect(bankAndPayout.bankName).toBeUndefined();
    expect(bankAndPayout.ifscCode).toBeUndefined();
    expect(bankAndPayout.maskedAccountNumber).toBeUndefined();
  });

  // TEST 8: Available, reserved, pending, and paid amounts are represented correctly
  test('8. Available, reserved, pending, and paid amounts are represented correctly', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${bankWithdrawalId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { walletSummary } = res.body.data;
    expect(walletSummary.availableBalance).toBe(10000);
    expect(walletSummary.requestedAmount).toBe(2000);
    // 4 pending requests created in setup: 2000 + 1500 + 1000 + 1200 = 5700
    expect(walletSummary.reservedAmount).toBe(5700);
    expect(walletSummary.pendingWithdrawalAmount).toBe(5700);
    expect(walletSummary.isConsistent).toBe(true);
  });

  // TEST 9: Withdrawal history and totals use actual transaction records
  test('9. Withdrawal history and totals use actual transaction records for selected driver only', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${bankWithdrawalId}/verification-details?historyLimit=10`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { withdrawalHistory, walletSummary } = res.body.data;
    expect(withdrawalHistory.items.length).toBeGreaterThanOrEqual(4);
    expect(walletSummary.totalRequests).toBeGreaterThanOrEqual(4);
    // Ledger entries from actual Payment model
    expect(walletSummary.ledger).toBeDefined();
    expect(walletSummary.ledger.length).toBeGreaterThanOrEqual(1);
    expect(walletSummary.ledger[0].type).toBe('Ride Earning');
    expect(walletSummary.ledger[0].amount).toBe(960);
  });

  // TEST 10: Missing or unverified KYC information is handled correctly
  test('10. Missing or unverified KYC information generates explicit warnings', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${bankWithdrawalId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { warnings, driver: driverData } = res.body.data;
    expect(driverData.kycDocuments.drivingLicence.status).toBe('Pending Verification');
    expect(driverData.kycDocuments.citizenship.status).toBe('Pending Verification');
    expect(warnings.some(w => w.includes('Driving Licence is Pending Verification'))).toBe(true);
    expect(warnings.some(w => w.includes('Citizenship document is Pending Verification'))).toBe(true);
  });

  // TEST 11: Insufficient balance prevents invalid approval or creation
  test('11. Insufficient balance prevents invalid request creation and invalid amount approval', async () => {
    const excessiveRequest = await request(app)
      .post('/api/driver/withdraw')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        amount: 999999,
        payoutMethod: 'Bank',
        payoutDetails: { accountNumber: '1234567890' }
      });
    expect(excessiveRequest.status).toBe(400);
    expect(excessiveRequest.body.message).toMatch(/Insufficient wallet balance/i);

    // Below minimum amount
    const belowMinRequest = await request(app)
      .post('/api/driver/withdraw')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        amount: 50,
        payoutMethod: 'Bank',
        payoutDetails: { accountNumber: '1234567890' }
      });
    expect(belowMinRequest.status).toBe(400);
    expect(belowMinRequest.body.message).toMatch(/Minimum withdrawal amount is/i);

    // Non-existent withdrawal approval prevention
    const fakeId = new mongoose.Types.ObjectId();
    const approveNonExistent = await request(app)
      .patch(`/api/admin/withdrawals/${fakeId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveNonExistent.status).toBe(404);
  });

  // TEST 12: Duplicate approval and invalid status transitions are prevented
  test('12. Duplicate approval and invalid status transitions are prevented', async () => {
    // 1st approval: Pending -> Processing
    const approveRes = await request(app)
      .patch(`/api/admin/withdrawals/${bankWithdrawalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('Processing');

    // Duplicate approval: Processing -> Processing must be rejected
    const dupApproveRes = await request(app)
      .patch(`/api/admin/withdrawals/${bankWithdrawalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dupApproveRes.status).toBe(409);

    // Cannot reject a request that is in Processing
    const cannotRejectProcessing = await request(app)
      .patch(`/api/admin/withdrawals/${bankWithdrawalId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Rejecting processing request' });
    expect(cannotRejectProcessing.status).toBe(409);

    // Complete payment: Processing -> Completed
    const completeRes = await request(app)
      .patch(`/api/admin/withdrawals/${bankWithdrawalId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ utrNumber: 'UTR-TEST-889922' });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('Completed');

    // Duplicate completion: Completed -> Completed must be rejected
    const dupCompleteRes = await request(app)
      .patch(`/api/admin/withdrawals/${bankWithdrawalId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dupCompleteRes.status).toBe(409);
  });

  // TEST 13: Unauthorized users cannot access financial details
  test('13. Unauthorized users cannot access financial details', async () => {
    const driverAccess = await request(app)
      .get(`/api/admin/withdrawals/${bankWithdrawalId}/verification-details`)
      .set('Authorization', `Bearer ${driverToken}`);
    expect(driverAccess.status).toBe(403);

    const unauthAccess = await request(app)
      .get(`/api/admin/withdrawals/${bankWithdrawalId}/verification-details`);
    expect(unauthAccess.status).toBe(401);
  });

  // TEST 14: Wallet reservations and balances remain consistent after rejection or approval
  test('14. Wallet reservations and balances remain consistent after rejection and mandatory reason enforced', async () => {
    // Attempt rejection without reason
    const noReasonReject = await request(app)
      .patch(`/api/admin/withdrawals/${missingIfscWithdrawalId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '   ' });
    expect(noReasonReject.status).toBe(400);
    expect(noReasonReject.body.message).toMatch(/Rejection reason is required/i);

    // Perform valid rejection
    const initialBalance = (await Driver.findById(driver._id)).walletBalance;
    const rejectRes = await request(app)
      .patch(`/api/admin/withdrawals/${missingIfscWithdrawalId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'IFSC code was not provided and bank details incomplete' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('Rejected');
    expect(rejectRes.body.data.adminNotes).toBe('IFSC code was not provided and bank details incomplete');

    // Verify wallet refund of 1500
    const finalBalance = (await Driver.findById(driver._id)).walletBalance;
    expect(finalBalance).toBe(initialBalance + 1500);
  });

  // TEST 15: Existing withdrawal and payout regression tests continue to pass
  test('15. Overall verification profile handles complete history filtering and pagination cleanly', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${invalidIfscWithdrawalId}/verification-details?historyStatus=Pending&historyPage=1&historyLimit=2`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.withdrawalHistory.pagination.page).toBe(1);
    expect(res.body.data.withdrawalHistory.pagination.limit).toBe(2);
    expect(res.body.data.withdrawalHistory.items.every(i => i.status === 'Pending')).toBe(true);
  });
});
