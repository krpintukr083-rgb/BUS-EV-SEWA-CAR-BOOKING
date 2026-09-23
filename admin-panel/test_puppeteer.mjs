import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Enable request interception to see exactly what is sent
  await page.setRequestInterception(true);
  
  page.on('request', request => {
    if (request.url().includes('/api/admin/banners')) {
      console.log('--- INTERCEPTED REQUEST TO /api/admin/banners ---');
      console.log('Method:', request.method());
      console.log('Headers:', request.headers());
      console.log('PostData:', request.postData());
    }
    request.continue();
  });

  // Navigate to local frontend
  console.log('Navigating to http://localhost:3001/banners');
  // Need to bypass login. We can inject localStorage token.
  await page.goto('http://localhost:3001');
  await page.evaluate(() => {
    localStorage.setItem('admin_token', 'fake_token');
    localStorage.setItem('admin_user', JSON.stringify({ role: 'admin' }));
  });
  
  await page.goto('http://localhost:3001/admin/banners'); // assuming the route is /admin/banners or something
  
  // Wait for the Add New Banner button
  try {
    await page.waitForSelector('button', { timeout: 3000 });
  } catch(e) {
    console.log('Could not find button, page content:', await page.content());
    await browser.close();
    process.exit(1);
  }
  
  // This might be complex because of exact selectors.
  
  await browser.close();
})();
