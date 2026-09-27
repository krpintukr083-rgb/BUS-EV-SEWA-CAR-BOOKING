const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Driver = require('./src/models/Driver');
const Booking = require('./src/models/Booking');

async function checkAllHarshBookings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    
    const drivers = await Driver.find({ name: 'Harsh' });
    console.log(`Found ${drivers.length} drivers named Harsh.`);
    
    for (const d of drivers) {
      console.log(`\nDriver: ${d._id} (${d.mobileNumber})`);
      const bookings = await Booking.find({ driver: d._id });
      console.log(`Found ${bookings.length} total bookings.`);
      for (const b of bookings) {
        console.log(`- ${b.bookingId} | Mode: ${b.bookingMode} | Status: ${b.bookingStatus}`);
      }
    }
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkAllHarshBookings();
