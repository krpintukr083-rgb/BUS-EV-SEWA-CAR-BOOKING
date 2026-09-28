const { execSync } = require('child_process');
const fs = require('fs');

const CUST = 'emulator-5554';
const DRIV = 'emulator-5556';

function sh(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString();
  } catch (e) {
    return e.stdout?.toString() || '';
  }
}

function dump(dev) {
  sh(`adb -s ${dev} shell uiautomator dump /sdcard/window_dump.xml`);
  sh(`adb -s ${dev} pull /sdcard/window_dump.xml dump_${dev}.xml`);
  return fs.readFileSync(`dump_${dev}.xml`, 'utf8');
}

function click(dev, text) {
  const xml = dump(dev);
  const m = xml.match(new RegExp(`(?:text|content-desc)="[^"]*${text}[^"]*"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, 'i'));
  if (m) {
    const x = Math.floor((parseInt(m[1]) + parseInt(m[3])) / 2);
    const y = Math.floor((parseInt(m[2]) + parseInt(m[4])) / 2);
    console.log(`[${dev}] Clicking "${text}" at ${x},${y}`);
    sh(`adb -s ${dev} shell input tap ${x} ${y}`);
    return true;
  }
  console.log(`[${dev}] Text "${text}" NOT FOUND`);
  return false;
}

function input(dev, text, val) {
  if (click(dev, text)) {
    sh(`ping 127.0.0.1 -n 2 > nul`);
    sh(`adb -s ${dev} shell input text "${val.replace(/ /g, '%s')}"`);
    sh(`adb -s ${dev} shell input keyevent 66`);
    return true;
  }
  return false;
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log("Starting Live E2E Emulator Test...");
  sh(`adb -s ${CUST} shell pm clear com.travelease.customer`);
  sh(`adb -s ${DRIV} shell pm clear com.travelease.driver`);
  
  sh(`adb -s ${CUST} shell monkey -p com.travelease.customer -c android.intent.category.LAUNCHER 1`);
  sh(`adb -s ${DRIV} shell monkey -p com.travelease.driver -c android.intent.category.LAUNCHER 1`);
  
  await wait(5000);
  
  console.log("Logging into Customer...");
  input(CUST, "name@example.com", "priya.nair@example.com");
  input(CUST, "Enter password", "user123");
  click(CUST, "Login");
  
  console.log("Logging into Driver...");
  input(DRIV, "name@example.com", "harsh.sharma@example.com");
  input(DRIV, "Enter password", "driver123");
  click(DRIV, "Login");
  
  await wait(5000);
  
  console.log("Customer: Creating Schedule Booking...");
  click(CUST, "Schedule Booking");
  await wait(3000);
  click(CUST, "Bus");
  await wait(3000);
  click(CUST, "Search Buses");
  await wait(3000);
  click(CUST, "View Bus");
  await wait(3000);
  click(CUST, "Select Seat");
  await wait(3000);
  
  // Click a seat and continue
  const cXml = dump(CUST);
  // Find "03"
  const m = cXml.match(/text="03"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (m) {
    const x = Math.floor((parseInt(m[1]) + parseInt(m[3])) / 2);
    const y = Math.floor((parseInt(m[2]) + parseInt(m[4])) / 2);
    sh(`adb -s ${CUST} shell input tap ${x} ${y}`);
  }
  click(CUST, "Continue");
  await wait(3000);
  
  click(CUST, "Continue");
  await wait(3000);
  
  // Passenger details
  input(CUST, "e.g. Ramesh Kumar", "John");
  input(CUST, "9876543210", "9876543210");
  
  // Age input 25
  const cXml2 = dump(CUST);
  const mAge = cXml2.match(/text="e.g. 28"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (mAge) {
    const x = Math.floor((parseInt(mAge[1]) + parseInt(mAge[3])) / 2);
    const y = Math.floor((parseInt(mAge[2]) + parseInt(mAge[4])) / 2);
    sh(`adb -s ${CUST} shell input tap ${x} ${y}`);
    await wait(1000);
    sh(`adb -s ${CUST} shell input text "25"`);
    sh(`adb -s ${CUST} shell input keyevent 66`);
  }
  
  click(CUST, "Male");
  click(CUST, "Continue to Fare Summary");
  await wait(3000);
  
  click(CUST, "Confirm Booking");
  await wait(5000);
  
  // Get Booking ID!
  const finalXml = dump(CUST);
  const bidMatch = finalXml.match(/text="Booking ID:\s*(BK-\d+)"/);
  if (bidMatch) {
    console.log(`\n\nREAL BOOKING ID: ${bidMatch[1]}\n\n`);
  } else {
    console.log("Failed to find Booking ID. Here is dump:");
    const texts = [...finalXml.matchAll(/text="([^"]+)"/g)].map(x => x[1]).filter(x => x);
    console.log(texts.slice(0, 30));
  }
  
  console.log("Driver: Checking for Request...");
  const dXml = dump(DRIV);
  if (bidMatch && dXml.includes(bidMatch[1])) {
    console.log("Booking found in Driver App!");
  } else {
    console.log("Driver App did not find booking.");
  }
  
  console.log("Done.");
}

run();
