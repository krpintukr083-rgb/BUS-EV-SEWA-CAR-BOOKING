require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./src/models/Booking');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const latest = await Booking.find().sort({ createdAt: -1 }).limit(5);
  console.log('Latest 5 bookings in DB:');
  for (const b of latest) {
    console.log({
      bookingId: b.bookingId,
      bookingMode: b.bookingMode,
      bookingType: b.bookingType,
      createdAt: b.createdAt,
      pickup: b.pickupLocation,
      drop: b.dropLocation
    });
  }
  process.exit(0);
}

check().catch(console.error);
