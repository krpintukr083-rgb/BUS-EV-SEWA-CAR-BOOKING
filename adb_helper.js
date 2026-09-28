const { execSync } = require('child_process');
const fs = require('fs');

function clickText(device, text) {
  console.log(`Dumping UI on ${device} to look for "${text}"...`);
  execSync(`adb -s ${device} shell uiautomator dump /sdcard/window_dump.xml`);
  execSync(`adb -s ${device} pull /sdcard/window_dump.xml window_dump_${device}.xml`);
  
  const xml = fs.readFileSync(`window_dump_${device}.xml`, 'utf8');
  // Simple regex to find bounds for node with matching text or content-desc
  const regex = new RegExp(`(?:text|content-desc)="[^"]*${text}[^"]*"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, 'i');
  const match = xml.match(regex);
  if (match) {
    const x = Math.floor((parseInt(match[1]) + parseInt(match[3])) / 2);
    const y = Math.floor((parseInt(match[2]) + parseInt(match[4])) / 2);
    console.log(`Found "${text}" at (${x}, ${y}). Clicking...`);
    execSync(`adb -s ${device} shell input tap ${x} ${y}`);
    return true;
  }
  console.log(`Text "${text}" not found.`);
  return false;
}

function inputText(device, textId, value) {
  // Try to tap the field first
  if (clickText(device, textId)) {
    // Wait a bit for keyboard
    execSync('ping 127.0.0.1 -n 2 > nul');
    // Clear and input
    // Can't easily clear blindly, just send text
    console.log(`Inputting text into ${device}: ${value}`);
    execSync(`adb -s ${device} shell input text "${value.replace(/ /g, '%s')}"`);
    // Press Enter / Hide Keyboard
    execSync(`adb -s ${device} shell input keyevent 66`);
    return true;
  }
  return false;
}

function dump(device) {
  execSync(`adb -s ${device} shell uiautomator dump /sdcard/window_dump.xml`);
  execSync(`adb -s ${device} pull /sdcard/window_dump.xml window_dump_${device}.xml`);
  console.log(`Dumped ${device}`);
}

const action = process.argv[2];
const device = process.argv[3];
const arg1 = process.argv[4];
const arg2 = process.argv[5];

if (action === 'click') clickText(device, arg1);
if (action === 'input') inputText(device, arg1, arg2);
if (action === 'dump') dump(device);
