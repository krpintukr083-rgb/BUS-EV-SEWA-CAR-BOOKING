const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('bus instant - customer to driver e2e', async ({ browser }) => {
  const context = await browser.newContext();
  const customerPage = await context.newPage();
  const driverPage = await context.newPage();

  // Test Customer Web
  console.log('Navigating to Customer Web...');
  await customerPage.goto('http://localhost:8085');

  console.log('Attempting Customer Login...');
  try {
      await customerPage.getByPlaceholder('name@example.com').fill('test_customer@example.com');
      await customerPage.getByPlaceholder('Enter password').fill('password123');
      await customerPage.getByText('Login', { exact: true }).click();
      await customerPage.waitForTimeout(3000);
  } catch(e) {
      console.log('Customer Login Failed (Selector not found)');
      throw e;
  }
});
