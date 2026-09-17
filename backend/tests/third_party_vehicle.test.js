const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const Vehicle = require('../src/models/Vehicle');
const Driver = require('../src/models/Driver');
const Booking = require('../src/models/Booking');
const Expense = require('../src/models/Expense');
const User = require('../src/models/User');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('THIRD-PARTY & MARKET-HIRED VEHICLE LIFECYCLE (TRUCK HIRE FROM MARKET)', () => {
  let adminToken = '';
  let driverToken = '';
  let customerToken = '';
  let adminUserId = '';
  let driverId = '';
  let driverUserId = '';
  let customerUserId = '';

  let ownVehicleId = '';
  let thirdPartyVehicleId = '';
  let thirdPartyBookingId = '';
  let ownBookingId = '';

  const uniqueSuffix = Date.now().toString().slice(-5);

  // Setup: Authenticate Admin, Driver, and Customer
  test('Step 0: Setup and Auth for Admin, Driver, Customer', async () => {
    // Admin login
    const adminRes = await request(app).post('/api/auth/login').send({
      identifier: 'admin@platform.com',
      password: 'admin123',
      role: 'admin'
    });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.token).toBeDefined();
    adminToken = adminRes.body.token;
    adminUserId = adminRes.body.user.id || adminRes.body.user._id;

    // Customer login / register
    const custRes = await request(app).post('/api/auth/login').send({
      identifier: 'customer@test.com',
      password: 'password123',
      role: 'customer'
    });
    if (custRes.status === 200) {
      customerToken = custRes.body.token;
      customerUserId = custRes.body.user.id || custRes.body.user._id;
    } else {
      const custReg = await request(app).post('/api/auth/register').send({
        name: 'Market Test Customer',
        email: `cust${uniqueSuffix}@example.com`,
        phone: `+91981${uniqueSuffix}1`,
        password: 'password123',
        role: 'customer'
      });
      expect(custReg.status).toBe(201);
      customerToken = custReg.body.token;
      customerUserId = custReg.body.user.id || custReg.body.user._id;
    }

    // Driver login / fetch
    const driverRes = await request(app).post('/api/auth/login').send({
      identifier: 'driver@platform.com',
      password: 'driver123',
      role: 'driver'
    });
    expect(driverRes.status).toBe(200);
    driverToken = driverRes.body.token;
    driverUserId = driverRes.body.user.id || driverRes.body.user._id;

    driverId = driverRes.body.user.driverInfo?._id;
    if (!driverId) {
      const driverDoc = await Driver.findOne({ user: driverUserId }) || await Driver.findOne();
      expect(driverDoc).toBeDefined();
      driverId = driverDoc._id;
    }
    expect(driverId).toBeDefined();
  });

  // Step 1: Add own vehicle
  test('Step 1: Admin Adds Own / Company Vehicle', async () => {
    const ownVehiclePayload = {
      vehicleSource: 'OWN',
      vehicleNumber: `DL 01 OWN ${uniqueSuffix}`,
      vehicleType: 'Bus',
      vehicleCategory: 'AC Sleeper 2+1',
      vehicleModel: 'Volvo 9600 Multi-Axle',
      vehicleName: 'Company Royal Deluxe',
      seatingCapacity: 36,
      ownerName: 'Metro Transport Logistics Ltd',
      ownerMobileNumber: '+919811122334',
      fareRate: 850,
      vehicleStatus: 'Active',
      route: {
        origin: 'Delhi ISBT',
        destination: 'Jaipur Sindhi Camp',
        boardingPoints: ['Delhi ISBT', 'Dhaula Kuan'],
        droppingPoints: ['Jaipur Sindhi Camp']
      }
    };

    const res = await request(app)
      .post('/api/admin/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(ownVehiclePayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehicleSource).toBe('OWN');
    expect(res.body.data.vehicleNumber).toBe(`DL 01 OWN ${uniqueSuffix}`);

    ownVehicleId = res.body.data._id;
  });

  // Step 2: Add third-party vehicle (Truck Hire From Market ₹2,800)
  test('Step 2: Admin Adds Third-Party / Market-Hired Vehicle (e.g. Truck Hire ₹2,800)', async () => {
    const thirdPartyPayload = {
      vehicleSource: 'THIRD_PARTY',
      vehicleNumber: `HR 55 MKT ${uniqueSuffix}`,
      vehicleType: 'Truck',
      vehicleCategory: 'Heavy Haulage / Freight',
      vehicleModel: 'Tata Prima 3530.K',
      vehicleName: 'Market Hired 16-Ton Truck',
      seatingCapacity: 2,
      loadCapacity: '10 Tonnes (16 Tonnes GVW)',
      ownerName: 'Patel Roadways & Freight Carriers',
      ownerMobileNumber: '+919876012345',
      vendorDetails: {
        vendorName: 'Patel Roadways & Freight Carriers',
        vendorMobile: '+919876012345',
        vendorAddress: 'Transport Nagar, Delhi'
      },
      thirdPartyDriver: {
        driverName: 'Ramesh Singh',
        driverMobile: '+919876543210',
        driverLicenseNumber: 'DL-042020008891'
      },
      hireDetails: {
        hireAmount: 2800,
        additionalExpense: 200,
        paymentStatus: 'Pending',
        hireDate: new Date(),
        tripReference: `TRIP-MKT-${uniqueSuffix}`,
        pickup: 'Delhi Sanjay Gandhi Transport Nagar',
        destination: 'Jaipur Sitapura Industrial Area',
        notes: 'Truck hired from market for overflow consignment'
      },
      fareRate: 3500,
      vehicleStatus: 'Active',
      route: {
        origin: 'Delhi Sanjay Gandhi Transport Nagar',
        destination: 'Jaipur Sitapura Industrial Area'
      }
    };

    const res = await request(app)
      .post('/api/admin/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(thirdPartyPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehicleSource).toBe('THIRD_PARTY');
    expect(res.body.data.hireDetails.hireAmount).toBe(2800);
    expect(res.body.data.hireDetails.paymentStatus).toBe('Pending');
    expect(res.body.data.loadCapacity).toBe('10 Tonnes (16 Tonnes GVW)');

    thirdPartyVehicleId = res.body.data._id;
  });

  // Step 3: Assign driver to third-party vehicle
  test('Step 3: Admin Assigns Driver to Third-Party Vehicle', async () => {
    const res = await request(app)
      .post('/api/admin/driver-assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicleId: thirdPartyVehicleId,
        driverId: driverId
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify Vehicle reflects driver assignment
    const updatedVehicle = await Vehicle.findById(thirdPartyVehicleId);
    expect(updatedVehicle.assignedDriver.toString()).toBe(driverId.toString());

    // Verify Driver reflects assigned vehicle
    const updatedDriver = await Driver.findById(driverId);
    expect(updatedDriver.assignedVehicle.toString()).toBe(thirdPartyVehicleId.toString());
  });

  // Step 4: Assign third-party vehicle to trip / booking
  test('Step 4: Customer Creates Booking / Trip for Third-Party Vehicle', async () => {
    const bookingPayload = {
      vehicleId: thirdPartyVehicleId,
      serviceType: 'Car', // Service booking type
      pickupLocation: 'Delhi Sanjay Gandhi Transport Nagar',
      dropLocation: 'Jaipur Sitapura Industrial Area',
      fare: 3500,
      paymentMethod: 'Offline Cash'
    };

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(bookingPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehicleSource).toBe('THIRD_PARTY');
    expect(res.body.data.hiredVehicleDetails).toBeDefined();
    expect(res.body.data.hiredVehicleDetails.hireAmount).toBe(2800);
    expect(res.body.data.hiredVehicleDetails.vendorName).toBe('Patel Roadways & Freight Carriers');

    thirdPartyBookingId = res.body.data._id;
  });

  // Step 5: Verify ₹2,800 hire expense is recorded separately in Expense model
  test('Step 5: Verify Company Recorded ₹2,800 Market Hire Expense in Expense Ledger', async () => {
    const expense = await Expense.findOne({
      vehicle: thirdPartyVehicleId,
      expenseType: 'MARKET_VEHICLE_HIRE'
    });

    expect(expense).toBeDefined();
    expect(expense.hireAmount).toBe(2800);
    expect(expense.additionalExpense).toBe(200);
    expect(expense.totalAmount).toBe(3000); // 2800 + 200
    expect(expense.vendorName).toBe('Patel Roadways & Freight Carriers');
    expect(expense.paymentStatus).toBe('Pending');
  });

  // Step 6: Mark owner payment pending
  test('Step 6: Mark Owner Payment Status as Pending', async () => {
    const res = await request(app)
      .put(`/api/admin/vehicles/${thirdPartyVehicleId}/hire-payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentStatus: 'Pending',
        notes: 'Pending owner bill submission'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehicle.hireDetails.paymentStatus).toBe('Pending');

    // Expense ledger must also reflect Pending
    const exp = await Expense.findOne({ vehicle: thirdPartyVehicleId });
    expect(exp.paymentStatus).toBe('Pending');
  });

  // Step 7: Mark owner payment paid
  test('Step 7: Mark Owner Payment Status as Paid with Reference', async () => {
    const res = await request(app)
      .put(`/api/admin/vehicles/${thirdPartyVehicleId}/hire-payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentStatus: 'Paid',
        paidAmount: 3000,
        paymentReference: 'UPI-PATEL-88912803',
        paymentDate: new Date(),
        notes: 'Full payment of ₹3000 settled to Patel Roadways'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehicle.hireDetails.paymentStatus).toBe('Paid');
    expect(res.body.data.vehicle.hireDetails.paymentReference).toBe('UPI-PATEL-88912803');

    // Expense ledger must also reflect Paid
    const exp = await Expense.findOne({ vehicle: thirdPartyVehicleId });
    expect(exp.paymentStatus).toBe('Paid');
    expect(exp.paymentReference).toBe('UPI-PATEL-88912803');
  });

  // Step 8: Verify Admin reports and hire expenses API
  test('Step 8: Admin Reports & Hire Expenses Ledger Verification', async () => {
    // 8a: Verify /api/admin/hire-expenses endpoint
    const expRes = await request(app)
      .get('/api/admin/hire-expenses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(expRes.status).toBe(200);
    expect(expRes.body.success).toBe(true);
    expect(expRes.body.summary.totalHireExpense).toBeGreaterThanOrEqual(3000);
    expect(Array.isArray(expRes.body.vehicleBreakdown)).toBe(true);

    // 8b: Verify /api/admin/reports endpoint
    const reportsRes = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reportsRes.status).toBe(200);
    expect(reportsRes.body.success).toBe(true);
    expect(reportsRes.body.data.hireSummary).toBeDefined();
    expect(reportsRes.body.data.hireSummary.totalThirdPartyHireExpense).toBeGreaterThanOrEqual(3000);
    expect(reportsRes.body.data.hireSummary.thirdPartyVehicleTripsCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(reportsRes.body.data.hireExpenses)).toBe(true);

    // 8c: Verify /api/admin/dashboard metrics
    const dashRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(dashRes.status).toBe(200);
    expect(dashRes.body.success).toBe(true);
    expect(dashRes.body.data.counts.ownVehicles).toBeGreaterThanOrEqual(1);
    expect(dashRes.body.data.counts.thirdPartyVehicles).toBeGreaterThanOrEqual(1);
    expect(dashRes.body.data.counts.totalThirdPartyHireExpense).toBeGreaterThanOrEqual(3000);
  });

  // Step 9: Verify Driver sees assigned trip without internal hire costs leaked
  test('Step 9: Driver Panel Displays Assigned Trip (Security: Strips Hire Cost)', async () => {
    const res = await request(app)
      .get('/api/driver/booking-requests')
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const trip = res.body.data.find(b => b._id.toString() === thirdPartyBookingId.toString());
    expect(trip).toBeDefined();
    expect(trip.pickupLocation).toBe('Delhi Sanjay Gandhi Transport Nagar');
    expect(trip.fare).toBe(3500);

    // Crucial Security Verification: Driver cannot see internal hire costs or owner payout
    if (trip.hiredVehicleDetails) {
      expect(trip.hiredVehicleDetails.hireAmount).toBeUndefined();
      expect(trip.hiredVehicleDetails.additionalExpense).toBeUndefined();
      expect(trip.hiredVehicleDetails.hirePaymentStatus).toBeUndefined();
    }
  });

  // Step 10: Verify existing own-vehicle flow still works smoothly
  test('Step 10: Regression Verification - Own-Vehicle Flow Still Functions Fully', async () => {
    // 10a: Create booking on own vehicle
    const ownBookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: ownVehicleId,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['1A', '1B'],
        fare: 1700,
        paymentMethod: 'Offline Cash'
      });

    expect(ownBookingRes.status).toBe(201);
    expect(ownBookingRes.body.success).toBe(true);
    expect(ownBookingRes.body.data.vehicleSource).toBe('OWN');
    expect(ownBookingRes.body.data.busSeatNumbers).toEqual(['1A', '1B']);

    ownBookingId = ownBookingRes.body.data._id;

    // 10b: Fetch public vehicles - own vehicles continue to work
    const publicVehicles = await request(app).get('/api/vehicles?type=bus');
    expect(publicVehicles.status).toBe(200);
    expect(publicVehicles.body.data.length).toBeGreaterThan(0);

    // 10c: Admin filter by source=OWN and source=THIRD_PARTY
    const adminOwnVehicles = await request(app)
      .get('/api/admin/vehicles?source=OWN')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminOwnVehicles.status).toBe(200);
    adminOwnVehicles.body.data.forEach(v => {
      expect(v.vehicleSource || 'OWN').toBe('OWN');
    });

    const adminThirdPartyVehicles = await request(app)
      .get('/api/admin/vehicles?source=THIRD_PARTY')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminThirdPartyVehicles.status).toBe(200);
    adminThirdPartyVehicles.body.data.forEach(v => {
      expect(v.vehicleSource).toBe('THIRD_PARTY');
    });
  });
});
