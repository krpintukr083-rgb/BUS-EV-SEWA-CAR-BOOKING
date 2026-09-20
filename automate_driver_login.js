const { execSync } = require('child_process');
const path = require('path');

const dev = '10BG5J1H8M002R3';

function adb(cmd) {
  try {
    return execSync(`adb -s ${dev} ${cmd}`).toString();
  } catch (e) {
    console.error(`ADB err: ${e.message}`);
    return '';
  }
}

async function run() {
  console.log('Automating login on physical device...');
  adb('shell input keyevent 224'); // Wake
  adb('shell input keyevent 82');  // Unlock

  // Relaunch app
  adb('shell am force-stop com.travelease.driver');
  await new Promise(r => setTimeout(r, 1000));
  adb('shell am start -n com.travelease.driver/.MainActivity');
  await new Promise(r => setTimeout(r, 4000));

  // Get screen bounds via dumpsys or tap directly
  // Email input area
  console.log('Tapping email field...');
  adb('shell input tap 540 960');
  await new Promise(r => setTimeout(r, 500));
  adb('shell input text "driver@platform.com"');
  await new Promise(r => setTimeout(r, 500));

  // Password input area
  console.log('Tapping password field...');
  adb('shell input tap 540 1180');
  await new Promise(r => setTimeout(r, 500));
  adb('shell input text "driver123"');
  await new Promise(r => setTimeout(r, 500));

  // Tap Login button
  console.log('Tapping login button...');
  adb('shell input tap 540 1340');
  await new Promise(r => setTimeout(r, 4000));

  // Take screenshot
  const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
  const outPath = path.join(artifactDir, 'driver_app_physical_logged_in.png');
  adb('shell screencap -p /sdcard/screen.png');
  adb(`pull /sdcard/screen.png "${outPath}"`);
  console.log(`Screenshot saved to: ${outPath}`);
}

run();
