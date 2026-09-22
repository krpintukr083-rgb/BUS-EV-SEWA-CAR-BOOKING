const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
const DEVICE_ID = 'emulator-5554';
const ARTIFACT_DIR = 'C:\\Users\\harsh_33xna20\\.gemini\\antigravity-ide\\brain\\36aa31c5-ea9b-4abd-894f-0928a3a8adbc';

function adbExec(cmd) {
  try {
    return execSync(`cmd /c "adb -s ${DEVICE_ID} ${cmd}"`, { encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    return err.stdout || err.message || '';
  }
}

function captureScreenshot(filename) {
  const localPath = path.join(__dirname, filename);
  const targetPath = path.join(ARTIFACT_DIR, filename);
  adbExec(`shell screencap -p /sdcard/${filename}`);
  adbExec(`pull /sdcard/${filename} "${localPath}"`);
  if (fs.existsSync(localPath)) {
    fs.copyFileSync(localPath, targetPath);
    console.log(`   📸 Screenshot saved: ${filename}`);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('====================================================');
  console.log('VERIFYING VEHICLE TAX EXPIRY DATE LABEL & KYC FLOW');
  console.log('====================================================');

  // 1. Bring Driver App to foreground
  console.log('1. Launching Driver App on emulator...');
  adbExec('shell am start -n com.anonymous.driverapp/.MainActivity');
  await sleep(3000);

  // Reload JS bundle so the latest code change is loaded in Expo/Metro
  console.log('2. Reloading app bundle...');
  adbExec('shell input keyevent 82'); // Menu
  await sleep(800);
  adbExec('shell input tap 540 1800'); // Tap Reload if menu open, or keyevent 'r' 'r'
  adbExec('shell input text "rr"');
  await sleep(3000);

  // Navigate to Dashboard tab (bottom left)
  console.log('3. Navigating to Dashboard...');
  adbExec('shell input tap 100 2310');
  await sleep(1500);

  // Tap "KYC Docs" button on Dashboard (around x=280, y=1840)
  console.log('4. Tapping KYC Docs button...');
  adbExec('shell input tap 280 1840');
  await sleep(2000);
  captureScreenshot('kyc_documents_list_screen.png');

  // Find Vehicle RC item in the KYC list and tap it to open modal
  // Vehicle RC is typically the 3rd document in the list (around y=820)
  console.log('5. Tapping Vehicle Registration Certificate (Blue Book / RC)...');
  adbExec('shell input tap 540 820');
  await sleep(1500);

  // Capture Screenshot of the DocumentUploadModal for Vehicle RC
  console.log('6. Capturing modal screenshot...');
  captureScreenshot('vehicle_rc_tax_expiry_modal.png');

  // 7. Verify API submission with tax expiry date
  console.log('7. Verifying KYC Document Upload API submission with Tax Expiry Date...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'harsh.driver@platform.com', password: 'driver123', role: 'driver' })
  });
  const loginData = await loginRes.json();
  const driverToken = loginData.data?.token || loginData.token;

  if (driverToken) {
    const testDocNumber = `RC-TAX-${Date.now().toString().slice(-6)}`;
    const testVehicleNumber = 'DL 01 AB 4321';
    const testTaxExpiryDate = '2029-06-30';

    const uploadRes = await fetch(`${BASE_URL}/driver/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${driverToken}`
      },
      body: JSON.stringify({
        docType: 'vehicleRegistration',
        documentNumber: testDocNumber,
        vehicleNumber: testVehicleNumber,
        expiryDate: testTaxExpiryDate,
        documentUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957'
      })
    });

    const uploadData = await uploadRes.json();
    console.log('   Upload API Response:', JSON.stringify(uploadData, null, 2));

    // Verify driver profile KYC document status
    const profRes = await fetch(`${BASE_URL}/driver/profile`, {
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    const profData = await profRes.json();
    const driverDoc = profData.data?.driver || profData.data || {};
    console.log('   Driver RC Status in Profile:', {
      rcNumber: driverDoc.rcNumber,
      rcStatus: driverDoc.rcStatus,
      rcExpiryDate: driverDoc.rcExpiryDate || driverDoc.rcExpiry
    });
  }

  console.log('\n====================================================');
  console.log('VERIFICATION COMPLETE');
  console.log('====================================================');
}

main().catch(console.error);
