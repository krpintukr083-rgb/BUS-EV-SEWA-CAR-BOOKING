const { execSync } = require('child_process');
const path = require('path');

const dev = '10BG5J1H8M002R3';

function run() {
  console.log('Scroll to top and tap Bus Confirm...');
  // Scroll to top
  execSync(`adb -s ${dev} shell input swipe 500 300 500 1800`);
  setTimeout(() => {
    // Tap Bus Confirm (x=810, y=1440 on clean top dashboard)
    console.log('Tapping Bus Confirm at x=810, y=1440...');
    execSync(`adb -s ${dev} shell input tap 810 1440`);
    setTimeout(() => {
      const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
      const outPath = path.join(artifactDir, 'driver_app_bus_confirmation_LIVE_SCREEN.png');
      execSync(`adb -s ${dev} shell screencap -p /sdcard/screen.png`);
      execSync(`adb -s ${dev} pull /sdcard/screen.png "${outPath}"`);
      console.log(`LIVE BUS CONFIRMATION SCREENSHOT SAVED: ${outPath}`);
    }, 3000);
  }, 1000);
}

run();
