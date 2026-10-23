const { execSync } = require('child_process');
const ADB = 'C:\\Users\\harsh_33xna20\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe -s emulator-5554';

function run(cmd) {
  return execSync(`${ADB} ${cmd}`, { encoding: 'utf8' });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fillAndLogin() {
  console.log('1. Clearing email field...');
  run('shell input tap 500 488');
  await sleep(500);
  run('shell input keyevent 123');
  for (let i = 0; i < 60; i++) run('shell input keyevent 67');
  await sleep(300);

  console.log('2. Entering email...');
  run('shell input text "harsh.driver@platform.com"');
  await sleep(500);

  console.log('3. Focusing password field...');
  run('shell input tap 500 580');
  await sleep(500);
  run('shell input keyevent 123');
  for (let i = 0; i < 30; i++) run('shell input keyevent 67');
  await sleep(300);

  console.log('4. Entering password...');
  run('shell input text "driver123"');
  await sleep(500);

  console.log('5. Hiding keyboard...');
  run('shell input keyevent 111');
  await sleep(600);

  console.log('6. Tapping Driver Login (540, 660)...');
  run('shell input tap 540 660');
  await sleep(6000);

  console.log('7. Capturing screen...');
  run('shell screencap -p /sdcard/driver_home_live.png');
  run('pull /sdcard/driver_home_live.png "e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\driver_home_live.png"');
  console.log('Done!');
}

fillAndLogin().catch(console.error);
