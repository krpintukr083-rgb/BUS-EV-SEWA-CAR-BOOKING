const axios = require('axios');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Notification = require('../src/models/Notification');
const User = require('../src/models/User');

const API_BASE = 'http://localhost:5000/api';
const KNOWN_PASSWORD = 'Password123';

async function testIncompLive() {
  await mongoose.connect(process.env.MONGODB_URI);

  const customerUser = await User.findOne({ role: 'customer' });
  customerUser.password = KNOWN_PASSWORD;
  await customerUser.save();

  const custLogin = await axios.post(`${API_BASE}/auth/login`, {
    identifier: customerUser.phone,
    password: KNOWN_PASSWORD,
    role: 'customer'
  });
  const customerToken = custLogin.data.token;

  console.log('Creating fresh Car instant booking (Kathmandu -> Birgunj)...');
  const bookingPayload = {
    pickupLocation: 'Kathmandu',
    dropLocation: 'Birgunj',
    serviceType: 'Car',
    bookingMode: 'INSTANT',
    fare: 2500,
    seatsBooked: 1,
    passengerDetails: [{ name: 'Test Incompatible Filter', phone: '9811122233', age: 30, gender: 'Male' }],
    paymentMethod: 'CASH',
    travelDate: new Date().toISOString()
  };

  const bookingRes = await axios.post(`${API_BASE}/bookings/instant`, bookingPayload, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });

  const b = bookingRes.data.data;
  console.log(`Created Booking: ${b.bookingId} (_id=${b._id})`);

  await new Promise(r => setTimeout(r, 1500));

  const notifs = await Notification.find({
    entityId: new mongoose.Types.ObjectId(b._id),
    eventType: 'BOOKING_REQUEST'
  });

  console.log(`Notifications generated in DB: ${notifs.length}`);
  notifs.forEach(n => console.log('  Recipient:', n.recipient, '| DriverID:', n.driverId));

  // Incompatible driver ID: 6ad7770c41c7345919e94a6f
  const incompNotif = notifs.find(n => String(n.driverId) === '6ad7770c41c7345919e94a6f');
  console.log('Was Incompatible Bus Driver notified in DB?', incompNotif ? 'YES (UNEXPECTED)' : 'NO (CORRECT)');

  process.exit(0);
}

testIncompLive().catch(err => {
  console.error(err);
  process.exit(1);
});
