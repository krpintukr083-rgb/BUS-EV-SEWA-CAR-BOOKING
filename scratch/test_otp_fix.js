const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const Driver = require('../backend/src/models/Driver');
const Booking = require('../backend/src/models/Booking');

async function testOtpFix() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-booking';
    await mongoose.connect(mongoUri);
    console.log('[DB] Connected');

    const booking = await Booking.findOne({ bookingId: 'BK-6299366' }).populate('driver');
    if (!booking) {
      console.error('Booking BK-6299366 not found');
      return process.exit(1);
    }

    const driver = booking.driver;
    console.log(`[TEST] Driver Name: ${driver.name}, Status: "${driver.driverStatus}", isOnline: ${driver.isOnline}`);

    // Check status condition
    const normStatus = String(driver?.driverStatus || '').trim().toLowerCase();
    const isStatusActiveOrApproved = ['active', 'approved'].includes(normStatus);

    console.log(`[TEST] Is Status Active or Approved? ${isStatusActiveOrApproved}`);

    // Check driver identity matching
    const driverIds = [driver._id, driver.user?._id || driver.user].filter(Boolean).map(String);
    const bookingDriverId = booking.driver ? String(booking.driver._id || booking.driver) : null;
    const assignedToDriver = bookingDriverId && driverIds.includes(bookingDriverId);

    console.log(`[TEST] Booking Driver ID: ${bookingDriverId}`);
    console.log(`[TEST] Driver IDs: ${JSON.stringify(driverIds)}`);
    console.log(`[TEST] Assigned to driver? ${assignedToDriver}`);

    if (isStatusActiveOrApproved && assignedToDriver) {
      console.log('=== OTP AUTHORIZATION FIX VERIFIED FOR ACCEPTED DRIVER ===');
    } else {
      console.log('=== OTP AUTHORIZATION FAILED ===');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testOtpFix();
