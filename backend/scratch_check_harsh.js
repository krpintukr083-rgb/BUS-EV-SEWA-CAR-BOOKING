const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Booking = require('./src/models/Booking');

async function checkHarshBookings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    
    const driverId = new mongoose.Types.ObjectId('6ab178f69352b8284c02ab39');
    const bookings = await Booking.find({ driver: driverId });
    
    console.log(`Found ${bookings.length} total bookings for Harsh.`);
    for (const b of bookings) {
      console.log(`- ${b.bookingId} | Mode: ${b.bookingMode} | Status: ${b.bookingStatus}`);
    }
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkHarshBookings();
