const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Schedule = require('../src/models/Schedule');
const { connectTestDB, closeTestDB } = require('./setup');
const jwtConfig = require('../src/config/jwt');

describe('Schedule Time AM/PM Full Lifecycle Integration Tests', () => {
  let user, driver, driverToken, admin, adminToken, vehicle;

  beforeAll(async () => {
    await connectTestDB();
    const suffix = Date.now();
    user = await User.create({
      name: 'Time Test Driver',
      email: `time-driver-${suffix}@example.com`,
      phone: `980${String(suffix).slice(-7)}`,
      password: 'Password123!',
      role: 'driver',
      status: 'Active'
    });
    driver = await Driver.create({
      user: user._id,
      name: user.name,
      mobileNumber: user.phone,
      drivingLicenceNumber: `DL-TIME-${suffix}`
    });
    driverToken = jwt.sign({ id: user._id, role: 'driver' }, jwtConfig.secret, { expiresIn: '1h' });

    admin = await User.create({
      name: 'Time Test Admin',
      email: `time-admin-${suffix}@example.com`,
      phone: `981${String(suffix).slice(-7)}`,
      password: 'Password123!',
      role: 'admin',
      status: 'Active'
    });
    adminToken = jwt.sign({ id: admin._id, role: 'admin' }, jwtConfig.secret, { expiresIn: '1h' });

    vehicle = await Vehicle.create({
      vehicleNumber: `TIME-BUS-${suffix}`,
      vehicleType: 'Bus',
      vehicleName: 'Express Liner',
      vehicleModel: 'Volvo 9600',
      vehicleCategory: 'Commercial Passenger Fleet',
      ownerName: 'Transport Fleet Co',
      ownerMobileNumber: '9876543210',
      vehicleStatus: 'Active',
      assignedDriver: driver._id,
      fareRate: 500,
      route: {
        origin: 'Delhi',
        destination: 'Jaipur',
        departureTime: '06:00 AM',
        arrivalTime: '11:30 AM'
      }
    });
  });

  afterAll(async () => {
    if (driver) await Schedule.deleteMany({ driver: driver._id });
    if (vehicle) await Vehicle.findByIdAndDelete(vehicle._id);
    if (driver) await Driver.findByIdAndDelete(driver._id);
    if (user) await User.findByIdAndDelete(user._id);
    if (admin) await User.findByIdAndDelete(admin._id);
    await closeTestDB();
  });

  const testCases = [
    {
      label: 'Test 1: 06:00 AM → 11:30 AM',
      depInput: '06:00 AM',
      arrInput: '11:30 AM',
      expectedDep: '06:00 AM',
      expectedArr: '11:30 AM',
      travelDate: '2030-05-01'
    },
    {
      label: 'Test 2: 06:00 PM → 11:00 PM (Must NEVER become AM)',
      depInput: '06:00 PM',
      arrInput: '11:00 PM',
      expectedDep: '06:00 PM',
      expectedArr: '11:00 PM',
      travelDate: '2030-05-02'
    },
    {
      label: 'Test 3: 12:00 AM → 01:00 AM',
      depInput: '12:00 AM',
      arrInput: '01:00 AM',
      expectedDep: '12:00 AM',
      expectedArr: '01:00 AM',
      travelDate: '2030-05-03'
    },
    {
      label: 'Test 4: 12:00 PM → 01:00 PM',
      depInput: '12:00 PM',
      arrInput: '01:00 PM',
      expectedDep: '12:00 PM',
      expectedArr: '01:00 PM',
      travelDate: '2030-05-04'
    },
    {
      label: 'Test 5: 05:30 PM → 10:45 PM',
      depInput: '05:30 PM',
      arrInput: '10:45 PM',
      expectedDep: '05:30 PM',
      expectedArr: '10:45 PM',
      travelDate: '2030-05-05'
    }
  ];

  for (const tc of testCases) {
    test(tc.label, async () => {
      // 1. Driver creates schedule via API
      const createRes = await request(app)
        .post('/api/driver/schedules')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          vehicle: vehicle._id,
          origin: 'Delhi',
          destination: 'Jaipur',
          travelDate: tc.travelDate,
          departureTime: tc.depInput,
          arrivalTime: tc.arrInput,
          fareRate: 550
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.departureTime).toBe(tc.expectedDep);
      expect(createRes.body.data.arrivalTime).toBe(tc.expectedArr);
      const scheduleId = createRes.body.data._id;

      // 2. Direct MongoDB check
      const rawDbSchedule = await Schedule.findById(scheduleId).lean();
      expect(rawDbSchedule.departureTime).toBe(tc.expectedDep);
      expect(rawDbSchedule.arrivalTime).toBe(tc.expectedArr);

      // 3. Driver My Schedules API check
      const mySchedulesRes = await request(app)
        .get('/api/driver/schedules')
        .set('Authorization', `Bearer ${driverToken}`);
      expect(mySchedulesRes.status).toBe(200);
      const myScheduleItem = mySchedulesRes.body.data.find(s => String(s._id) === String(scheduleId));
      expect(myScheduleItem).toBeDefined();
      expect(myScheduleItem.departureTime).toBe(tc.expectedDep);
      expect(myScheduleItem.arrivalTime).toBe(tc.expectedArr);

      // 4. Admin Schedule Approval listing check
      const adminSchedulesRes = await request(app)
        .get('/api/admin/schedules?status=Pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminSchedulesRes.status).toBe(200);
      const pendingItem = adminSchedulesRes.body.data.find(s => String(s._id) === String(scheduleId));
      expect(pendingItem).toBeDefined();
      expect(pendingItem.departureTime).toBe(tc.expectedDep);
      expect(pendingItem.arrivalTime).toBe(tc.expectedArr);

      // 5. Admin Approves the Schedule
      const approveRes = await request(app)
        .patch(`/api/admin/schedules/${scheduleId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(approveRes.status).toBe(200);

      // 6. Verify Vehicle route timing in MongoDB is updated with the approved schedule
      const updatedVehicle = await Vehicle.findById(vehicle._id).lean();
      expect(updatedVehicle.route.departureTime).toBe(tc.expectedDep);
      expect(updatedVehicle.route.arrivalTime).toBe(tc.expectedArr);

      // 7. Verify Admin Bus Management (/api/admin/buses) shows the schedule time
      const adminBusesRes = await request(app)
        .get('/api/admin/buses')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminBusesRes.status).toBe(200);
      const adminBus = adminBusesRes.body.data.find(b => String(b._id) === String(vehicle._id));
      expect(adminBus).toBeDefined();
      expect(adminBus.route.departureTime).toBe(tc.expectedDep);
      expect(adminBus.route.arrivalTime).toBe(tc.expectedArr);

      // 8. Verify Customer Bus Listing (/api/customer/schedules) shows the schedule time
      const custSchedulesRes = await request(app)
        .get(`/api/customer/schedules?from=Delhi&to=Jaipur&travelDate=${tc.travelDate}`);
      expect(custSchedulesRes.status).toBe(200);
      const custSchedule = custSchedulesRes.body.data.find(s => String(s._id) === String(scheduleId));
      expect(custSchedule).toBeDefined();
      expect(custSchedule.departureTime).toBe(tc.expectedDep);
      expect(custSchedule.arrivalTime).toBe(tc.expectedArr);

      // 9. Verify Customer Bus Details (/api/customer/buses/:id) shows the schedule time
      const custBusDetailRes = await request(app)
        .get(`/api/customer/buses/${vehicle._id}`);
      expect(custBusDetailRes.status).toBe(200);
      expect(custBusDetailRes.body.data.route.departureTime).toBe(tc.expectedDep);
      expect(custBusDetailRes.body.data.route.arrivalTime).toBe(tc.expectedArr);
    });
  }
});
