// OTP Debug Script — check recent bookings and their OTP expiry
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Must load model AFTER connect so schema is registered
  const Booking = require('./src/models/Booking');

  // Get 5 most recent bookings with OTP fields
  const bookings = await Booking.find({})
    .select('+confirmationOtpHash confirmationOtpExpiresAt customerViewOtp bookingId bookingMode bookingStatus rideStatus createdAt fare pickupLocation dropLocation')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const now = new Date();
  console.log(`\n[OTP DEBUG] Current server time: ${now.toISOString()}\n`);

  bookings.forEach(b => {
    const expiresAt = b.confirmationOtpExpiresAt ? new Date(b.confirmationOtpExpiresAt) : null;
    const createdAt = b.createdAt ? new Date(b.createdAt) : null;
    const remainingMs = expiresAt ? (expiresAt - now) : null;
    const remainingHours = remainingMs != null ? (remainingMs / (1000 * 60 * 60)).toFixed(2) : 'N/A';
    const isExpired = expiresAt ? (expiresAt < now) : 'no-expiry-set';

    console.log('---');
    console.log(`bookingId:         ${b.bookingId}`);
    console.log(`bookingMode:       ${b.bookingMode}`);
    console.log(`bookingStatus:     ${b.bookingStatus}`);
    console.log(`rideStatus:        ${b.rideStatus}`);
    console.log(`route:             ${b.pickupLocation} → ${b.dropLocation}`);
    console.log(`fare:              ₹${b.fare}`);
    console.log(`createdAt:         ${createdAt ? createdAt.toISOString() : 'null'}`);
    console.log(`confirmationOtpExpiresAt: ${expiresAt ? expiresAt.toISOString() : 'NULL ← BUG!'}`);
    console.log(`now:               ${now.toISOString()}`);
    console.log(`remainingMs:       ${remainingMs}`);
    console.log(`remainingHours:    ${remainingHours}`);
    console.log(`isExpired:         ${isExpired}`);
    console.log(`hasOtpHash:        ${!!b.confirmationOtpHash}`);
    console.log(`customerViewOtp:   ${b.customerViewOtp ? '[SET]' : 'null'}`);

    if (expiresAt && createdAt) {
      const diffHours = ((expiresAt - createdAt) / (1000 * 60 * 60)).toFixed(2);
      console.log(`expiresAt-createdAt: ${diffHours} hours (should be ~10)`);
    }
  });

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
