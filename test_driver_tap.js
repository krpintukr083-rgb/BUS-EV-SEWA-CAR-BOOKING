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
  
  console.log('Tapping password input at (540, 1478)...');
  run(`adb -s ${device} shell input tap 540 1478`);
  await sleep(600);
  
  console.log('Typing password...');
  run(`adb -s ${device} shell input text "driver123"`);
  await sleep(600);
  
  console.log('Hiding keyboard...');
  run(`adb -s ${device} shell input keyevent 111`);
  await sleep(600);
  
  console.log('Tapping login button at (540, 1675)...');
  run(`adb -s ${device} shell input tap 540 1675`);
  await sleep(4000);
  
  console.log('Dumping screen & UI...');
  run(`adb -s ${device} exec-out screencap -p > driver_dash_after_login.png`);
  run(`adb -s ${device} shell uiautomator dump /sdcard/driver_dash_after_login.xml`);
  run(`adb -s ${device} pull /sdcard/driver_dash_after_login.xml driver_dash_after_login.xml`);
  console.log('Done!');
}

main().catch(console.error);
