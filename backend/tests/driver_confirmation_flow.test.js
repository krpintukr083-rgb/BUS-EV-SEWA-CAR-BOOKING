const request = require('supertest');
const app = require('../src/app');
const { connectTestDB, closeTestDB } = require('./setup');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Notification = require('../src/models/Notification');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('Driver / Conductor Bus Booking Confirmation Flow Suite', () => {
  let customerToken = '';
  let customerUser = null;
  let driverAToken = '';
  let driverAUser = null;
  let driverBToken = '';
  let driverBUser = null;
  let driverADoc = null;
  let driverBDoc = null;
  let busA = null;
  let busB = null;

  beforeAll(async () => {
    // 1. Create or retrieve Customer
    let cust = await User.findOne({ email: 'driver_flow_customer@test.com' });
    if (!cust) {
      await User.deleteOne({ phone: '9899001122' });
      cust = await User.create({
        name: 'Rahul Passenger',
        email: 'driver_flow_customer@test.com',
        phone: '9899001122',
        password: 'password123',
        role: 'customer'
      });
    }
    customerUser = cust;

    const custLogin = await request(app).post('/api/auth/login').send({
      identifier: 'driver_flow_customer@test.com',
      password: 'password123',
      role: 'customer'
    });
    customerToken = custLogin.body.token;

    // 2. Create Driver A User
    let drvA = await User.findOne({ email: 'driver_flow_alpha@test.com' });
    if (!drvA) {
      await User.deleteOne({ phone: '9899003344' });
      drvA = await User.create({
        name: 'Suresh Driver A',
        email: 'driver_flow_alpha@test.com',
        phone: '9899003344',
        password: 'driver123',
        role: 'driver',
        driverStatus: 'Available'
      });
    }
    driverAUser = drvA;

    const drvALogin = await request(app).post('/api/auth/login').send({
      identifier: 'driver_flow_alpha@test.com',
      password: 'driver123',
      role: 'driver'
    });
    driverAToken = drvALogin.body.token;

    // 3. Create Driver B User
    let drvB = await User.findOne({ email: 'driver_flow_beta@test.com' });
    if (!drvB) {
      await User.deleteOne({ phone: '9899005566' });
      drvB = await User.create({
        name: 'Ramesh Driver B',
        email: 'driver_flow_beta@test.com',
        phone: '9899005566',
        password: 'driver123',
        role: 'driver',
        driverStatus: 'Available'
      });
    }
    driverBUser = drvB;

    const drvBLogin = await request(app).post('/api/auth/login').send({
      identifier: 'driver_flow_beta@test.com',
      password: 'driver123',
      role: 'driver'
    });
    driverBToken = drvBLogin.body.token;

    // 4. Create Bus A assigned to Driver A
    let vA = await Vehicle.findOne({ vehicleNumber: 'DL01BUS001' });
    if (!vA) {
      vA = await Vehicle.create({
        vehicleName: 'Volvo Multi-Axle Express A',
        vehicleNumber: 'DL01BUS001',
        vehicleType: 'Bus',
        vehicleCategory: 'AC Sleeper 2+1',
        vehicleModel: 'Volvo 9600 Multi-Axle',
        ownerName: 'TravelEase Fleet Ltd',
        ownerMobileNumber: '9988776655',
        seatingCapacity: 40,
        fareRate: 500,
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        departureTime: '06:00 AM',
        arrivalTime: '11:30 AM',
        assignedDriver: driverAUser._id,
        vehicleStatus: 'Active',
        serviceType: 'Bus'
      });
    } else {
      vA.assignedDriver = driverAUser._id;
      await vA.save();
    }
    busA = vA;

    // 5. Create Bus B assigned to Driver B
    let vB = await Vehicle.findOne({ vehicleNumber: 'RJ14BUS002' });
    if (!vB) {
      vB = await Vehicle.create({
        vehicleName: 'Scania Luxury Express B',
        vehicleNumber: 'RJ14BUS002',
        vehicleType: 'Bus',
        vehicleCategory: 'AC Sleeper 2+1',
        vehicleModel: 'Scania Touring HD',
        ownerName: 'TravelEase Fleet Ltd',
        ownerMobileNumber: '9988776655',
        seatingCapacity: 40,
        fareRate: 600,
        pickupLocation: 'Jaipur Sindhi Camp',
        dropLocation: 'Agra Fort',
        departureTime: '07:00 AM',
        arrivalTime: '12:00 PM',
        assignedDriver: driverBUser._id,
        vehicleStatus: 'Active',
        serviceType: 'Bus'
      });
    } else {
      vB.assignedDriver = driverBUser._id;
      await vB.save();
    }
    busB = vB;

    // 6. Create Driver Profiles linked to Vehicles
    let dDocA = await Driver.findOne({ user: driverAUser._id });
    if (!dDocA) {
      dDocA = await Driver.create({
        user: driverAUser._id,
        name: driverAUser.name,
        mobileNumber: driverAUser.phone,
        drivingLicenceNumber: 'DL-01-2022-0001',
        assignedVehicle: busA._id,
        driverStatus: 'Active'
      });
    } else {
      dDocA.assignedVehicle = busA._id;
      await dDocA.save();
    }
    driverADoc = dDocA;

    let dDocB = await Driver.findOne({ user: driverBUser._id });
    if (!dDocB) {
      dDocB = await Driver.create({
        user: driverBUser._id,
        name: driverBUser.name,
        mobileNumber: driverBUser.phone,
        drivingLicenceNumber: 'RJ-14-2022-0002',
        assignedVehicle: busB._id,
        driverStatus: 'Active'
      });
    } else {
      dDocB.assignedVehicle = busB._id;
      await dDocB.save();
    }
    driverBDoc = dDocB;

    // Clean up any previous test bookings for these test vehicles
    await Booking.deleteMany({ vehicle: { $in: [busA._id, busB._id] } });
    await Payment.deleteMany({});
    await Notification.deleteMany({});
  });

  // TEST 1: ONLINE PAYMENT FLOW
  test('TEST 1: ONLINE PAYMENT -> Customer pays -> Payment = Paid, Driver = Pending, Booking = Pending Driver Confirmation -> Driver Confirms -> Booking = Confirmed, Ticket = Confirmed', async () => {
    // 1. Customer creates online booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: busA._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['L1', 'L2'],
        passengerDetails: [
          { name: 'Online User 1', age: 28, gender: 'Male', seatNumber: 'L1' },
          { name: 'Online User 2', age: 26, gender: 'Female', seatNumber: 'L2' }
        ],
        fare: 1000,
        paymentMethod: 'Online Payment (Razorpay)',
        travelDate: new Date().toISOString()
      });

    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data._id;
    const bookingCode = bookingRes.body.data.bookingId;

    // Initial state before online payment
    expect(bookingRes.body.data.paymentStatus).toBe('Pending');
    expect(bookingRes.body.data.driverConfirmationStatus).toBe('Pending');
    expect(bookingRes.body.data.bookingStatus).toBe('Pending');

    // 2. Online Payment completes and is verified on server
    const payRes = await request(app)
      .post('/api/payments/test-success')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: bookingCode,
        paymentMethod: 'UPI'
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);

    // After online payment: Payment = Paid, Driver = Pending, Booking = Pending Driver Confirmation
    const afterPayBooking = payRes.body.data.booking;
    expect(afterPayBooking.paymentStatus).toBe('Paid');
    expect(afterPayBooking.driverConfirmationStatus).toBe('Pending');
    expect(afterPayBooking.bookingStatus).toBe('Pending Driver Confirmation');
    expect(afterPayBooking.driverConfirmed).toBe(false);

    // Verify Ticket is NOT confirmed yet
    const ticketBefore = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(ticketBefore.body.data.bookingStatus).toBe('Pending Driver Confirmation');

    // 3. Driver A accepts/confirms the online booking
    const confirmRes = await request(app)
      .post(`/api/driver/requests/${bookingId}/accept`)
      .set('Authorization', `Bearer ${driverAToken}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    // After driver confirms: Payment = Paid, Driver = Confirmed, Booking = Confirmed!
    expect(confirmRes.body.data.paymentStatus).toBe('Paid');
    expect(confirmRes.body.data.driverConfirmationStatus).toBe('Confirmed');
    expect(confirmRes.body.data.driverConfirmed).toBe(true);
    expect(confirmRes.body.data.bookingStatus).toBe('Confirmed');
    expect(confirmRes.body.data.driverConfirmedBy.toString()).toBe(driverADoc._id.toString());
    expect(confirmRes.body.data.driverConfirmedAt).toBeDefined();

    // 4. Customer views ticket: now CONFIRMED
    const ticketAfter = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(ticketAfter.status).toBe(200);
    expect(ticketAfter.body.data.bookingStatus).toBe('Confirmed');
    expect(ticketAfter.body.data.paymentStatus).toBe('Paid');
    expect(ticketAfter.body.data.driverConfirmationStatus).toBe('Confirmed');

    // 5. Check Customer Notification was created
    const notif = await Notification.findOne({
      recipientId: customerUser._id,
      message: new RegExp(bookingCode)
    });
    expect(notif).toBeDefined();
    expect(notif.title).toBe('Booking Confirmed!');
  });

  // TEST 2: OFFLINE CASH FLOW
  test('TEST 2: OFFLINE CASH -> Created (Pending Cash, Pending Driver) -> Driver Confirms (Pending Cash, Awaiting Cash Collection) -> Driver Collects Cash (Paid, Confirmed)', async () => {
    // 1. Customer creates offline cash booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: busA._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['L3'],
        passengerDetails: [{ name: 'Cash User', age: 35, gender: 'Male', seatNumber: 'L3' }],
        fare: 500,
        paymentMethod: 'Offline Cash',
        travelDate: new Date().toISOString()
      });

    expect(bookingRes.status).toBe(201);
    const bookingId = bookingRes.body.data._id;
    const bookingCode = bookingRes.body.data.bookingId;

    // Initial state: Payment = Pending Cash, Driver = Pending, Booking = Pending Driver Confirmation
    expect(bookingRes.body.data.paymentMethod).toBe('Offline Cash');
    expect(bookingRes.body.data.paymentStatus).toBe('Pending Cash');
    expect(bookingRes.body.data.driverConfirmationStatus).toBe('Pending');
    expect(bookingRes.body.data.bookingStatus).toBe('Pending Driver Confirmation');
    expect(bookingRes.body.data.cashCollected).toBe(false);

    // 2. Driver A confirms offline booking first
    const acceptRes = await request(app)
      .post(`/api/driver/requests/${bookingId}/accept`)
      .set('Authorization', `Bearer ${driverAToken}`);

    expect(acceptRes.status).toBe(200);
    // After driver confirms: Payment = Pending Cash, Driver = Confirmed, Booking = Awaiting Cash Collection (NOT Confirmed!)
    expect(acceptRes.body.data.paymentStatus).toBe('Pending Cash');
    expect(acceptRes.body.data.driverConfirmationStatus).toBe('Confirmed');
    expect(acceptRes.body.data.bookingStatus).toBe('Awaiting Cash Collection');
    expect(acceptRes.body.data.cashCollected).toBe(false);

    // Verify ticket is NOT final confirmed
    const ticketAwaiting = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(ticketAwaiting.body.data.bookingStatus).toBe('Awaiting Cash Collection');
    expect(ticketAwaiting.body.data.paymentStatus).toBe('Pending Cash');

    // 3. Passenger boards and pays cash -> Driver A collects cash
    const collectRes = await request(app)
      .post('/api/driver/collect-cash')
      .set('Authorization', `Bearer ${driverAToken}`)
      .send({ bookingId });

    expect(collectRes.status).toBe(200);
    expect(collectRes.body.success).toBe(true);
    // After cash collection: Payment = Paid, Driver = Confirmed, Booking = Confirmed!
    expect(collectRes.body.data.booking.paymentStatus).toBe('Paid');
    expect(collectRes.body.data.booking.cashCollected).toBe(true);
    expect(collectRes.body.data.booking.driverConfirmationStatus).toBe('Confirmed');
    expect(collectRes.body.data.booking.bookingStatus).toBe('Confirmed');
    expect(collectRes.body.data.booking.cashCollectedBy.toString()).toBe(driverADoc._id.toString());
    expect(collectRes.body.data.booking.cashCollectedAt).toBeDefined();

    // 4. Duplicate cash collection attempt is blocked
    const duplicateCollect = await request(app)
      .post('/api/driver/collect-cash')
      .set('Authorization', `Bearer ${driverAToken}`)
      .send({ bookingId });

    expect(duplicateCollect.status).toBe(400);
    expect(duplicateCollect.body.success).toBe(false);
    expect(duplicateCollect.body.message).toMatch(/already collected/i);

    // 5. Final ticket is now CONFIRMED
    const finalTicket = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(finalTicket.body.data.bookingStatus).toBe('Confirmed');
    expect(finalTicket.body.data.paymentStatus).toBe('Paid');
    expect(finalTicket.body.data.driverConfirmationStatus).toBe('Confirmed');
  });

  // TEST 3: DRIVER PENDING INVARIANT
  test('TEST 3: DRIVER PENDING -> Booking with Payment = Paid and Driver = Pending MUST NOT be Confirmed', async () => {
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: busA._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['L5'],
        passengerDetails: [{ name: 'Pending Driver User', age: 30, gender: 'Male', seatNumber: 'L5' }],
        fare: 500,
        paymentMethod: 'Online Payment (Razorpay)',
        travelDate: new Date().toISOString()
      });

    const bookingId = bookingRes.body.data._id;
    const bookingCode = bookingRes.body.data.bookingId;

    // Pay online
    await request(app)
      .post('/api/payments/test-success')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: bookingCode });

    const bookingInDb = await Booking.findById(bookingId);
    expect(bookingInDb.paymentStatus).toBe('Paid');
    expect(bookingInDb.driverConfirmationStatus).toBe('Pending');
    // Invariant: MUST NOT be Confirmed
    expect(bookingInDb.bookingStatus).toBe('Pending Driver Confirmation');
    expect(bookingInDb.bookingStatus).not.toBe('Confirmed');
  });

  // TEST 4: PAYMENT PENDING INVARIANT
  test('TEST 4: PAYMENT PENDING -> Booking with Driver = Confirmed and Payment = Pending Cash MUST NOT be Confirmed', async () => {
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: busA._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['L7'],
        passengerDetails: [{ name: 'Pending Cash User', age: 29, gender: 'Female', seatNumber: 'L7' }],
        fare: 500,
        paymentMethod: 'Offline Cash',
        travelDate: new Date().toISOString()
      });

    const bookingId = bookingRes.body.data._id;

    // Driver confirms booking before cash is collected
    await request(app)
      .post(`/api/driver/requests/${bookingId}/accept`)
      .set('Authorization', `Bearer ${driverAToken}`);

    const bookingInDb = await Booking.findById(bookingId);
    expect(bookingInDb.driverConfirmationStatus).toBe('Confirmed');
    expect(bookingInDb.paymentStatus).toBe('Pending Cash');
    // Invariant: MUST NOT be Confirmed
    expect(bookingInDb.bookingStatus).toBe('Awaiting Cash Collection');
    expect(bookingInDb.bookingStatus).not.toBe('Confirmed');
  });

  // TEST 5: BOTH REQUIRED INVARIANT
  test('TEST 5: BOTH REQUIRED -> Booking becomes Confirmed ONLY when Payment = Paid AND Driver = Confirmed', async () => {
    // 1. Create booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: busA._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['U3'],
        passengerDetails: [{ name: 'Dual Condition User', age: 31, gender: 'Male', seatNumber: 'U3' }],
        fare: 500,
        paymentMethod: 'Offline Cash',
        travelDate: new Date().toISOString()
      });

    const bookingId = bookingRes.body.data._id;

    // Neither satisfied -> Pending Driver Confirmation
    let check = await Booking.findById(bookingId);
    expect(check.bookingStatus).toBe('Pending Driver Confirmation');

    // Only Driver confirmed -> Awaiting Cash Collection (NOT Confirmed)
    await request(app)
      .post(`/api/driver/requests/${bookingId}/accept`)
      .set('Authorization', `Bearer ${driverAToken}`);

    check = await Booking.findById(bookingId);
    expect(check.driverConfirmationStatus).toBe('Confirmed');
    expect(check.paymentStatus).toBe('Pending Cash');
    expect(check.bookingStatus).toBe('Awaiting Cash Collection');
    expect(check.bookingStatus).not.toBe('Confirmed');

    // Now Cash collected -> BOTH satisfied -> CONFIRMED
    await request(app)
      .post('/api/driver/collect-cash')
      .set('Authorization', `Bearer ${driverAToken}`)
      .send({ bookingId });

    check = await Booking.findById(bookingId);
    expect(check.driverConfirmationStatus).toBe('Confirmed');
    expect(check.paymentStatus).toBe('Paid');
    expect(check.bookingStatus).toBe('Confirmed');
  });

  // TEST 6: DRIVER SECURITY BARRIER
  test('TEST 6: DRIVER SECURITY -> Driver B cannot see, confirm, reject, or collect cash for Driver A bus booking (HTTP 403 Forbidden)', async () => {
    // 1. Create booking on Bus A (assigned to Driver A)
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: busA._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['U5'],
        passengerDetails: [{ name: 'Security Check User', age: 32, gender: 'Male', seatNumber: 'U5' }],
        fare: 500,
        paymentMethod: 'Offline Cash',
        travelDate: new Date().toISOString()
      });

    const busABookingId = bookingRes.body.data._id;

    // 2. Driver B requests list: must NOT see Bus A's booking
    const driverBReqs = await request(app)
      .get('/api/driver/requests')
      .set('Authorization', `Bearer ${driverBToken}`);

    expect(driverBReqs.status).toBe(200);
    const driverBSeesBusA = driverBReqs.body.data.some(r => r._id.toString() === busABookingId.toString());
    expect(driverBSeesBusA).toBe(false);

    // 3. Driver B tries to ACCEPT Bus A's booking -> HTTP 403 Forbidden
    const unauthAccept = await request(app)
      .post(`/api/driver/requests/${busABookingId}/accept`)
      .set('Authorization', `Bearer ${driverBToken}`);

    expect(unauthAccept.status).toBe(403);
    expect(unauthAccept.body.success).toBe(false);
    expect(unauthAccept.body.message).toMatch(/not authorized/i);

    // 4. Driver B tries to REJECT Bus A's booking -> HTTP 403 Forbidden
    const unauthReject = await request(app)
      .post(`/api/driver/requests/${busABookingId}/reject`)
      .set('Authorization', `Bearer ${driverBToken}`);

    expect(unauthReject.status).toBe(403);
    expect(unauthReject.body.success).toBe(false);
    expect(unauthReject.body.message).toMatch(/not authorized/i);

    // 5. Driver B tries to COLLECT CASH for Bus A's booking -> HTTP 403 Forbidden
    const unauthCash = await request(app)
      .post('/api/driver/collect-cash')
      .set('Authorization', `Bearer ${driverBToken}`)
      .send({ bookingId: busABookingId });

    expect(unauthCash.status).toBe(403);
    expect(unauthCash.body.success).toBe(false);
    expect(unauthCash.body.message).toMatch(/not authorized/i);
  });
});
