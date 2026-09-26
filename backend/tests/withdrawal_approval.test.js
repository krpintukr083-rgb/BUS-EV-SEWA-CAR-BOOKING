const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Withdrawal = require('../src/models/Withdrawal');
const { connectTestDB, closeTestDB } = require('./setup');
const jwtConfig = require('../src/config/jwt');

describe('Driver withdrawal approval flow', () => {
  let driverUser;
  let otherDriverUser;
  let adminUser;
  let driver;
  let otherDriver;
  let driverToken;
  let otherDriverToken;
  let adminToken;
  let approvedWithdrawalId;
  let rejectedWithdrawalId;

  beforeAll(async () => {
    await connectTestDB();
    const suffix = Date.now();
    driverUser = await User.create({
      name: 'Withdrawal Driver',
      email: `withdrawal-driver-${suffix}@example.com`,
      phone: `982${String(suffix).slice(-7)}`,
      password: 'Password123!',
      role: 'driver',
      status: 'Active'
    });
    otherDriverUser = await User.create({
      name: 'Other Withdrawal Driver',
      email: `withdrawal-other-${suffix}@example.com`,
      phone: `983${String(suffix).slice(-7)}`,
      password: 'Password123!',
      role: 'driver',
      status: 'Active'
    });
    adminUser = await User.create({
      name: 'Withdrawal Admin',
      email: `withdrawal-admin-${suffix}@example.com`,
      phone: `984${String(suffix).slice(-7)}`,
      password: 'Password123!',
      role: 'admin',
      status: 'Active'
    });
    driver = await Driver.create({
      user: driverUser._id,
      name: driverUser.name,
      mobileNumber: driverUser.phone,
      drivingLicenceNumber: `DL-WITHDRAW-${suffix}`,
      walletBalance: 5000
    });
    otherDriver = await Driver.create({
      user: otherDriverUser._id,
      name: otherDriverUser.name,
      mobileNumber: otherDriverUser.phone,
      drivingLicenceNumber: `DL-WITHDRAW-OTHER-${suffix}`,
      walletBalance: 2000
    });
    driverToken = jwt.sign({ id: driverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    otherDriverToken = jwt.sign({ id: otherDriverUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, jwtConfig.secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    if (driver || otherDriver) {
      await Withdrawal.deleteMany({ driver: { $in: [driver?._id, otherDriver?._id].filter(Boolean) } });
    }
    if (driver) await Driver.findByIdAndDelete(driver._id);
    if (otherDriver) await Driver.findByIdAndDelete(otherDriver._id);
    if (driverUser) await User.findByIdAndDelete(driverUser._id);
    if (otherDriverUser) await User.findByIdAndDelete(otherDriverUser._id);
    if (adminUser) await User.findByIdAndDelete(adminUser._id);
    await closeTestDB();
  });

  const submitWithdrawal = (amount = 1000) => request(app)
    .post('/api/driver/withdraw')
    .set('Authorization', `Bearer ${driverToken}`)
    .send({
      amount,
      payoutMethod: 'Bank',
      payoutDetails: {
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        accountHolderName: 'Withdrawal Driver'
      }
    });

  test('keeps requests pending until admin action, approves, rejects with wallet restoration, and enforces ownership', async () => {
    const overBalanceRequest = await submitWithdrawal(5001);
    expect(overBalanceRequest.status).toBe(400);
    const emptyAmountRequest = await submitWithdrawal(0);
    expect(emptyAmountRequest.status).toBe(400);
    expect((await Driver.findById(driver._id)).walletBalance).toBe(5000);

    const firstRequest = await submitWithdrawal();
    expect(firstRequest.status).toBe(200);
    expect(firstRequest.body.message).toBe('Withdrawal request submitted successfully.');
    expect(firstRequest.body.data.status).toBe('pending');
    approvedWithdrawalId = firstRequest.body.data._id;
    expect((await Driver.findById(driver._id)).walletBalance).toBe(4000);

    const adminList = await request(app)
      .get('/api/admin/withdrawals')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminList.status).toBe(200);
    const listedRequest = adminList.body.data.find(item => item._id === approvedWithdrawalId);
    expect(listedRequest.driver.name).toBe('Withdrawal Driver');
    expect(listedRequest.driver.mobileNumber).toBe(driverUser.phone);
    expect(listedRequest.amount).toBe(1000);
    expect(listedRequest.driver.walletBalance).toBe(4000);

    const approved = await request(app)
      .patch(`/api/admin/withdrawals/${approvedWithdrawalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('Processing');

    const secondRequest = await submitWithdrawal();
    expect(secondRequest.status).toBe(200);
    rejectedWithdrawalId = secondRequest.body.data._id;
    expect(secondRequest.body.data.status).toBe('pending');
    expect((await Driver.findById(driver._id)).walletBalance).toBe(3000);

    const rejected = await request(app)
      .patch(`/api/admin/withdrawals/${rejectedWithdrawalId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Payout account details could not be verified' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.status).toBe('Rejected');
    expect(rejected.body.data.adminNotes).toBe('Payout account details could not be verified');
    const driverAfterReject = await Driver.findById(driver._id);
    expect(driverAfterReject.walletBalance).toBe(4000);
    expect(driverAfterReject.totalWithdrawn).toBe(1000);

    const ownWallet = await request(app)
      .get('/api/driver/wallet')
      .set('Authorization', `Bearer ${driverToken}`);
    const driverRequests = ownWallet.body.data.recentWithdrawals;
    expect(driverRequests.map(item => String(item._id))).toEqual(expect.arrayContaining([approvedWithdrawalId, rejectedWithdrawalId]));
    expect(driverRequests.find(item => String(item._id) === approvedWithdrawalId).status).toBe('Processing');
    expect(driverRequests.find(item => String(item._id) === rejectedWithdrawalId).status).toBe('Rejected');
    expect(driverRequests.find(item => String(item._id) === rejectedWithdrawalId).adminNotes)
      .toBe('Payout account details could not be verified');

    const otherWallet = await request(app)
      .get('/api/driver/wallet')
      .set('Authorization', `Bearer ${otherDriverToken}`);
    expect(otherWallet.status).toBe(200);
    expect(otherWallet.body.data.recentWithdrawals).toHaveLength(0);

    const driverCannotListAdminQueue = await request(app)
      .get('/api/admin/withdrawals')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(driverCannotListAdminQueue.status).toBe(403);

    const driverCannotReview = await request(app)
      .patch(`/api/admin/withdrawals/${rejectedWithdrawalId}/approve`)
      .set('Authorization', `Bearer ${driverToken}`);
    expect(driverCannotReview.status).toBe(403);

    const driverCannotChangeStatus = await request(app)
      .patch(`/api/driver/withdrawals/${approvedWithdrawalId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'Completed' });
    expect(driverCannotChangeStatus.status).toBe(404);

    const missingReason = await request(app)
      .patch(`/api/admin/withdrawals/${approvedWithdrawalId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '' });
    expect(missingReason.status).toBe(400);
  });
});
