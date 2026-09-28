const { execSync } = require('child_process');

function run(cmd) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { encoding: 'utf-8' });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const device = 'emulator-5554';

  console.log('1. Passenger Name...');
  run(`adb -s ${device} shell input tap 540 805`);
  await sleep(400);
  run(`adb -s ${device} shell input text "Harr%sSingh"`);
  await sleep(400);

  console.log('2. Mobile Number...');
  run(`adb -s ${device} shell input tap 540 1064`);
  await sleep(400);
  run(`adb -s ${device} shell input text "7839213379"`);
  await sleep(400);

  console.log('3. Age...');
  run(`adb -s ${device} shell input tap 263 1321`);
  await sleep(400);
  run(`adb -s ${device} shell input text "28"`);
  await sleep(400);

  console.log('4. Male option...');
  run(`adb -s ${device} shell input tap 593 1311`);
  await sleep(400);

  console.log('5. Close keyboard...');
  run(`adb -s ${device} shell input keyevent 111`);
  await sleep(400);

  console.log('6. Tap Continue to Fare Summary (540, 2234)...');
  run(`adb -s ${device} shell input tap 540 2234`);
  await sleep(3000);

  console.log('7. Capture screen & UI...');
  run(`adb -s ${device} exec-out screencap -p > cust_fare_screen.png`);
  run(`adb -s ${device} shell uiautomator dump /sdcard/cust_fare.xml`);
  run(`adb -s ${device} pull /sdcard/cust_fare.xml cust_fare.xml`);
  console.log('Done passenger entry!');
}

main().catch(console.error);
