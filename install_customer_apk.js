/**
 * install_customer_apk.js
 * Exactly mimics install_driver_apk.js logic
 */
const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ADB = 'C:\\Users\\harsh_33xna20\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const APK = 'e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\customer-release.apk';
const EMULATOR = 'emulator-5554';

function adb(...args) {
  try {
    const result = spawnSync(ADB, args, {
      encoding: 'utf8',
      timeout: 90000
    });
    return { stdout: result.stdout || '', stderr: result.stderr || '', code: result.status || 0 };
  } catch (e) {
    return { stdout: '', stderr: e.message, code: 1 };
  }
}

console.log('=== Customer APK Install Script ===\n');

// Step 1: Kill ALL adb processes and start fresh
console.log('[1] Killing all existing adb processes...');
try { execSync('taskkill /F /IM adb.exe /T', { stdio: 'ignore' }); } catch(e) {}

// Small wait
try { execSync('timeout /t 2 /nobreak', { stdio: 'ignore' }); } catch(e) {}

// Step 2: Start fresh adb server
console.log('[2] Starting fresh ADB server (Android SDK)...');
const startRes = adb('start-server');
console.log('   ', startRes.stdout.trim() || startRes.stderr.trim() || 'started');

try { execSync('timeout /t 2 /nobreak', { stdio: 'ignore' }); } catch(e) {}

// Step 3: List devices
console.log('[3] Connected devices:');
const devRes = adb('devices');
console.log(devRes.stdout);

// Step 4: Try emulator
console.log('[4] Trying emulator-5554...');
const emuCheck = adb('-s', EMULATOR, 'shell', 'echo', 'alive');
if (emuCheck.stdout.includes('alive')) {
  console.log('   Emulator is online. Pushing Customer APK...');
  const pushRes = adb('-s', EMULATOR, 'push', APK, '/data/local/tmp/customer-app.apk');
  console.log('   Push:', pushRes.stdout.trim() || pushRes.stderr.trim());

  console.log('   Installing via pm...');
  const pmRes = adb('-s', EMULATOR, 'shell', 'pm', 'install', '-r', '/data/local/tmp/customer-app.apk');
  console.log('   PM Install:', pmRes.stdout.trim() || pmRes.stderr.trim());

  if (pmRes.stdout.includes('Success') || pmRes.stderr.includes('Success')) {
    console.log('   ✅ INSTALLED Customer App on emulator-5554!');

    // Launch app
    console.log('   Launching Customer App...');
    adb('-s', EMULATOR, 'shell', 'am', 'force-stop', 'com.travelease.customer');
    adb('-s', EMULATOR, 'shell', 'monkey', '-p', 'com.travelease.customer', '-c', 'android.intent.category.LAUNCHER', '1');

    console.log('   Waiting 8 seconds for HomeScreen to render with dynamic discount banner...');
    try { execSync('timeout /t 8 /nobreak', { stdio: 'ignore' }); } catch(e) {}

    // Screenshot
    console.log('   Taking screenshot...');
    adb('-s', EMULATOR, 'shell', 'screencap', '-p', '/sdcard/customer_home_banner.png');
    adb('-s', EMULATOR, 'pull', '/sdcard/customer_home_banner.png', 'e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\customer_home_banner.png');
    console.log('   Screenshot saved to: customer_home_banner.png');
  } else {
    console.log('   ❌ Install failed on emulator:', pmRes.stdout, pmRes.stderr);
  }
} else {
  console.log('   Emulator not responding:', emuCheck.stderr.trim());
}

console.log('\n=== Done ===');
