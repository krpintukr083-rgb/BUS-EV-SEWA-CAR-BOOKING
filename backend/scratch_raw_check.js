const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Driver = require('./src/models/Driver');
const Booking = require('./src/models/Booking');

async function checkStrId() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    
    const harshId = '6ab178f69352b8284c02ab39';
    
    const rawBookings = await mongoose.connection.db.collection('bookings').find({
      $or: [
        { driver: new mongoose.Types.ObjectId(harshId) },
        { driver: harshId },
        { assignedDriverId: harshId }
      ]
    }).toArray();
    
    console.log(`Found ${rawBookings.length} raw bookings for Harsh (ID: ${harshId}).`);
    for (const b of rawBookings) {
      console.log(`- ${b.bookingId} | Mode: ${b.bookingMode} | driver: ${b.driver} (${typeof b.driver})`);
    }
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkStrId();
