const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Schedule = require('../src/models/Schedule');
const Notification = require('../src/models/Notification');
const { connectTestDB, closeTestDB } = require('./setup');
const jwtConfig = require('../src/config/jwt');

describe('Driver vehicle and schedule approval workflow', () => {
  let user, driver, token, admin, adminToken, vehicleId;
  beforeAll(async () => {
    await connectTestDB();
    const suffix = Date.now();
    user = await User.create({ name: 'Workflow Driver', email: `workflow-${suffix}@example.com`, phone: `980${String(suffix).slice(-7)}`, password: 'Password123!', role: 'driver', status: 'Active' });
    driver = await Driver.create({ user: user._id, name: user.name, mobileNumber: user.phone, drivingLicenceNumber: `DL-${suffix}` });
    token = jwt.sign({ id: user._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    admin = await User.create({ name: 'Workflow Admin', email: `workflow-admin-${suffix}@example.com`, phone: `981${String(suffix).slice(-7)}`, password: 'Password123!', role: 'admin', status: 'Active' });
    adminToken = jwt.sign({ id: admin._id, role: 'admin' }, jwtConfig.secret, { expiresIn: '1h' });
  });
  afterAll(async () => {
    await Schedule.deleteMany({ driver: driver._id });
    await Vehicle.deleteMany({ 'submission.submittedByDriver': driver._id });
    await Driver.findByIdAndDelete(driver._id);
    await User.findByIdAndDelete(user._id);
    await User.findByIdAndDelete(admin._id);
    await closeTestDB();
  });
  test('new driver vehicles are always pending', async () => {
    const response = await request(app).post('/api/driver/vehicles').set('Authorization', `Bearer ${token}`).send({
      vehicleNumber: `WF-${Date.now()}`, vehicleType: 'Bus', vehicleStatus: 'Active'
    });
    expect(response.status).toBe(201);
    expect(response.body.data.vehicleStatus).toBe('Pending');
    vehicleId = response.body.data._id;
    expect(response.body.data.submission.submittedByDriver).toBe(String(driver._id));
    const adminNotice = await Notification.findOne({ eventType: 'VEHICLE_SUBMITTED', entityId: vehicleId });
    expect(adminNotice.recipientRole).toBe('admin');
  });

  test('EV registration persists per-vehicle battery percentage and estimated range', async () => {
    const vehicleNumber = `WF-EV-${Date.now()}`;
    const response = await request(app)
      .post('/api/driver/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleNumber,
        vehicleType: 'EV-Sewa',
        evDetails: { batteryPercentage: 78, rangeKm: 185 }
      });

    expect(response.status).toBe(201);
    expect(response.body.data.evDetails.batteryPercentage).toBe(78);
    expect(response.body.data.evDetails.rangeKm).toBe(185);
    expect(response.body.data.vehicleStatus).toBe('Pending');
    const evId = response.body.data._id;

    const updated = await request(app)
      .put(`/api/driver/vehicles/${evId}/ev-details`)
      .set('Authorization', `Bearer ${token}`)
      .send({ batteryPercentage: 64, estimatedRangeKm: 172 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.evDetails.batteryPercentage).toBe(64);
    expect(updated.body.data.evDetails.rangeKm).toBe(172);

    const reopenedVehicle = await request(app)
      .get('/api/driver/vehicle')
      .query({ vehicleId: evId })
      .set('Authorization', `Bearer ${token}`);
    expect(reopenedVehicle.status).toBe(200);
    expect(reopenedVehicle.body.data.evDetails.batteryPercentage).toBe(64);
    expect(reopenedVehicle.body.data.evDetails.rangeKm).toBe(172);

    const zeroCharge = await request(app)
      .put(`/api/driver/vehicles/${evId}/ev-details`)
      .set('Authorization', `Bearer ${token}`)
      .send({ batteryPercentage: 0, estimatedRangeKm: 1 });
    expect(zeroCharge.status).toBe(200);
    expect(zeroCharge.body.data.evDetails.batteryPercentage).toBe(0);

    const fullCharge = await request(app)
      .put(`/api/driver/vehicles/${evId}/ev-details`)
      .set('Authorization', `Bearer ${token}`)
      .send({ batteryPercentage: 100, estimatedRangeKm: 185 });
    expect(fullCharge.status).toBe(200);
    expect(fullCharge.body.data.evDetails.batteryPercentage).toBe(100);
    expect(fullCharge.body.data.evDetails.rangeKm).toBe(185);

    const invalidUpdate = await request(app)
      .put(`/api/driver/vehicles/${evId}/ev-details`)
      .set('Authorization', `Bearer ${token}`)
      .send({ batteryPercentage: 101, estimatedRangeKm: 172 });
    expect(invalidUpdate.status).toBe(400);
    const invalidRangeUpdate = await request(app)
      .put(`/api/driver/vehicles/${evId}/ev-details`)
      .set('Authorization', `Bearer ${token}`)
      .send({ batteryPercentage: 78, estimatedRangeKm: 0 });
    expect(invalidRangeUpdate.status).toBe(400);

    const suffix = Date.now();
    const otherUser = await User.create({
      name: 'Other EV Owner',
      email: `workflow-other-${suffix}@example.com`,
      phone: `982${String(suffix).slice(-7)}`,
      password: 'Password123!',
      role: 'driver',
      status: 'Active'
    });
    const otherDriver = await Driver.create({
      user: otherUser._id,
      name: otherUser.name,
      mobileNumber: otherUser.phone,
      drivingLicenceNumber: `DL-OTHER-${suffix}`
    });
    const otherToken = jwt.sign({ id: otherUser._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });
    try {
      const unauthorizedUpdate = await request(app)
        .put(`/api/driver/vehicles/${evId}/ev-details`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ batteryPercentage: 1, estimatedRangeKm: 1 });
      expect(unauthorizedUpdate.status).toBe(404);
      expect((await Vehicle.findById(evId)).evDetails.batteryPercentage).toBe(100);
    } finally {
      await Driver.findByIdAndDelete(otherDriver._id);
      await User.findByIdAndDelete(otherUser._id);
    }

    const invalidBattery = await request(app)
      .post('/api/driver/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleNumber: `${vehicleNumber}-INVALID`,
        vehicleType: 'EV-Sewa',
        evDetails: { batteryPercentage: 101, rangeKm: 185 }
      });
    expect(invalidBattery.status).toBe(400);

    const invalidRange = await request(app)
      .post('/api/driver/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicleNumber: `${vehicleNumber}-INVALID-RANGE`,
        vehicleType: 'EV-Sewa',
        evDetails: { batteryPercentage: 78, rangeKm: -1 }
      });
    expect(invalidRange.status).toBe(400);
  });

  test('admin approval enables schedule submission and customer visibility', async () => {
    const approvedVehicle = await request(app).patch(`/api/admin/vehicles/${vehicleId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`).send();
    expect(approvedVehicle.status).toBe(200);
    expect(approvedVehicle.body.data.vehicleStatus).toBe('Active');
    expect(String((await Driver.findById(driver._id)).assignedVehicle)).toBe(String(vehicleId));

    const scheduleResponse = await request(app).post('/api/driver/schedules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicle: vehicleId, origin: 'Delhi', destination: 'Jaipur',
        travelDate: '2030-01-01', departureTime: '08:00'
      });
    expect(scheduleResponse.status).toBe(201);
    const scheduleId = scheduleResponse.body.data._id;
    expect(scheduleResponse.body.data.status).toBe('Pending');
    expect((await Notification.findOne({ eventType: 'SCHEDULE_SUBMITTED', entityId: scheduleId })).recipientRole).toBe('admin');
    expect((await request(app).get('/api/admin/schedules?status=Pending').set('Authorization', `Bearer ${adminToken}`)).body.data.some(item => String(item._id) === String(scheduleId))).toBe(true);

    const approvedSchedule = await request(app).patch(`/api/admin/schedules/${scheduleId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`).send();
    expect(approvedSchedule.body.data.status).toBe('Active');
    expect((await Notification.findOne({ eventType: 'SCHEDULE_APPROVED', entityId: scheduleId })).recipientRole).toBe('driver');
    expect((await request(app).get('/api/admin/schedules?status=Active').set('Authorization', `Bearer ${adminToken}`)).body.data.some(item => String(item._id) === String(scheduleId))).toBe(true);

    const visible = await request(app).get('/api/schedules');
    expect(visible.status).toBe(200);
    expect(visible.body.data.some(item => String(item._id) === String(scheduleId) && item.vehicle.vehicleStatus === 'Active')).toBe(true);
  });

  test('admin rejection creates typed driver notification and hides schedule', async () => {
    const response = await request(app).post('/api/driver/schedules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vehicle: vehicleId, origin: 'Delhi', destination: 'Agra',
        travelDate: '2030-01-02', departureTime: '09:00'
      });
    const id = response.body.data._id;
    const rejected = await request(app).patch(`/api/admin/schedules/${id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`).send({ reason: 'Route not supported' });
    expect(rejected.body.data.status).toBe('Rejected');
    expect((await Notification.findOne({ eventType: 'SCHEDULE_REJECTED', entityId: id })).recipientRole).toBe('driver');
    const rejectedHistory = await request(app).get('/api/admin/schedules?status=Rejected').set('Authorization', `Bearer ${adminToken}`);
    expect(rejectedHistory.body.data.find(item => String(item._id) === String(id)).rejectionReason).toBe('Route not supported');
    expect((await request(app).get('/api/admin/schedules?status=Rejected').set('Authorization', `Bearer ${token}`)).status).toBe(403);
    const visible = await request(app).get('/api/schedules');
    expect(visible.body.data.some(item => String(item._id) === String(id))).toBe(false);
  });
});
