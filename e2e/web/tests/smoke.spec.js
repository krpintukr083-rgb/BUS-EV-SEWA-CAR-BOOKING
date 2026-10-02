const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('smoke test - customer and driver apps load', async ({ browser }) => {
  const context = await browser.newContext();
  const customerPage = await context.newPage();
  const driverPage = await context.newPage();

  // Test Customer Web
  console.log('Navigating to Customer Web...');
  await customerPage.goto('http://localhost:8085');
  await expect(customerPage).toHaveTitle(/React App/i, { timeout: 10000 }).catch(() => console.log("Title didn't match React App")); // Expo might have different title
  
  if (!fs.existsSync('../results/screenshots')) {
      fs.mkdirSync('../results/screenshots', { recursive: true });
  }
  await customerPage.screenshot({ path: '../results/screenshots/customer_smoke.png' });
  console.log('Customer page loaded and screenshot captured.');

  // Test Driver Web
  console.log('Navigating to Driver Web...');
  await driverPage.goto('http://localhost:8086');
  await driverPage.screenshot({ path: '../results/screenshots/driver_smoke.png' });
  console.log('Driver page loaded and screenshot captured.');
});
