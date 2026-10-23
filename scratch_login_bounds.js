const { execSync } = require('child_process');
const ADB = 'C:\\Users\\harsh_33xna20\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe -s emulator-5554';

function run(cmd) {
  return execSync(`${ADB} ${cmd}`, { encoding: 'utf8' });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function loginExactBounds() {
  console.log('1. Tap email field (bounds [211,1144][940,1258] -> center 540, 1200)...');
  run('shell input tap 540 1200');
  await sleep(600);

  console.log('2. Type username...');
  run('shell input text "harsh.driver@platform.com"');
  await sleep(800);

  console.log('3. Tap password field (bounds [211,1364][859,1478] -> center 500, 1420)...');
  run('shell input tap 500 1420');
  await sleep(600);

  console.log('4. Type password...');
  run('shell input text "driver123"');
  await sleep(800);

  console.log('5. Hide keyboard...');
  run('shell input keyevent 111');
  await sleep(600);

  console.log('6. Tap Driver Login (bounds [108,1544][972,1672] -> center 540, 1608)...');
  run('shell input tap 540 1608');
  await sleep(6000);

  console.log('7. Screencap result...');
  run('shell screencap -p /sdcard/driver_home_dashboard.png');
  run('pull /sdcard/driver_home_dashboard.png "e:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\driver_home_dashboard.png"');
  console.log('Done!');
}

loginExactBounds().catch(console.error);
