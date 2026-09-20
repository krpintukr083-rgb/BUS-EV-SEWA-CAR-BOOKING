const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ADB = '"C:\\Users\\harsh_33xna20\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe"';
const srcApk = 'e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\driver-app\\android\\app\\build\\outputs\\apk\\release\\app-release.apk';
const dest1 = 'e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\release-apks\\DriverApp-release.apk';
const dest2 = 'e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\driver-release.apk';

console.log('Copying fresh Driver APK...');
fs.copyFileSync(srcApk, dest1);
fs.copyFileSync(srcApk, dest2);
console.log('APK copied successfully.');

const devices = ['10BG5J1H8M002R3', 'emulator-5554'];

for (const dev of devices) {
  try {
    console.log(`Installing fresh Driver APK on ${dev}...`);
    execSync(`${ADB} -s ${dev} install -r "${dest1}"`);
    console.log(`Installed successfully on ${dev}`);
  } catch (e) {
    console.error(`Failed install on ${dev}: ${e.message}`);
  }
}
