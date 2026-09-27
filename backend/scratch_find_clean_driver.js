const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Driver = require('./src/models/Driver');
const Vehicle = require('./src/models/Vehicle');
const Booking = require('./src/models/Booking');

async function findCleanDriver() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // Find vehicles that run from Delhi to Jaipur
    const vehicles = await Vehicle.find({
      'route.origin': { $regex: /Delhi/i },
      'route.destination': { $regex: /Jaipur/i },
      vehicleStatus: 'Active'
    });
    
    console.log(`Found ${vehicles.length} vehicles for Delhi -> Jaipur.`);

    const driverIds = vehicles.map(v => v.assignedDriver).filter(Boolean);
    const drivers = await Driver.find({
      _id: { $in: driverIds },
      driverStatus: { $in: ['Active', 'Approved'] }
    });

    for (const driver of drivers) {
      console.log(`\nInspecting Driver: ${driver.name} (ID: ${driver._id})`);
      
      const activeBookings = await Booking.find({
        driver: driver._id,
        bookingMode: 'INSTANT',
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

      if (activeBookings.length > 0) {
        console.log(`  Active Instant Booking: YES`);
        for (const booking of activeBookings) {
            console.log(`  - bookingId: ${booking.bookingId}`);
            console.log(`  - bookingMode: ${booking.bookingMode}`);
            console.log(`  - bookingStatus: ${booking.bookingStatus}`);
            console.log(`  - driverConfirmationStatus: ${booking.driverConfirmationStatus}`);
            console.log(`  - driverConfirmed: ${booking.driverConfirmed}`);
            console.log(`  - assignedDriverId: ${booking.assignedDriverId || booking.driver}`);
            console.log(`  - createdAt: ${booking.createdAt}`);
            console.log(`  - updatedAt: ${booking.updatedAt}`);
        }
      } else {
        console.log(`  Active Instant Booking: NO`);
        console.log(`  Driver is ready for E2E: YES`);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

findCleanDriver();
