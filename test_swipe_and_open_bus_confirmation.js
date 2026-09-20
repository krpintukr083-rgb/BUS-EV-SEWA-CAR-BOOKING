const { execSync } = require('child_process');
const path = require('path');

const dev = '10BG5J1H8M002R3';

function run() {
  console.log('Swiping ScrollView on DashboardScreen...');
  execSync(`adb -s ${dev} shell input swipe 500 1000 500 300`);
  setTimeout(() => {
    // Tap Bus Confirm card (x=810, y=1000 when scrolled up)
    console.log('Tapping Bus Confirm card...');
    execSync(`adb -s ${dev} shell input tap 810 1000`);
    setTimeout(() => {
      const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
      const outPath = path.join(artifactDir, 'driver_app_bus_confirmation_OPEN_REAL.png');
      execSync(`adb -s ${dev} shell screencap -p /sdcard/screen.png`);
      execSync(`adb -s ${dev} pull /sdcard/screen.png "${outPath}"`);
      console.log(`REAL BUS CONFIRMATION SCREENSHOT: ${outPath}`);
    }, 3000);
  }, 1000);
}

run();
