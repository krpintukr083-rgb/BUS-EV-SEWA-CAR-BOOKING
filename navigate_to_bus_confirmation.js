const { execSync } = require('child_process');
const path = require('path');

const dev = '10BG5J1H8M002R3';

function adb(cmd) {
  try {
    return execSync(`adb -s ${dev} ${cmd}`).toString();
  } catch(e) {
    return '';
  }
}

async function run() {
  console.log('Navigating to Bus Confirmation Screen...');

  // Ensure awake
  adb('shell settings put system screen_off_timeout 600000');
  adb('shell input keyevent 224');
  adb('shell input keyevent 82');

  // Relaunch app cleanly to Dashboard
  adb('shell am force-stop com.travelease.driver');
  await new Promise(r => setTimeout(r, 1000));
  adb('shell am start -n com.travelease.driver/.MainActivity');
  await new Promise(r => setTimeout(r, 4000));

  // Scroll down slightly
  adb('shell input swipe 500 1500 500 800');
  await new Promise(r => setTimeout(r, 1000));

  // Tap "Bus Confirm" button (2nd icon in Quick Operations grid)
  console.log('Tapping Bus Confirm button...');
  adb('shell input tap 750 1450');
  await new Promise(r => setTimeout(r, 3000));

  const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
  const outPath = path.join(artifactDir, 'driver_app_bus_confirmation_open.png');
  adb('shell screencap -p /sdcard/screen.png');
  adb(`pull /sdcard/screen.png "${outPath}"`);
  console.log(`Saved screenshot to: ${outPath}`);
}

run();
