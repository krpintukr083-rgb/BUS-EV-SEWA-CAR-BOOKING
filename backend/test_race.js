const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Booking = require('../src/models/Booking');

async function runTest() {
  await mongoose.connect('mongodb://127.0.0.1:27017/bus-booking');
  console.log('Connected to DB');

  // Find customer
  const customer = await User.findOne({ role: 'customer' });
  const customerToken = customer.generateAuthToken();

  // Find 2 drivers
  const drivers = await Driver.find({ driverStatus: 'Active' }).limit(2);
  const d1Token = drivers[0].generateAuthToken();
  const d2Token = drivers[1].generateAuthToken();

  // 1. Create Broadcast Booking
  console.log('Creating Broadcast Booking...');
  const res = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      bookingMode: 'INSTANT',
      serviceType: 'Any',
      pickupLocation: 'Delhi',
      dropLocation: 'Jaipur',
      paymentMethod: 'Offline Cash'
    });

  const bookingId = res.body.data._id;
  console.log('Booking Created:', bookingId);

  // 2. Both Drivers fetch requests
  const req1 = await request(app).get('/api/driver/requests').set('Authorization', `Bearer ${d1Token}`);
  const req2 = await request(app).get('/api/driver/requests').set('Authorization', `Bearer ${d2Token}`);
  
  console.log('Driver 1 sees:', req1.body.data.some(b => b._id === bookingId));
  console.log('Driver 2 sees:', req2.body.data.some(b => b._id === bookingId));

  // 3. Race condition claim
  console.log('Racing to claim...');
  const [claim1, claim2] = await Promise.all([
    request(app).post(`/api/driver/requests/${bookingId}/accept`).set('Authorization', `Bearer ${d1Token}`),
    request(app).post(`/api/driver/requests/${bookingId}/accept`).set('Authorization', `Bearer ${d2Token}`)
  ]);

  console.log('Driver 1 Claim:', claim1.body.success, claim1.body.message);
  console.log('Driver 2 Claim:', claim2.body.success, claim2.body.message);

  const updatedBooking = await Booking.findById(bookingId);
  console.log('Final Booking Assigned Driver:', updatedBooking.driver);
  console.log('Final Fare:', updatedBooking.fare);

  process.exit(0);
}

runTest().catch(console.error);
