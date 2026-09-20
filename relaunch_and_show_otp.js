const { execSync } = require('child_process');
const path = require('path');

const dev = '10BG5J1H8M002R3';

function run() {
  console.log('Force stopping and restarting app on device...');
  execSync(`adb -s ${dev} shell am force-stop com.travelease.driver`);
  execSync(`adb -s ${dev} shell am start -n com.travelease.driver/.MainActivity`);
  
  // wait 5 seconds for root screen to render
  setTimeout(() => {
    const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
    const outPath = path.join(artifactDir, 'driver_app_restarted_fresh.png');
    execSync(`adb -s ${dev} shell screencap -p /sdcard/screen.png`);
    execSync(`adb -s ${dev} pull /sdcard/screen.png "${outPath}"`);
    console.log(`Fresh screenshot: ${outPath}`);
  }, 5000);
}

run();
