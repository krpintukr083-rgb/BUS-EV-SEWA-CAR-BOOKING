const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Driver = require('./src/models/Driver');
const Booking = require('./src/models/Booking');

async function findLockedDriver() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    
    const activeBookings = await Booking.find({
      bookingMode: 'INSTANT',
      driver: { $ne: null },
      bookingStatus: {
        $in: [
          'Pending Admin Confirmation',
          'PENDING_ADMIN_CONFIRMATION',
          'Admin Confirmed',
          'ADMIN_CONFIRMED',
          'Pending',
          'Pending Driver Confirmation',
          'Awaiting Cash Collection',
          'Confirmed',
          'Ongoing'
        ]
      }
    });

    for (const booking of activeBookings) {
      const driver = await Driver.findById(booking.driver);
      if (driver) {
        console.log(`\nLOCKED DRIVER FOUND:`);
        console.log(`driverId: ${driver._id}`);
        console.log(`driverName: ${driver.name}`);
        console.log(`bookingId: ${booking.bookingId}`);
        console.log(`bookingMode: ${booking.bookingMode}`);
        console.log(`bookingStatus: ${booking.bookingStatus}`);
        console.log(`driverConfirmationStatus: ${booking.driverConfirmationStatus}`);
        console.log(`driverConfirmed: ${booking.driverConfirmed}`);
        console.log(`assignedDriverId: ${booking.assignedDriverId || booking.driver}`);
        console.log(`createdAt: ${booking.createdAt}`);
        console.log(`updatedAt: ${booking.updatedAt}`);
      }
    }
    
    if (activeBookings.length === 0) {
      console.log('No drivers are currently locked with an active instant booking.');
    }
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

findLockedDriver();
