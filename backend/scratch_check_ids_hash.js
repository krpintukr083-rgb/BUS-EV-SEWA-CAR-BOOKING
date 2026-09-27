const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Booking = require('./src/models/Booking');

async function testAccept() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    
    const b1 = await Booking.findOne({ bookingId: '#BK-2911939' });
    console.log(`#BK-2911939: ${b1 ? 'FOUND' : 'NOT FOUND'}`);

    const b2 = await Booking.findOne({ bookingId: '#BK-6307235' });
    console.log(`#BK-6307235: ${b2 ? 'FOUND' : 'NOT FOUND'}`);
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testAccept();
