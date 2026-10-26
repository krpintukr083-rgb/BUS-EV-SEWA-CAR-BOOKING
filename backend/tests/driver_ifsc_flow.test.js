const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Withdrawal = require('../src/models/Withdrawal');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

jest.setTimeout(40000);

describe('Driver IFSC Code End-to-End Persistence and Verification Flow', () => {
  let driverUserA, driverA, tokenA;
  let driverUserB, driverB, tokenB;
  let adminUser, adminToken;
  const testSuffix = Date.now();

  beforeAll(async () => {
    await connectTestDB();

    // 1. Create Admin
    adminUser = await User.create({
      name: 'Super Admin IFSC Test',
      email: `admin-ifsc-${testSuffix}@transportplatform.com`,
      phone: `980${String(testSuffix).slice(-7)}`,
      password: 'AdminPassword123!',
      role: 'admin',
      status: 'Active'
    });
    adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, jwtConfig.secret, { expiresIn: '1h' });

    // 2. Create Driver A (with starting balance)
    driverUserA = await User.create({
      name: 'Amit Driver A',
      email: `driver-a-${testSuffix}@transportplatform.com`,
      phone: `981${String(testSuffix).slice(-7)}`,
      password: 'Password123!',
      role: 'driver',
      status: 'Active'
    });
    tokenA = jwt.sign({ id: driverUserA._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    driverA = await Driver.create({
      user: driverUserA._id,
      name: 'Amit Driver A',
      phone: driverUserA.phone,
      mobileNumber: driverUserA.phone,
      drivingLicenceNumber: `DL-A-${testSuffix}`,
      drivingLicenceStatus: 'Approved',
      walletBalance: 20000,
      totalEarnings: 25000,
      payoutMethods: {
        bankName: 'State Bank of India',
        accountNumber: '112233445566',
        accountHolderName: 'Amit Driver A',
        branch: 'Connaught Place',
        ifscCode: 'SBIN0001234'
      }
    });

    // 3. Create Driver B (isolated driver with different bank)
    driverUserB = await User.create({
      name: 'Binod Driver B',
      email: `driver-b-${testSuffix}@transportplatform.com`,
      phone: `982${String(testSuffix).slice(-7)}`,
      password: 'Password123!',
      role: 'driver',
      status: 'Active'
    });
    tokenB = jwt.sign({ id: driverUserB._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    driverB = await Driver.create({
      user: driverUserB._id,
      name: 'Binod Driver B',
      phone: driverUserB.phone,
      mobileNumber: driverUserB.phone,
      drivingLicenceNumber: `DL-B-${testSuffix}`,
      drivingLicenceStatus: 'Approved',
      walletBalance: 15000,
      totalEarnings: 18000,
      payoutMethods: {
        bankName: 'HDFC Bank',
        accountNumber: '998877665544',
        accountHolderName: 'Binod Driver B',
        branch: 'Indiranagar',
        ifscCode: 'HDFC0005678'
      }
    });
  });

  afterAll(async () => {
    try {
      if (driverA) await Withdrawal.deleteMany({ driver: driverA._id });
      if (driverB) await Withdrawal.deleteMany({ driver: driverB._id });
      if (driverA) await Driver.deleteOne({ _id: driverA._id });
      if (driverB) await Driver.deleteOne({ _id: driverB._id });
      if (driverUserA) await User.deleteOne({ _id: driverUserA._id });
      if (driverUserB) await User.deleteOne({ _id: driverUserB._id });
      if (adminUser) await User.deleteOne({ _id: adminUser._id });
    } finally {
      await closeTestDB();
    }
  });

  // TEST 1: Driver submits a bank withdrawal with an explicit IFSC code
  let withdrawalWithIfscId;
  test('1. Driver submits a bank withdrawal with an IFSC code and receives success', async () => {
    const res = await request(app)
      .post('/api/driver/withdraw')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 2500,
        payoutMethod: 'Bank',
        payoutDetails: {
          accountNumber: '112233445566',
          accountHolderName: 'Amit Driver A',
          bankName: 'State Bank of India',
          ifscCode: 'SBIN0001234',
          branch: 'Connaught Place'
        }
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.payoutDetails.ifscCode).toBe('SBIN0001234');
    expect(res.body.data.payoutDetails.branch).toBe('Connaught Place');
    withdrawalWithIfscId = res.body.data._id;
  });

  // TEST 2: The backend persists the exact submitted IFSC
  test('2. The backend persists the exact submitted IFSC into Withdrawal record', async () => {
    const savedDoc = await Withdrawal.findById(withdrawalWithIfscId).lean();
    expect(savedDoc).toBeDefined();
    expect(savedDoc.payoutDetails.ifscCode).toBe('SBIN0001234');
    expect(savedDoc.payoutDetails.accountNumber).toBe('112233445566');
    expect(savedDoc.payoutDetails.bankName).toBe('State Bank of India');
  });

  // TEST 3: The saved IFSC survives a database read and remains normalized
  test('3. The saved IFSC survives a fresh database read without truncation or masking', async () => {
    const freshDoc = await Withdrawal.findById(withdrawalWithIfscId);
    expect(freshDoc.payoutDetails.ifscCode).toBe('SBIN0001234');
    expect(freshDoc.payoutDetails.ifscCode.length).toBe(11);
  });

  // TEST 4: The admin withdrawal details API returns the correct IFSC
  test('4. Admin withdrawal details API returns the saved IFSC in full with valid format flag', async () => {
    const res = await request(app)
      .get(`/api/admin/withdrawals/${withdrawalWithIfscId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { bankAndPayout } = res.body.data;
    expect(bankAndPayout.ifscCode).toBe('SBIN0001234');
    expect(bankAndPayout.ifscDisplay).toBe('SBIN0001234');
    expect(bankAndPayout.isIfscProvided).toBe(true);
    expect(bankAndPayout.isValidIfscFormat).toBe(true);
    expect(bankAndPayout.bankName).toBe('State Bank of India');
    expect(bankAndPayout.maskedAccountNumber).toBe('••••••••5566');
  });

  // TEST 5: The Admin Panel list API returns the saved IFSC instead of 'IFSC not provided'
  test('5. Admin withdrawal list API provides the saved IFSC in payoutDetails', async () => {
    const res = await request(app)
      .get('/api/admin/withdrawals')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const item = res.body.data.find(w => String(w._id) === String(withdrawalWithIfscId));
    expect(item).toBeDefined();
    expect(item.payoutDetails.ifscCode).toBe('SBIN0001234');
  });

  // TEST 6: Missing IFSC generates the expected explicit warning and 'IFSC not provided' display
  test('6. Missing IFSC in raw withdrawal and driver profile is handled with explicit warning', async () => {
    // Create an explicit withdrawal record without IFSC
    const noIfscWithdrawal = await Withdrawal.create({
      driver: driverA._id,
      user: driverUserA._id,
      amount: 1200,
      payoutMethod: 'Bank',
      payoutDetails: {
        bankName: 'Random Rural Bank',
        accountNumber: '999988887777',
        accountHolderName: 'Amit Driver A',
        branch: 'Village Center',
        ifscCode: ''
      },
      status: 'Pending'
    });

    const res = await request(app)
      .get(`/api/admin/withdrawals/${noIfscWithdrawal._id}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { bankAndPayout, warnings } = res.body.data;
    expect(bankAndPayout.ifscCode).toBe('');
    expect(bankAndPayout.ifscDisplay).toBe('IFSC not provided');
    expect(bankAndPayout.isIfscProvided).toBe(false);
    expect(warnings.some(w => w.includes('IFSC code is not provided'))).toBe(true);
  });

  // TEST 7: Branch name and IFSC are not accidentally mixed
  test('7. Branch name and IFSC are stored separately; legacy branch IFSC is gracefully extracted', async () => {
    // Submitting separate branch and IFSC
    const separateRes = await request(app)
      .post('/api/driver/withdraw')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        amount: 1500,
        payoutMethod: 'Bank',
        payoutDetails: {
          accountNumber: '998877665544',
          accountHolderName: 'Binod Driver B',
          bankName: 'HDFC Bank',
          ifscCode: 'HDFC0005678',
          branch: 'Indiranagar 100ft Road'
        }
      });

    expect(separateRes.status).toBe(200);
    expect(separateRes.body.data.payoutDetails.ifscCode).toBe('HDFC0005678');
    expect(separateRes.body.data.payoutDetails.branch).toBe('Indiranagar 100ft Road');

    // Legacy submission where driver app passed IFSC in 'branch' field:
    const legacyRes = await request(app)
      .post('/api/driver/withdraw')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        amount: 1000,
        payoutMethod: 'Bank',
        payoutDetails: {
          accountNumber: '998877665544',
          accountHolderName: 'Binod Driver B',
          bankName: 'HDFC Bank',
          branch: 'HDFC0005678' // Sent inside branch!
        }
      });

    expect(legacyRes.status).toBe(200);
    expect(legacyRes.body.data.payoutDetails.ifscCode).toBe('HDFC0005678');
  });

  // TEST 8: eSewa and Khalti requests continue working without bank or IFSC interference
  test('8. eSewa and Khalti withdrawal requests succeed without IFSC requirement', async () => {
    const esewaRes = await request(app)
      .post('/api/driver/withdraw')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 800,
        payoutMethod: 'eSewa',
        payoutDetails: {
          esewaId: '9812345678',
          accountHolderName: 'Amit Driver A'
        }
      });

    expect(esewaRes.status).toBe(200);
    expect(esewaRes.body.data.payoutMethod).toBe('eSewa');
    expect(esewaRes.body.data.payoutDetails.esewaId).toBe('9812345678');

    // Verification details for eSewa
    const verifyEsewa = await request(app)
      .get(`/api/admin/withdrawals/${esewaRes.body.data._id}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(verifyEsewa.status).toBe(200);
    expect(verifyEsewa.body.data.bankAndPayout.payoutMethod).toBe('eSewa');
    expect(verifyEsewa.body.data.bankAndPayout.esewaId).toBe('9812345678');
    expect(verifyEsewa.body.data.bankAndPayout.ifscCode).toBeUndefined();
  });

  // TEST 9: One driver's bank details never appear in another driver's withdrawal
  test('9. Strict isolation: Driver A bank details never leak into Driver B withdrawal', async () => {
    // Driver B submits withdrawal with own bank details
    const resB = await request(app)
      .post('/api/driver/withdraw')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        amount: 1200,
        payoutMethod: 'Bank',
        payoutDetails: {
          accountNumber: '998877665544',
          accountHolderName: 'Binod Driver B',
          bankName: 'HDFC Bank',
          ifscCode: 'HDFC0005678'
        }
      });

    expect(resB.status).toBe(200);
    const withdrawalBId = resB.body.data._id;

    const verifyB = await request(app)
      .get(`/api/admin/withdrawals/${withdrawalBId}/verification-details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(verifyB.status).toBe(200);
    const { bankAndPayout, driver: fetchedDriver } = verifyB.body.data;
    expect(fetchedDriver._id.toString()).toBe(driverB._id.toString());
    expect(bankAndPayout.bankName).toBe('HDFC Bank');
    expect(bankAndPayout.ifscCode).toBe('HDFC0005678');
    expect(bankAndPayout.maskedAccountNumber).toBe('••••••••5544');

    // Must NOT contain any data from Driver A
    expect(bankAndPayout.bankName).not.toBe('State Bank of India');
    expect(bankAndPayout.ifscCode).not.toBe('SBIN0001234');
    expect(bankAndPayout.accountHolderName).not.toBe('Amit Driver A');
  });

  // TEST 10: Persisted bank details update driver payoutMethods profile for prefill
  test('10. Driver payout profile is updated with the submitted IFSC for subsequent auto-prefill', async () => {
    const updatedDriverA = await Driver.findById(driverA._id).lean();
    expect(updatedDriverA.payoutMethods).toBeDefined();
    expect(updatedDriverA.payoutMethods.ifscCode).toBe('SBIN0001234');
    expect(updatedDriverA.payoutMethods.bankName).toBe('State Bank of India');
  });
});
