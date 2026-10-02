const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const Driver = require('../backend/src/models/Driver');
const Booking = require('../backend/src/models/Booking');

async function checkDatabaseState() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-booking';
    await mongoose.connect(mongoUri);
    console.log('[DB] Connected to MongoDB');

    // Find the latest booking (BK-6299366 or any active/recent booking)
    const booking = await Booking.findOne({ bookingId: /6299366/ }).populate('driver');
    console.log('--- BOOKING DIAGNOSTICS ---');
    if (booking) {
      console.log(`Booking ID: ${booking.bookingId}`);
      console.log(`Booking Mode: ${booking.bookingMode}`);
      console.log(`Booking Status: ${booking.bookingStatus}`);
      console.log(`Ride Status: ${booking.rideStatus}`);
      console.log(`Booking Driver ID: ${booking.driver?._id || booking.driver}`);
      if (booking.driver) {
        console.log(`Booking Driver Name: ${booking.driver.name}`);
        console.log(`Booking Driver Status: "${booking.driver.driverStatus}"`);
        console.log(`Booking Driver isOnline: ${booking.driver.isOnline}`);
      }
    } else {
      console.log('Booking BK-6299366 not found by regex. Fetching latest 3 bookings:');
      const recent = await Booking.find().sort({ createdAt: -1 }).limit(3).populate('driver');
      for (const b of recent) {
        console.log(`- Booking #${b.bookingId} (${b.bookingMode}): status=${b.bookingStatus}, driver=${b.driver?.name} (status="${b.driver?.driverStatus}", isOnline=${b.driver?.isOnline})`);
      }
    }

    console.log('\n--- ALL DRIVERS STATUS IN DB ---');
    const drivers = await Driver.find().select('name driverStatus isOnline mobileNumber user').lean();
    for (const d of drivers) {
      console.log(`Driver "${d.name}" (${d._id}): driverStatus="${d.driverStatus}", isOnline=${d.isOnline}`);
    }

  } catch (err) {
    console.error('DB check error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabaseState();
