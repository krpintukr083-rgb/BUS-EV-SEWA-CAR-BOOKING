const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const { acceptBookingRequest } = require('./src/controllers/driverController');
const Booking = require('./src/models/Booking');
const Driver = require('./src/models/Driver');

async function testAccept() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    
    const driver = await Driver.findById('6ab178f69352b8284c02ab39').populate('assignedVehicle');
    if (!driver) throw new Error('Driver not found');
    
    const booking = await Booking.findOne({ bookingId: 'BK-2911939' });
    if (!booking) throw new Error('Booking not found');
    
    console.log(`Booking current driver: ${booking.driver}`);
    console.log(`Booking current mode: ${booking.bookingMode}`);
    console.log(`Booking current status: ${booking.bookingStatus}`);

    const req = {
      driver: driver,
      params: { id: booking._id.toString() }
    };
    
    const res = {
      status: function(code) {
        console.log(`HTTP ${code}`);
        return this;
      },
      json: function(data) {
        console.log('Response:', JSON.stringify(data, null, 2));
      }
    };
    
    const next = function(error) {
      console.log('Next error:', error);
    };

    console.log('Calling acceptBookingRequest...');
    await acceptBookingRequest(req, res, next);
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testAccept();
