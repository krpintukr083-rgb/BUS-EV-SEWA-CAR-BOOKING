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

    const approvedSchedule = await request(app).patch(`/api/admin/schedules/${scheduleId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`).send();
    expect(approvedSchedule.body.data.status).toBe('Active');
    expect((await Notification.findOne({ eventType: 'SCHEDULE_APPROVED', entityId: scheduleId })).recipientRole).toBe('driver');

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
    const visible = await request(app).get('/api/schedules');
    expect(visible.body.data.some(item => String(item._id) === String(id))).toBe(false);
  });
});
