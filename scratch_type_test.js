const { execSync } = require('child_process');
const ADB = 'C:\\Users\\harsh_33xna20\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe -s emulator-5554';

function run(cmd) {
  return execSync(`${ADB} ${cmd}`, { encoding: 'utf8' });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function test() {
  console.log('1. Tap email field (540, 1170)...');
  run('shell input tap 540 1170');
  await sleep(600);
  
  console.log('2. Type text directly...');
  run('shell input text "harsh.driver@platform.com"');
  await sleep(800);

  console.log('3. Tap password field (540, 1390)...');
  run('shell input tap 540 1390');
  await sleep(600);

  console.log('4. Type password directly...');
  run('shell input text "driver123"');
  await sleep(800);

  console.log('5. Screencap inputs...');
  run('shell screencap -p /sdcard/inputs_filled.png');
  run('pull /sdcard/inputs_filled.png "e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\inputs_filled.png"');

  console.log('6. Hide keyboard...');
  run('shell input keyevent 111');
  await sleep(600);

  console.log('7. Tap Driver Login (540, 1575)...');
  run('shell input tap 540 1575');
  await sleep(6000);

  console.log('8. Screencap result...');
  run('shell screencap -p /sdcard/driver_result.png');
  run('pull /sdcard/driver_result.png "e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\driver_result.png"');
  console.log('Finished test!');
}

test().catch(console.error);
