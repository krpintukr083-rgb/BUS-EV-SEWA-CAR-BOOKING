/**
 * install_driver_apk.js
 * Robust APK installer that handles ADB version conflict (v36 vs v41)
 * Tries multiple install methods. Run: node install_driver_apk.js
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');

const ADB = 'C:\\Users\\harsh_33xna20\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const APK = 'e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\release-apks\\DriverApp-release.apk';
const PHYSICAL = '10BG5J1H8M002R3';
const EMULATOR = 'emulator-5554';

function run(cmd, opts = {}) {
  try {
    const result = spawnSync('cmd', ['/c', cmd], {
      encoding: 'utf8',
      timeout: 90000,
      ...opts
    });
    return { stdout: result.stdout || '', stderr: result.stderr || '', code: result.status || 0 };
  } catch (e) {
    return { stdout: '', stderr: e.message, code: 1 };
  }
}

function adb(...args) {
  return run(`"${ADB}" ${args.join(' ')}`);
}

console.log('=== Driver APK Install Script ===\n');

// Step 1: Kill ALL adb processes and start fresh
console.log('[1] Killing all existing adb processes...');
run('taskkill /F /IM adb.exe /T');
const { execSync: ex } = require('child_process');
try { ex('taskkill /F /IM adb.exe /T', { stdio: 'ignore' }); } catch(e) {}

// Small wait
require('child_process').execSync('timeout /t 2 /nobreak', { stdio: 'ignore' });

// Step 2: Start fresh adb server
console.log('[2] Starting fresh ADB server (v41)...');
const startRes = adb('start-server');
console.log('   ', startRes.stdout.trim() || startRes.stderr.trim() || 'started');

require('child_process').execSync('timeout /t 2 /nobreak', { stdio: 'ignore' });

// Step 3: List devices
console.log('[3] Connected devices:');
const devRes = adb('devices');
console.log(devRes.stdout);

// Step 4: Try emulator first (more stable)
console.log('[4] Trying emulator-5554...');
const emuCheck = adb('-s', EMULATOR, 'shell', 'echo', 'alive');
if (emuCheck.stdout.includes('alive')) {
  console.log('   Emulator is online. Pushing APK...');
  const pushRes = adb('-s', EMULATOR, 'push', `"${APK}"`, '/data/local/tmp/DriverApp.apk');
  console.log('   Push:', pushRes.stdout.trim() || pushRes.stderr.trim());
  
  console.log('   Installing via pm...');
  const pmRes = adb('-s', EMULATOR, 'shell', 'pm', 'install', '-r', '/data/local/tmp/DriverApp.apk');
  if (pmRes.stdout.includes('Success') || pmRes.stderr.includes('Success')) {
    console.log('   ✅ INSTALLED on emulator-5554!');
    
    // Launch app
    console.log('   Launching Driver App...');
    adb('-s', EMULATOR, 'shell', 'am', 'start', '-n', 'com.travelease.driver/.MainActivity');
    require('child_process').execSync('timeout /t 4 /nobreak', { stdio: 'ignore' });
    
    // Screenshot
    console.log('   Taking screenshot...');
    adb('-s', EMULATOR, 'shell', 'screencap', '-p', '/sdcard/driver_otp_screen.png');
    adb('-s', EMULATOR, 'pull', '/sdcard/driver_otp_screen.png',
      '"e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\driver_emulator_screen.png"');
    console.log('   Screenshot saved: driver_emulator_screen.png');
  } else {
    console.log('   ❌ Install failed on emulator:', pmRes.stdout, pmRes.stderr);
  }
} else {
  console.log('   Emulator not responding:', emuCheck.stderr.trim());
}

// Step 5: Try physical device
console.log('\n[5] Trying physical device', PHYSICAL, '...');
const physCheck = adb('-s', PHYSICAL, 'shell', 'echo', 'alive');
if (physCheck.stdout.includes('alive')) {
  console.log('   Physical device is ONLINE. Installing...');
  const installRes = adb('-s', PHYSICAL, 'install', '-r', `"${APK}"`);
  if (installRes.stdout.includes('Success') || installRes.stderr.includes('Success')) {
    console.log('   ✅ INSTALLED on physical device!');
    adb('-s', PHYSICAL, 'shell', 'am', 'start', '-n', 'com.travelease.driver/.MainActivity');
  } else {
    console.log('   Push method for physical...');
    const pushR = adb('-s', PHYSICAL, 'push', `"${APK}"`, '/data/local/tmp/DriverApp.apk');
    console.log('   Push:', pushR.stdout.trim() || pushR.stderr.trim());
    const pmR = adb('-s', PHYSICAL, 'shell', 'pm', 'install', '-r', '/data/local/tmp/DriverApp.apk');
    if (pmR.stdout.includes('Success') || pmR.stderr.includes('Success')) {
      console.log('   ✅ INSTALLED on physical device via push+pm!');
    } else {
      console.log('   ❌ Physical install failed:', pmR.stdout, pmR.stderr);
    }
  }
} else {
  console.log('   Physical device OFFLINE. Status:', physCheck.stderr.trim());
}

console.log('\n=== Done ===');
