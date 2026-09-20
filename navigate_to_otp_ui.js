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
  console.log('Navigating to active booking screen...');
  
  // Tap back arrow top left (x=80, y=75)
  adb('shell input tap 80 75');
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot after back
  let artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
  let outPath = path.join(artifactDir, 'driver_app_nav_step1.png');
  adb('shell screencap -p /sdcard/screen.png');
  adb(`pull /sdcard/screen.png "${outPath}"`);
  console.log(`Step 1 screenshot saved to: ${outPath}`);
}

run();
