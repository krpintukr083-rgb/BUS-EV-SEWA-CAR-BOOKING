const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Notification = require('../src/models/Notification');
const ServiceControl = require('../src/models/ServiceControl');
const { connectTestDB, closeTestDB } = require('./setup');
const jwtConfig = require('../src/config/jwt');

describe('EV-Sewa passenger-count booking', () => {
  let customer;
  let customerToken;
  let vehicle;
  let serviceControl;
  let originalEvSewaStatus;
  let createdServiceControl = false;

  beforeAll(async () => {
    await connectTestDB();
    const suffix = Date.now();
    customer = await User.create({
      name: 'EV Passenger Test',
      email: `ev-passengers-${suffix}@example.com`,
      phone: `989${String(suffix).slice(-7)}`,
      password: 'Password123!',
      role: 'customer',
      status: 'Active'
    });
    customerToken = jwt.sign({ id: customer._id, role: 'customer' }, jwtConfig.secret, { expiresIn: '1h' });
    vehicle = await Vehicle.create({
      vehicleNumber: `EV-CAP-${suffix}`,
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Electric Shuttle',
      vehicleModel: 'Passenger EV',
      vehicleName: 'Capacity Test EV',
      seatingCapacity: 11,
      fareRate: 500,
      ownerName: 'EV Test Owner',
      ownerMobileNumber: '9800000000',
      vehicleStatus: 'Active'
    });

    serviceControl = await ServiceControl.findOne();
    if (serviceControl) {
      originalEvSewaStatus = serviceControl.evSewaService;
      serviceControl.evSewaService = 'Active';
      await serviceControl.save();
    } else {
      serviceControl = await ServiceControl.create({ evSewaService: 'Active' });
      createdServiceControl = true;
    }
  });

  afterAll(async () => {
    if (vehicle) {
      const bookings = await Booking.find({ vehicle: vehicle._id }).select('_id');
      const bookingIds = bookings.map(booking => booking._id);
      await Payment.deleteMany({ booking: { $in: bookingIds } });
      await Booking.deleteMany({ _id: { $in: bookingIds } });
      await Vehicle.findByIdAndDelete(vehicle._id);
    }
    if (customer) {
      await Notification.deleteMany({ recipientId: customer._id });
      await User.findByIdAndDelete(customer._id);
    }
    if (createdServiceControl && serviceControl) {
      await ServiceControl.findByIdAndDelete(serviceControl._id);
    } else if (serviceControl && originalEvSewaStatus) {
      serviceControl.evSewaService = originalEvSewaStatus;
      await serviceControl.save();
    }
    await closeTestDB();
  });

  const passengerEntries = count => Array.from({ length: count }, (_, index) => ({
    name: `Passenger ${index + 1}`,
    age: 30,
    gender: 'Male'
  }));

  test('calculates fare per passenger, persists passenger count, and enforces vehicle capacity', async () => {
    let twoPassengerBookingId;
    for (const count of [1, 2, 3, 11]) {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleId: vehicle._id,
          serviceType: 'EV-Sewa',
          pickupLocation: 'EV Pickup',
          dropLocation: 'EV Drop',
          passengerCount: count,
          passengerDetails: passengerEntries(count),
          fare: 500 * count
        });

      expect(response.status).toBe(201);
      expect(response.body.data.fare).toBe(500 * count);
      expect(response.body.data.passengerDetails).toHaveLength(count);
      const persisted = await Booking.findById(response.body.data._id);
      expect(persisted.passengerDetails).toHaveLength(count);
      expect(persisted.fare).toBe(500 * count);
      if (count === 2) twoPassengerBookingId = response.body.data.bookingId;
    }

    const ticket = await request(app)
      .get(`/api/bookings/${twoPassengerBookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(ticket.status).toBe(200);
    expect(ticket.body.data.passengerDetails).toHaveLength(2);
    expect(ticket.body.data.fare).toBe(1000);

    const tooManyPassengers = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: vehicle._id,
        serviceType: 'EV-Sewa',
        pickupLocation: 'EV Pickup',
        dropLocation: 'EV Drop',
        passengerCount: 12,
        passengerDetails: passengerEntries(12),
        fare: 6000
      });

    expect(tooManyPassengers.status).toBe(400);
    expect(tooManyPassengers.body.message).toMatch(/capacity of 11/i);

    const mismatchedPassengerDetails = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: vehicle._id,
        serviceType: 'EV-Sewa',
        pickupLocation: 'EV Pickup',
        dropLocation: 'EV Drop',
        passengerCount: 2,
        passengerDetails: passengerEntries(1),
        fare: 1000
      });

    expect(mismatchedPassengerDetails.status).toBe(400);
    expect(mismatchedPassengerDetails.body.message).toMatch(/match the selected passenger count/i);
  });
});
