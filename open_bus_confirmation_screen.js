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
  console.log('Navigating physical device to Customer OTP UI...');
  
  // Hide keyboard
  adb('shell input keyevent 4');
  await new Promise(r => setTimeout(r, 500));

  // Tap header back to main dashboard if needed
  adb('shell input tap 80 75');
  await new Promise(r => setTimeout(r, 1000));

  // Open Bus Confirmation screen directly via menu / tab / back
  adb('shell input tap 500 440'); // tap banner
  await new Promise(r => setTimeout(r, 2000));

  const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
  const outPath = path.join(artifactDir, 'driver_app_otp_live_open_physical.png');
  adb('shell screencap -p /sdcard/screen.png');
  adb(`pull /sdcard/screen.png "${outPath}"`);
  console.log(`Saved screenshot to: ${outPath}`);
}

run();
