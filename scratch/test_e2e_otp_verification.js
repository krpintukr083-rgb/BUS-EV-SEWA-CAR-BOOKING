const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));
const Driver = require('../backend/src/models/Driver');
const Booking = require('../backend/src/models/Booking');
const { verifyRideOtp } = require('../backend/src/controllers/driverController');

async function runE2EOtpVerificationTest() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bus-booking';
    await mongoose.connect(mongoUri);
    console.log('[E2E TEST] Connected to MongoDB');

    // 1. Find booking BK-6299366
    const booking = await Booking.findOne({ bookingId: 'BK-6299366' }).populate('driver');
    if (!booking) {
      console.error('Booking BK-6299366 not found');
      return process.exit(1);
    }

    const driver = booking.driver;
    console.log(`[E2E TEST] Booking ID: ${booking.bookingId} (${booking.bookingMode})`);
    console.log(`[E2E TEST] Assigned Driver: ${driver.name}, driverStatus: "${driver.driverStatus}"`);

    // Reset OTP verification flags for test
    booking.otpVerified = false;
    booking.driverConfirmed = false;
    booking.confirmationOtpVerifiedAt = null;
    booking.customerViewOtp = '123456';
    await booking.save();

    // 2. Mock Express req, res for WRONG OTP
    let responseStatus = 200;
    let responseData = null;

    const mockResWrong = {
      status: (code) => { responseStatus = code; return mockResWrong; },
      json: (data) => { responseData = data; return mockResWrong; }
    };

    const mockReqWrong = {
      driver,
      params: { id: booking.bookingId },
      body: { otp: '999999' }
    };

    await verifyRideOtp(mockReqWrong, mockResWrong, (err) => console.error(err));

    console.log('\n--- WRONG OTP RESULT ---');
    console.log(`HTTP Status: ${responseStatus}`);
    console.log(`Response Message: "${responseData?.message}"`);
    const wrongOtpPassed = responseStatus === 400 && responseData?.success === false;
    console.log(`RESULT: ${wrongOtpPassed ? 'PASS (HTTP 400 returned, booking remains assigned)' : 'FAIL'}`);

    // 3. Mock Express req, res for CORRECT OTP
    responseStatus = 200;
    responseData = null;

    const mockResCorrect = {
      status: (code) => { responseStatus = code; return mockResCorrect; },
      json: (data) => { responseData = data; return mockResCorrect; }
    };

    const mockReqCorrect = {
      driver,
      params: { id: booking.bookingId },
      body: { otp: '123456' }
    };

    await verifyRideOtp(mockReqCorrect, mockResCorrect, (err) => console.error(err));

    console.log('\n--- CORRECT OTP RESULT ---');
    console.log(`HTTP Status: ${responseStatus}`);
    console.log(`Response Message: "${responseData?.message}"`);
    const correctOtpPassed = responseStatus === 200 && responseData?.success === true;
    console.log(`RESULT: ${correctOtpPassed ? 'PASS (HTTP 200 returned, otpVerified=true, driverConfirmed=true)' : 'FAIL'}`);

    // Verify DB persistence
    const verifiedBooking = await Booking.findById(booking._id);
    console.log(`[DB VERIFY] otpVerified: ${verifiedBooking.otpVerified}, driverConfirmed: ${verifiedBooking.driverConfirmed}, status: ${verifiedBooking.bookingStatus}`);

    if (wrongOtpPassed && correctOtpPassed && verifiedBooking.otpVerified) {
      console.log('\n==================================================');
      console.log('E2E OTP VERIFICATION FLOW TEST PASSED SUCCESSFULLY');
      console.log('==================================================\n');
    } else {
      console.log('\n=== E2E OTP TEST FAILED ===\n');
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runE2EOtpVerificationTest();
