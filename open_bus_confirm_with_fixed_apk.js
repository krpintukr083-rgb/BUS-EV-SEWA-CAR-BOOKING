const { execSync } = require('child_process');
const path = require('path');

const dev = '10BG5J1H8M002R3';

function run() {
  console.log('Navigating to Bus Confirmation screen on fixed build...');
  execSync(`adb -s ${dev} shell input keyevent 4`); // close empty screen
  setTimeout(() => {
    // Scroll down to Quick Operations
    execSync(`adb -s ${dev} shell input swipe 500 1500 500 400`);
    setTimeout(() => {
      // Tap Bus Confirm card (x=750, y=1420 when scrolled)
      console.log('Tapping Bus Confirm card...');
      execSync(`adb -s ${dev} shell input tap 750 1420`);
      setTimeout(() => {
        const artifactDir = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\b0bbaf01-8acc-4d22-b462-bc724f7eb846';
        const outPath = path.join(artifactDir, 'driver_app_otp_card_FIXED_FINAL.png');
        execSync(`adb -s ${dev} shell screencap -p /sdcard/screen.png`);
        execSync(`adb -s ${dev} pull /sdcard/screen.png "${outPath}"`);
        console.log(`FIXED OTP CARD SCREENSHOT SAVED: ${outPath}`);
      }, 3000);
    }, 1500);
  }, 1000);
}

run();
