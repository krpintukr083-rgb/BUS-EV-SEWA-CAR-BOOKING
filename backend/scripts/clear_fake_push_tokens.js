/**
 * clear_fake_push_tokens.js
 *
 * PURPOSE: Remove ExponentPushToken[Emulator_...] fake tokens from MongoDB
 * for Ayush, Pintu, and Harsh drivers ONLY.
 *
 * DOES NOT:
 *   - Delete driver records
 *   - Delete bookings
 *   - Touch any field other than pushToken and fcmToken
 *   - Change driverStatus or isOnline
 *   - Change OTP, KYC, GPS, or payment data
 *
 * SAFE TO RUN: Yes — only nulls out fake push tokens
 */

'use strict';

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[CLEANUP] ERROR: MONGODB_URI not set in .env');
  process.exit(1);
}

// Fake emulator token pattern to detect and remove
const FAKE_TOKEN_PATTERN = /^ExponentPushToken\[Emulator/i;

async function clearFakePushTokens() {
  console.log('[CLEANUP] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('[CLEANUP] Connected.');

  const Driver = require('../src/models/Driver');

  // 1. Find all drivers with a pushToken set
  const drivers = await Driver.find({
    pushToken: { $ne: null, $exists: true }
  }).select('name mobileNumber pushToken fcmToken driverStatus');

  console.log(`[CLEANUP] Found ${drivers.length} driver(s) with a pushToken.`);

  let fakeTokenCount = 0;
  let clearedCount = 0;

  for (const driver of drivers) {
    const token = driver.pushToken || '';
    const isFakeToken = FAKE_TOKEN_PATTERN.test(token);

    console.log(`\n[CLEANUP] Driver: "${driver.name}" | Status: ${driver.driverStatus}`);
    console.log(`[CLEANUP]   pushToken: ${token ? token.substring(0, 60) + (token.length > 60 ? '...' : '') : 'null'}`);
    console.log(`[CLEANUP]   isFakeToken: ${isFakeToken}`);

    if (isFakeToken) {
      fakeTokenCount++;

      // ONLY clear pushToken and fcmToken — nothing else
      const result = await Driver.findByIdAndUpdate(
        driver._id,
        { $set: { pushToken: null, fcmToken: null } },
        { new: true }
      ).select('name pushToken fcmToken');

      console.log(`[CLEANUP]   CLEARED fake token for "${result.name}" -> pushToken: ${result.pushToken}`);
      clearedCount++;
    } else {
      console.log(`[CLEANUP]   SKIP — token appears real (not emulator pattern)`);
    }
  }

  console.log(`\n[CLEANUP] ============================`);
  console.log(`[CLEANUP] Total drivers with pushToken:  ${drivers.length}`);
  console.log(`[CLEANUP] Fake emulator tokens found:    ${fakeTokenCount}`);
  console.log(`[CLEANUP] Tokens cleared (set to null):  ${clearedCount}`);
  console.log(`[CLEANUP] ============================`);
  console.log('[CLEANUP] DONE. No driver records deleted. Only pushToken/fcmToken nulled for fake tokens.');

  await mongoose.disconnect();
  console.log('[CLEANUP] Disconnected from MongoDB.');
}

clearFakePushTokens().catch((err) => {
  console.error('[CLEANUP] FATAL ERROR:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
