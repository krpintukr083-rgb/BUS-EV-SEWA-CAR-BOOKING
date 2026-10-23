const { execSync } = require('child_process');
const ADB = 'C:\\Users\\harsh_33xna20\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe -s emulator-5554';

function run(cmd) {
  return execSync(`${ADB} ${cmd}`, { encoding: 'utf8' });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function loginExact() {
  console.log('1. Tap Email input (540, 1170)...');
  run('shell input tap 540 1170');
  await sleep(600);

  console.log('2. Select all and clear...');
  // Move to end, then backspace 60 times
  run('shell input keyevent 123'); // KEYCODE_MOVE_END
  for (let i = 0; i < 60; i++) {
    run('shell input keyevent 67'); // KEYCODE_DEL
  }
  await sleep(400);

  console.log('3. Typing username...');
  run('shell input text "harsh.driver@platform.com"');
  await sleep(600);

  console.log('4. Tap Password input (540, 1390)...');
  run('shell input tap 540 1390');
  await sleep(600);

  console.log('5. Clear password...');
  run('shell input keyevent 123');
  for (let i = 0; i < 40; i++) {
    run('shell input keyevent 67');
  }
  await sleep(400);

  console.log('6. Typing password...');
  run('shell input text "driver123"');
  await sleep(600);

  console.log('7. Hide keyboard...');
  run('shell input keyevent 111'); // KEYCODE_ESCAPE
  await sleep(600);

  console.log('8. Tap Driver Login (540, 1575)...');
  run('shell input tap 540 1575');
  await sleep(6000);

  console.log('9. Capture screen...');
  run('shell screencap -p /sdcard/driver_home_success.png');
  run('pull /sdcard/driver_home_success.png "e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\driver_home_success.png"');
  console.log('Done!');
}

loginExact().catch(console.error);
