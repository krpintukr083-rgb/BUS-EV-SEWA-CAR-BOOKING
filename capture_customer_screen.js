const { spawnSync } = require('child_process');
const fs = require('fs');

const ADB = 'C:\\Users\\harsh_33xna20\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';

function adb(...args) {
  const res = spawnSync(ADB, ['-s', 'emulator-5554', ...args], { encoding: 'utf8', timeout: 30000 });
  return res.stdout || res.stderr || '';
}

console.log('1. Checking screen state...');
adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
adb('shell', 'input', 'keyevent', '82'); // unlock

console.log('2. Starting Customer App...');
const startOut = adb('shell', 'am', 'start', '-n', 'com.travelease.customer/.MainActivity');
console.log('Start output:', startOut);

console.log('3. Waiting 6 seconds...');
spawnSync('timeout', ['/t', '6', '/nobreak'], { shell: true });

console.log('4. Taking screenshot...');
adb('shell', 'screencap', '-p', '/sdcard/cust_screen.png');
adb('pull', '/sdcard/cust_screen.png', 'e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\cust_screen.png');
console.log('Screenshot pulled to cust_screen.png');
