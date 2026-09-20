/**
 * install_driver_apk2.js - Robust APK installer using sleep instead of timeout
 */
const { spawnSync } = require('child_process');

const ADB = 'C:\\Users\\harsh_33xna20\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const APK = 'e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\release-apks\\DriverApp-release.apk';
const PHYSICAL = '10BG5J1H8M002R3';
const EMULATOR = 'emulator-5554';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function adb(...args) {
  const result = spawnSync(ADB, args, {
    encoding: 'utf8',
    timeout: 90000
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    code: result.status || 0,
    ok: (result.status === 0)
  };
}

async function main() {
  console.log('=== Driver APK Robust Installer ===\n');

  // Step 1: Kill all adb, start clean
  console.log('[1] Killing old adb processes...');
  spawnSync('taskkill', ['/F', '/IM', 'adb.exe', '/T'], { encoding: 'utf8' });
  await sleep(2000);

  // Step 2: Start fresh adb server
  console.log('[2] Starting fresh ADB v41 server...');
  const startRes = adb('start-server');
  console.log('   ', (startRes.stdout + startRes.stderr).trim());
  await sleep(3000);

  // Step 3: List devices
  const devRes = adb('devices');
  console.log('[3] Devices:\n' + devRes.stdout);

  // Step 4: Try emulator
  const emuAlive = adb('-s', EMULATOR, 'shell', 'echo', 'alive');
  if (emuAlive.stdout.includes('alive')) {
    console.log('[4] Emulator-5554 is ONLINE. Pushing APK...');
    const pushRes = adb('-s', EMULATOR, 'push', APK, '/data/local/tmp/DriverApp.apk');
    console.log('   Push:', (pushRes.stdout + pushRes.stderr).trim());

    console.log('   Installing via pm...');
    const pmRes = adb('-s', EMULATOR, 'shell', 'pm', 'install', '-r', '/data/local/tmp/DriverApp.apk');
    const pmOut = (pmRes.stdout + pmRes.stderr);
    console.log('   PM result:', pmOut.trim());

    if (pmOut.includes('Success')) {
      console.log('   ✅ INSTALLED on emulator-5554!');

      // Launch app
      await sleep(1000);
      console.log('   Launching Driver App...');
      adb('-s', EMULATOR, 'shell', 'am', 'start', '-n', 'com.travelease.driver/.MainActivity');
      await sleep(5000);

      // Screenshot
      console.log('   Taking screenshot...');
      adb('-s', EMULATOR, 'shell', 'screencap', '-p', '/sdcard/drv_otp.png');
      await sleep(1000);
      const pullRes = adb('-s', EMULATOR, 'pull', '/sdcard/drv_otp.png',
        'e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\driver_emulator_screen.png');
      console.log('   Screenshot pull:', (pullRes.stdout + pullRes.stderr).trim());
    } else {
      console.log('   ❌ Emulator install failed');
    }
  } else {
    console.log('[4] Emulator not responding:', (emuAlive.stdout + emuAlive.stderr).trim());
  }

  // Step 5: Physical device
  await sleep(1000);
  const physAlive = adb('-s', PHYSICAL, 'shell', 'echo', 'alive');
  if (physAlive.stdout.includes('alive')) {
    console.log('[5] Physical device ONLINE. Installing...');
    const instRes = adb('-s', PHYSICAL, 'install', '-r', APK);
    const out = (instRes.stdout + instRes.stderr);
    console.log('   Result:', out.trim());
    if (out.includes('Success')) {
      console.log('   ✅ INSTALLED on physical device!');
      adb('-s', PHYSICAL, 'shell', 'am', 'start', '-n', 'com.travelease.driver/.MainActivity');
    } else {
      // Try push + pm
      console.log('   Trying push+pm for physical...');
      adb('-s', PHYSICAL, 'push', APK, '/data/local/tmp/DriverApp.apk');
      const pmR = adb('-s', PHYSICAL, 'shell', 'pm', 'install', '-r', '/data/local/tmp/DriverApp.apk');
      console.log('   PM result:', (pmR.stdout + pmR.stderr).trim());
    }
  } else {
    console.log('[5] Physical device', PHYSICAL, 'is OFFLINE. USB connection issue.');
    console.log('    → Please unplug/replug USB cable and re-run this script.');
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
