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
    let drvA = await User.findOne({ email: 'driver_alpha@test.com' });
    if (!drvA) {
      await User.deleteOne({ phone: '9899003344' });
      drvA = await User.create({
        name: 'Suresh Driver A',
        email: 'driver_alpha@test.com',
        phone: '9899003344',
        password: 'password123',
        role: 'driver',
        driverStatus: 'Available'
      });
    }
    driverAUser = drvA;

    const drvALogin = await request(app).post('/api/auth/login').send({
      identifier: 'driver_alpha@test.com',
      password: 'password123',
      role: 'driver'
    });
    driverAToken = drvALogin.body.token;

    // 3. Create Driver B User
    let drvB = await User.findOne({ email: 'driver_beta@test.com' });
    if (!drvB) {
      await User.deleteOne({ phone: '9899005566' });
      drvB = await User.create({
        name: 'Ramesh Driver B',
        email: 'driver_beta@test.com',
        phone: '9899005566',
        password: 'password123',
        role: 'driver',
        driverStatus: 'Available'
      });
    }
    driverBUser = drvB;

    const drvBLogin = await request(app).post('/api/auth/login').send({
      identifier: 'driver_beta@test.com',
      password: 'password123',
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
    await Notification.deleteMany({ user: customerUser._id });
  });

  // TEST 1: Bus Booking Creation -> Pending Driver Confirmation
  test('TEST 1: Customer creates bus booking -> bookingStatus = Pending Driver Confirmation (No confirmed ticket yet)', async () => {
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
          { name: 'Rahul Passenger', age: 28, gender: 'Male', seatNumber: 'L1' },
          { name: 'Pooja Passenger', age: 26, gender: 'Female', seatNumber: 'L2' }
        ],
        fare: 1000,
        paymentMethod: 'Offline Cash',
        travelDate: new Date().toISOString()
      });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.success).toBe(true);
    const createdBooking = bookingRes.body.data;

    // Assert status fields
    expect(createdBooking.bookingStatus).toBe('Pending Driver Confirmation');
    expect(createdBooking.driverConfirmationStatus).toBe('Pending');
    expect(createdBooking.driverConfirmed).toBe(false);
    expect(createdBooking.bookingId).toBeDefined();

    // Verify booking in database
    const dbBooking = await Booking.findById(createdBooking._id);
    expect(dbBooking.bookingStatus).toBe('Pending Driver Confirmation');
    expect(dbBooking.driverConfirmationStatus).toBe('Pending');
    expect(dbBooking.driverConfirmed).toBe(false);

    // Customer views booking details: bookingStatus is Pending Driver Confirmation
    const custView = await request(app)
      .get(`/api/bookings/${createdBooking._id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(custView.status).toBe(200);
    expect(custView.body.data.bookingStatus).toBe('Pending Driver Confirmation');
  });

  // TEST 2: Assigned Driver accepts booking request -> Confirmed & Ticket available
  test('TEST 2: Assigned Driver A confirms booking -> bookingStatus = Confirmed & Ticket generated', async () => {
    // 1. Create booking for Bus A
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: busA._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['L3'],
        passengerDetails: [{ name: 'Amit Verma', age: 30, gender: 'Male', seatNumber: 'L3' }],
        fare: 500,
        paymentMethod: 'Offline Cash',
        travelDate: new Date().toISOString()
      });

    const bookingId = bookingRes.body.data._id;
    const bookingCode = bookingRes.body.data.bookingId;

    // 2. Driver A fetches pending requests
    const driverReqs = await request(app)
      .get('/api/driver/requests')
      .set('Authorization', `Bearer ${driverAToken}`);

    expect(driverReqs.status).toBe(200);
    const hasBooking = driverReqs.body.data.some(r => r._id.toString() === bookingId.toString());
    expect(hasBooking).toBe(true);

    // 3. Driver A accepts the booking request
    const acceptRes = await request(app)
      .post(`/api/driver/requests/${bookingId}/accept`)
      .set('Authorization', `Bearer ${driverAToken}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.bookingStatus).toBe('Confirmed');
    expect(acceptRes.body.data.driverConfirmationStatus).toBe('Confirmed');
    expect(acceptRes.body.data.driverConfirmed).toBe(true);
    expect(acceptRes.body.data.driverConfirmedBy.toString()).toBe(driverADoc._id.toString());
    expect(acceptRes.body.data.driverConfirmedAt).toBeDefined();

    // 4. Customer views booking: now Confirmed
    const custView = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(custView.status).toBe(200);
    expect(custView.body.data.bookingStatus).toBe('Confirmed');
    expect(custView.body.data.driverConfirmationStatus).toBe('Confirmed');

    // 5. Check Customer Notification was created
    const notif = await Notification.findOne({
      recipientId: customerUser._id,
      message: new RegExp(bookingCode)
    });
    expect(notif).toBeDefined();
    expect(notif.title).toBe('Booking Confirmed!');
    expect(notif.message).toContain(bookingCode);
  });

  // TEST 3: Driver Isolation & Cross-Driver Security Barrier
  test('TEST 3: Driver Isolation & Cross-Driver Security Barrier (Driver B cannot see, confirm, reject, or collect cash for Bus A booking - HTTP 403 Forbidden)', async () => {
    // 1. Create booking on Bus A (assigned to Driver A)
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: busA._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['L5'],
        passengerDetails: [{ name: 'Deepak Test', age: 32, gender: 'Male', seatNumber: 'L5' }],
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

    // 5. Driver B tries to COLLECT CASH for Bus A's booking -> HTTP 403 Forbidden
    const unauthCash = await request(app)
      .post('/api/driver/collect-cash')
      .set('Authorization', `Bearer ${driverBToken}`)
      .send({ bookingId: busABookingId });

    expect(unauthCash.status).toBe(403);
    expect(unauthCash.body.success).toBe(false);
  });

  // TEST 4: Driver Rejection Flow
  test('TEST 4: Driver Rejection -> bookingStatus = Rejected & customer receives rejection notice (no ticket pass)', async () => {
    // 1. Customer creates booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: busA._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['L7'],
        passengerDetails: [{ name: 'Reject Test User', age: 24, gender: 'Female', seatNumber: 'L7' }],
        fare: 500,
        paymentMethod: 'Offline Cash',
        travelDate: new Date().toISOString()
      });

    const bookingId = bookingRes.body.data._id;
    const bookingCode = bookingRes.body.data.bookingId;

    // 2. Driver A rejects the booking
    const rejectRes = await request(app)
      .post(`/api/driver/requests/${bookingId}/reject`)
      .set('Authorization', `Bearer ${driverAToken}`);

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.success).toBe(true);
    expect(rejectRes.body.data.bookingStatus).toBe('Rejected');
    expect(rejectRes.body.data.driverConfirmationStatus).toBe('Rejected');
    expect(rejectRes.body.data.driverConfirmed).toBe(false);
    expect(rejectRes.body.data.rejectedBy.toString()).toBe(driverADoc._id.toString());
    expect(rejectRes.body.data.rejectedAt).toBeDefined();

    // 3. Customer views booking: status is Rejected
    const custView = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(custView.status).toBe(200);
    expect(custView.body.data.bookingStatus).toBe('Rejected');

    // 4. Notification sent to Customer
    const notif = await Notification.findOne({
      recipientId: customerUser._id,
      message: new RegExp(bookingCode)
    });
    expect(notif).toBeDefined();
    expect(notif.title).toBe('Booking Rejected');
    expect(notif.message).toContain(bookingCode);
  });

  // TEST 5: Offline Cash Complete Lifecycle (Separation of Confirmation & Cash Collection)
  test('TEST 5: Offline Cash Lifecycle -> Pending Confirmation -> Driver Confirms (Pending Cash) -> Driver Collects Cash (Paid) -> Duplicate collection blocked', async () => {
    // 1. Customer creates offline cash booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: busA._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['L9'],
        passengerDetails: [{ name: 'Cash User', age: 35, gender: 'Male', seatNumber: 'L9' }],
        fare: 500,
        paymentMethod: 'Offline Cash',
        travelDate: new Date().toISOString()
      });

    const bookingId = bookingRes.body.data._id;

    // Confirm initial state
    expect(bookingRes.body.data.bookingStatus).toBe('Pending Driver Confirmation');
    expect(bookingRes.body.data.paymentStatus).toBe('Pending Cash');
    expect(bookingRes.body.data.cashCollected).toBe(false);

    // 2. Driver A confirms booking -> Confirmation does NOT collect cash!
    const acceptRes = await request(app)
      .post(`/api/driver/requests/${bookingId}/accept`)
      .set('Authorization', `Bearer ${driverAToken}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.bookingStatus).toBe('Confirmed');
    expect(acceptRes.body.data.driverConfirmationStatus).toBe('Confirmed');
    expect(acceptRes.body.data.paymentStatus).toBe('Pending Cash');
    expect(acceptRes.body.data.cashCollected).toBe(false);

    // 3. Passenger boards and pays cash -> Driver A collects cash
    const collectRes = await request(app)
      .post('/api/driver/collect-cash')
      .set('Authorization', `Bearer ${driverAToken}`)
      .send({ bookingId });

    expect(collectRes.status).toBe(200);
    expect(collectRes.body.success).toBe(true);
    expect(collectRes.body.data.booking.paymentStatus).toBe('Paid');
    expect(collectRes.body.data.booking.cashCollected).toBe(true);
    expect(collectRes.body.data.booking.cashCollectedBy.toString()).toBe(driverADoc._id.toString());
    expect(collectRes.body.data.booking.cashCollectedAt).toBeDefined();

    // 4. Duplicate cash collection attempt -> Returns 400 Bad Request
    const duplicateCollect = await request(app)
      .post('/api/driver/collect-cash')
      .set('Authorization', `Bearer ${driverAToken}`)
      .send({ bookingId });

    expect(duplicateCollect.status).toBe(400);
    expect(duplicateCollect.body.success).toBe(false);
    expect(duplicateCollect.body.message).toMatch(/already collected/i);
  });

  // TEST 6: Online Payment Lifecycle with Driver Confirmation
  test('TEST 6: Online Payment Lifecycle -> Razorpay test payment successful -> Pending Driver Confirmation -> Driver Confirms -> Ticket Active', async () => {
    // 1. Customer creates online booking
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: busA._id,
        serviceType: 'Bus',
        pickupLocation: 'Delhi ISBT',
        dropLocation: 'Jaipur Sindhi Camp',
        selectedSeats: ['U1'],
        passengerDetails: [{ name: 'Online Razorpay User', age: 27, gender: 'Male', seatNumber: 'U1' }],
        fare: 500,
        paymentMethod: 'Online Payment (Razorpay)',
        travelDate: new Date().toISOString()
      });

    const bookingId = bookingRes.body.data._id;
    const bookingCode = bookingRes.body.data.bookingId;

    // 2. Customer performs Razorpay payment
    const payRes = await request(app)
      .post('/api/payments/test-success')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: bookingCode,
        paymentMethod: 'UPI'
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    // Payment is successful, but booking awaits driver confirmation!
    expect(payRes.body.data.payment.paymentStatus).toBe('Successful');
    expect(payRes.body.data.booking.bookingStatus).toBe('Pending Driver Confirmation');
    expect(payRes.body.data.booking.driverConfirmationStatus).toBe('Pending');

    // 3. Driver A confirms online booking
    const confirmRes = await request(app)
      .post(`/api/driver/requests/${bookingId}/accept`)
      .set('Authorization', `Bearer ${driverAToken}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.bookingStatus).toBe('Confirmed');
    expect(confirmRes.body.data.driverConfirmationStatus).toBe('Confirmed');
    expect(confirmRes.body.data.driverConfirmed).toBe(true);

    // 4. Booking details verification
    const finalBooking = await Booking.findById(bookingId);
    expect(finalBooking.bookingStatus).toBe('Confirmed');
    expect(finalBooking.paymentStatus).toBe('Successful');
    expect(finalBooking.driverConfirmationStatus).toBe('Confirmed');
  });
});
