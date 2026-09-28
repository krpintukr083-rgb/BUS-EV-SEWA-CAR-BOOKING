const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'backend/.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Booking = require('./backend/src/models/Booking');
  const Driver = require('./backend/src/models/Driver');
  
  const allDrivers = await Driver.find().lean();
  console.log('--- ALL DRIVERS ---');
  allDrivers.forEach(d => console.log(d._id.toString(), d.name, d.email, d.phone, d.status, d.isOnline));

  const activeBookings = await Booking.find({
    bookingMode: 'INSTANT',
    rideStatus: { $in: ['Accepted', 'Arrived', 'Started', 'Ongoing'] }
  }).lean();
  console.log('--- ACTIVE INSTANT BOOKINGS ---');
  for (const b of activeBookings) {
    console.log(b.bookingId, 'driver:', b.driver?.toString(), 'assignedDriverId:', b.assignedDriverId?.toString(), 'rideStatus:', b.rideStatus, 'bookingStatus:', b.bookingStatus);
  }

  const allInstant = await Booking.find({
    bookingMode: 'INSTANT'
  }).sort({ createdAt: -1 }).limit(10).lean();
  console.log('--- RECENT 10 INSTANT BOOKINGS ---');
  for (const b of allInstant) {
    console.log(b.bookingId, 'driver:', b.driver?.toString(), 'assignedDriverId:', b.assignedDriverId?.toString(), 'rideStatus:', b.rideStatus, 'bookingStatus:', b.bookingStatus);
  }

  process.exit(0);
}
check().catch(console.error);
