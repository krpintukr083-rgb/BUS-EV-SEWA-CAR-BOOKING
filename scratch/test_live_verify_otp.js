const path = require('path');
const backendDir = path.resolve(__dirname, '../backend');
const axios = require(path.join(backendDir, 'node_modules/axios'));
const mongoose = require(path.join(backendDir, 'node_modules/mongoose'));
require(path.join(backendDir, 'node_modules/dotenv')).config({ path: path.join(backendDir, '.env') });

async function testEndToEndOtpFlow() {
  console.log('====================================================');
  console.log('--- E2E OTP SEND & VERIFY TEST ON LIVE RENDER ---');
  console.log('====================================================');

  const testPhone = '9840008888';
  const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

  try {
    // 1. Connect MongoDB to verify generated OTP record directly
    await mongoose.connect(process.env.MONGODB_URI);
    const Otp = require('../backend/src/models/Otp');
    const User = require('../backend/src/models/User');

    // Clean prior test records
    await Otp.deleteMany({ phone: testPhone });
    await User.deleteMany({ phone: `+977${testPhone}` });
    await User.deleteMany({ phone: testPhone });

    console.log(`\nStep 1: Sending POST ${BASE_URL}/auth/send-otp for phone: ${testPhone}...`);
    const sendRes = await axios.post(`${BASE_URL}/auth/send-otp`, { phone: testPhone });
    console.log('Send OTP Status:', sendRes.status);
    console.log('Send OTP Data:', sendRes.data);

    // 2. Lookup OTP document saved in MongoDB Atlas by Render backend
    const savedOtpDoc = await Otp.findOne({ phone: testPhone });
    if (!savedOtpDoc) {
      console.error('❌ OTP Document not found in MongoDB!');
      return;
    }
    console.log('\n[MongoDB Atlas Check] OTP document verified in DB:');
    console.log('- Phone Key:', savedOtpDoc.phone);
    console.log('- ExpiresAt:', savedOtpDoc.expiresAt);
    console.log('- ResendAfter:', savedOtpDoc.resendAfter);
    console.log('- Hashed OTP in DB:', savedOtpDoc.otp.substring(0, 15) + '...');

    // 3. Test Invalid OTP Code
    console.log('\nStep 2: Testing Invalid OTP Verification...');
    try {
      await axios.post(`${BASE_URL}/auth/verify-otp`, { phone: testPhone, otp: '000000' });
      console.error('❌ Expected invalid OTP error but request succeeded!');
    } catch (err) {
      if (err.response?.status === 400) {
        console.log('✅ PASSED: Invalid OTP code rejected with 400 error:', err.response.data.message);
      }
    }

    // 4. Update OTP record hash to known test code '123456' for verification test
    const bcrypt = require(path.join(backendDir, 'node_modules/bcryptjs'));
    savedOtpDoc.otp = await bcrypt.hash('123456', 10);
    await savedOtpDoc.save();

    // 5. Test Valid OTP Verification
    console.log('\nStep 3: Verifying OTP and creating customer session...');
    const verifyRes = await axios.post(`${BASE_URL}/auth/verify-otp`, { phone: testPhone, otp: '123456' });
    console.log('Verify OTP Status:', verifyRes.status);
    console.log('Verify OTP Data:', verifyRes.data);
    console.log('- Customer User ID:', verifyRes.data.user?.id);
    console.log('- Customer Phone:', verifyRes.data.user?.phone);
    console.log('- JWT Token Issued:', !!verifyRes.data.token);

    // 6. Verify single-use deletion
    const checkDeletedOtp = await Otp.findOne({ phone: testPhone });
    console.log('\n[Single-Use Check] OTP deleted after verification:', !checkDeletedOtp ? '✅ DELETED' : '❌ STILL EXISTS');

    // Clean test user
    await User.deleteMany({ phone: `+977${testPhone}` });
    await User.deleteMany({ phone: testPhone });
    await Otp.deleteMany({ phone: testPhone });
    console.log('\n[Cleaned E2E test records]');

  } catch (e) {
    console.error('E2E Test Exception:', e.response?.data || e.message);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

testEndToEndOtpFlow();
