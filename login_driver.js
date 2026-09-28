const { execSync } = require('child_process');

function run(cmd) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { encoding: 'utf-8' });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const device = 'emulator-5556';
  
  console.log('1. Focus on Identifier input...');
  run(`adb -s ${device} shell input tap 540 1236`);
  await sleep(600);
  
  run(`adb -s ${device} shell input keyevent 123`);
  for (let i = 0; i < 40; i++) {
    run(`adb -s ${device} shell input keyevent 67`);
  }
  await sleep(300);
  
  console.log('2. Type identifier: harsh.driver@platform.com');
  run(`adb -s ${device} shell input text "harsh.driver@platform.com"`);
  await sleep(600);

  console.log('3. Focus on Password input...');
  run(`adb -s ${device} shell input tap 540 1478`);
  await sleep(600);

  for (let i = 0; i < 25; i++) {
    run(`adb -s ${device} shell input keyevent 67`);
  }
  await sleep(300);

  console.log('4. Type password: driver123');
  run(`adb -s ${device} shell input text "driver123"`);
  await sleep(600);

  // Close keyboard
  run(`adb -s ${device} shell input keyevent 111`);
  await sleep(500);

  console.log('5. Tap Driver Login button (540, 1675)...');
  run(`adb -s ${device} shell input tap 540 1675`);

  console.log('Waiting for login...');
  await sleep(4000);

  console.log('6. Capture driver screen & UI...');
  run(`adb -s ${device} exec-out screencap -p > driver_logged_in_now.png`);
  run(`adb -s ${device} shell uiautomator dump /sdcard/driver_logged_in.xml`);
  run(`adb -s ${device} pull /sdcard/driver_logged_in.xml driver_logged_in.xml`);

  console.log('Done driver login!');
}

main().catch(console.error);
