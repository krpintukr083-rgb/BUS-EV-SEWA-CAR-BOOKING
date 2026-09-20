const { execSync } = require('child_process');
const path = require('path');

const dev = '10BG5J1H8M002R3';

function run() {
  console.log('Scrolling down to Quick Operations...');
  execSync(`adb -s ${dev} shell input swipe 500 1400 500 200`);
  setTimeout(() => {
    const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
    const outPath = path.join(artifactDir, 'driver_app_scrolled_quick_ops.png');
    execSync(`adb -s ${dev} shell screencap -p /sdcard/screen.png`);
    execSync(`adb -s ${dev} pull /sdcard/screen.png "${outPath}"`);
    console.log(`Saved screenshot to: ${outPath}`);
  }, 1500);
}

run();
