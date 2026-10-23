const { chromium } = require('playwright');

async function testOtpVerificationScreen(width, height, label) {
  console.log(`\n========================================`);
  console.log(`Testing OTP Verification UI on ${label} (${width}x${height})`);
  console.log(`========================================`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Login
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].fill('krpintukr083+driverreview@gmail.com');
    await inputs[1].fill('YatraDriver@Review26!');
  }

  await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const btn = all.find(d => {
      const text = (d.innerText || '').trim();
      return (text === 'Driver Login' || text === 'Login') && d.getAttribute('role') === 'button';
    }) || all.find(d => (d.innerText || '').trim() === 'Driver Login' && d.children.length === 0);
    if (btn) btn.click();
  });

  // Wait for Dashboard / Bottom Tabs to appear
  await page.waitForSelector('text=OTP Confirm', { timeout: 20000 });
  await page.waitForTimeout(1000);

  // Click on "OTP Confirm" bottom tab
  console.log('Navigating to OTP Confirm tab...');
  await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const tab = all.find(d => d.innerText && d.innerText.trim() === 'OTP Confirm');
    if (tab) tab.click();
  });

  await page.waitForTimeout(3000);

  // Capture screenshot of OTP screen
  await page.screenshot({ path: `otp_test_${width}_${height}.png` });
  console.log(`Saved otp_test_${width}_${height}.png`);

  // Measure card width and OTP box bounding rects
  const layoutMetrics = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    // Find card
    const card = all.find(d => d.innerText && d.innerText.includes('CUSTOMER OTP VERIFICATION'));
    const cardRect = card ? card.getBoundingClientRect() : null;

    // Find all inputs in the OTP section
    const otpInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'))
      .filter(input => {
        const rect = input.getBoundingClientRect();
        return rect.width > 20 && rect.width < 70 && rect.height > 30;
      })
      .map(input => {
        const r = input.getBoundingClientRect();
        return {
          left: r.left,
          right: r.right,
          width: r.width,
          height: r.height
        };
      });

    return {
      windowWidth: window.innerWidth,
      cardRect: cardRect ? { left: cardRect.left, right: cardRect.right, width: cardRect.width } : null,
      otpBoxesCount: otpInputs.length,
      boxes: otpInputs,
      allBoxesInsideCard: cardRect && otpInputs.length === 6 ? (
        otpInputs[0].left >= cardRect.left && otpInputs[5].right <= cardRect.right
      ) : false,
      allBoxesInsideScreen: otpInputs.length === 6 ? (
        otpInputs[0].left >= 0 && otpInputs[5].right <= window.innerWidth
      ) : false
    };
  });

  console.log(`[${label}] Metrics:`, JSON.stringify(layoutMetrics, null, 2));

  // Type sample OTP digits into the boxes
  const otpInputs = await page.$$('input[type="text"], input:not([type])');
  const visibleOtpInputs = [];
  for (const inp of otpInputs) {
    const box = await inp.boundingBox();
    if (box && box.width > 20 && box.width < 70 && box.height > 30) {
      visibleOtpInputs.push(inp);
    }
  }

  if (visibleOtpInputs.length >= 6) {
    console.log('Typing OTP digits 4-8-2-9-1-5...');
    await visibleOtpInputs[0].fill('4');
    await visibleOtpInputs[1].fill('8');
    await visibleOtpInputs[2].fill('2');
    await visibleOtpInputs[3].fill('9');
    await visibleOtpInputs[4].fill('1');
    await visibleOtpInputs[5].fill('5');
    await page.waitForTimeout(500);

    await page.screenshot({ path: `otp_test_${width}_${height}_filled.png` });
    console.log(`Saved otp_test_${width}_${height}_filled.png`);
  }

  await browser.close();
  return layoutMetrics;
}

(async () => {
  try {
    const res360 = await testOtpVerificationScreen(360, 800, '360x800 Mobile');
    const res320 = await testOtpVerificationScreen(320, 640, '320x640 Small Mobile');
    const res390 = await testOtpVerificationScreen(390, 844, '390x844 Wide Mobile');

    console.log('\n========================================');
    console.log('OTP INPUT OVERFLOW TEST SUMMARY');
    console.log('========================================');
    console.log('360x800 All Boxes Inside Card:', res360?.allBoxesInsideCard, '| Inside Screen:', res360?.allBoxesInsideScreen);
    console.log('320x640 All Boxes Inside Card:', res320?.allBoxesInsideCard, '| Inside Screen:', res320?.allBoxesInsideScreen);
    console.log('390x844 All Boxes Inside Card:', res390?.allBoxesInsideCard, '| Inside Screen:', res390?.allBoxesInsideScreen);
  } catch (err) {
    console.error('Error during OTP test:', err);
  }
})();
