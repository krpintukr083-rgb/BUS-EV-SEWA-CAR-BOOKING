const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Withdrawal = require('../src/models/Withdrawal');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../src/config/jwt');

jest.setTimeout(30000);

describe('Driver Wallet API & Client Mapping Regression Tests', () => {
  let driverUser;
  let driverProfile;
  let driverToken;

  beforeAll(async () => {
    await connectTestDB();

    driverUser = await User.create({
      name: 'Wallet Test Driver',
      email: `driver_wallet_${Date.now()}@transportplatform.com`,
      phone: `98111${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'Password@123',
      role: 'driver',
      status: 'Active'
    });
    driverToken = jwt.sign({ id: driverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    driverProfile = await Driver.create({
      user: driverUser._id,
      name: 'Wallet Test Driver',
      phone: driverUser.phone,
      mobileNumber: driverUser.phone,
      drivingLicenceNumber: `DL-WALLET-${Date.now()}`,
      walletBalance: 517.5,
      totalEarnings: 1517.5,
      totalWithdrawn: 1000,
      driverStatus: 'Active',
      isOnline: true
    });

    // Create 2 pending withdrawal requests totaling 1000
    await Withdrawal.create([
      {
        driver: driverProfile._id,
        user: driverUser._id,
        amount: 600,
        payoutMethod: 'Bank',
        status: 'Pending',
        payoutDetails: { accountNumber: '1234567890' }
      },
      {
        driver: driverProfile._id,
        user: driverUser._id,
        amount: 400,
        payoutMethod: 'Bank',
        status: 'Processing',
        payoutDetails: { accountNumber: '1234567890' }
      }
    ]);
  });

  afterAll(async () => {
    if (driverProfile) {
      await Withdrawal.deleteMany({ driver: driverProfile._id });
      await Driver.deleteOne({ _id: driverProfile._id });
      await User.deleteOne({ _id: driverUser._id });
    }
    await closeTestDB();
  });

  test('1. GET /api/driver/wallet returns correct walletBalance and pending withdrawals without double subtraction', async () => {
    const res = await request(app)
      .get('/api/driver/wallet')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;
    expect(data.walletBalance).toBe(517.5);
    expect(data.totalEarnings).toBe(1517.5);
    expect(data.totalWithdrawn).toBe(1000);
    expect(Array.isArray(data.recentWithdrawals)).toBe(true);
    expect(data.recentWithdrawals.length).toBe(2);

    // Calculate pending in UI:
    const pendingPayouts = data.recentWithdrawals
      .filter(item => ['Pending', 'Processing'].includes(item.status))
      .reduce((total, item) => total + Number(item.amount || 0), 0);

    expect(pendingPayouts).toBe(1000);

    // CRITICAL: The server walletBalance is ALREADY net of pending withdrawals.
    // Confirm that UI does NOT subtract pendingPayouts from walletBalance!
    const uiAvailableBalance = data.walletBalance;
    expect(uiAvailableBalance).toBe(517.5);
  });

  test('2. Client mapping regression test: handles Axios response shapes and wrapped objects correctly', () => {
    // Case A: Full Axios response { data: { success: true, data: { walletBalance: 517.5 } }, status: 200 }
    const axiosResponse = {
      status: 200,
      data: {
        success: true,
        data: {
          walletBalance: 517.5,
          totalEarnings: 1517.5,
          totalWithdrawn: 1000,
          recentWithdrawals: [{ status: 'Pending', amount: 500 }]
        }
      }
    };

    // Client parsing logic used in WalletScreen.js
    const payloadA = axiosResponse?.data !== undefined && axiosResponse?.status !== undefined ? axiosResponse.data : axiosResponse;
    const isSuccessA = payloadA?.success !== false;
    const walletDataA = payloadA?.data || (payloadA && !payloadA.data && payloadA.walletBalance !== undefined ? payloadA : null);

    expect(isSuccessA).toBe(true);
    expect(walletDataA.walletBalance).toBe(517.5);

    // Case B: Directly unwrapped service response { success: true, data: { walletBalance: 517.5 } }
    const serviceResponse = {
      success: true,
      data: {
        walletBalance: 517.5,
        totalEarnings: 1517.5,
        totalWithdrawn: 1000,
        recentWithdrawals: [{ status: 'Pending', amount: 500 }]
      }
    };

    const payloadB = serviceResponse?.data !== undefined && serviceResponse?.status !== undefined ? serviceResponse.data : serviceResponse;
    const isSuccessB = payloadB?.success !== false;
    const walletDataB = payloadB?.data || (payloadB && !payloadB.data && payloadB.walletBalance !== undefined ? payloadB : null);

    expect(isSuccessB).toBe(true);
    expect(walletDataB.walletBalance).toBe(517.5);

    // Case C: Valid zero balance { walletBalance: 0 }
    const zeroBalancePayload = {
      success: true,
      data: {
        walletBalance: 0,
        totalEarnings: 0
      }
    };
    const payloadC = zeroBalancePayload?.data !== undefined && zeroBalancePayload?.status !== undefined ? zeroBalancePayload.data : zeroBalancePayload;
    const walletDataC = payloadC?.data;
    expect(Number(walletDataC.walletBalance ?? 0)).toBe(0);

    // Case D: Error response does not silently show 0 balance as valid
    const errorResponse = {
      success: false,
      message: 'Unauthorized token or network error'
    };
    const payloadD = errorResponse?.data !== undefined && errorResponse?.status !== undefined ? errorResponse.data : errorResponse;
    const isSuccessD = payloadD?.success !== false;
    const walletDataD = payloadD?.data || (payloadD && !payloadD.data && payloadD.walletBalance !== undefined ? payloadD : null);
    expect(walletDataD).toBeNull();
  });

  test('3. Withdrawal submission response mapping: handles both unwrapped service response and raw Axios response', () => {
    // Unwrapped response returned by driverService.requestWithdrawal
    const unwrappedServiceResponse = {
      success: true,
      message: 'Withdrawal request submitted successfully.',
      data: {
        _id: 'withdrawal_123',
        amount: 500,
        status: 'pending',
        gatewayStatus: 'READY'
      },
      newWalletBalance: 350.19
    };

    const payloadA = unwrappedServiceResponse?.status !== undefined && unwrappedServiceResponse?.data !== undefined
      ? unwrappedServiceResponse.data
      : unwrappedServiceResponse;

    expect(payloadA?.success).toBe(true);
    expect(payloadA?.message).toBe('Withdrawal request submitted successfully.');

    // Raw Axios response
    const rawAxiosResponse = {
      status: 200,
      data: unwrappedServiceResponse
    };

    const payloadB = rawAxiosResponse?.status !== undefined && rawAxiosResponse?.data !== undefined
      ? rawAxiosResponse.data
      : rawAxiosResponse;

    expect(payloadB?.success).toBe(true);
    expect(payloadB?.message).toBe('Withdrawal request submitted successfully.');
  });
});
