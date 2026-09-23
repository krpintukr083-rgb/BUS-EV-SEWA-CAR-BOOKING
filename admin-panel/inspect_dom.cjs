const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Go to the local preview server
    await page.goto('http://localhost:3001/admin', { waitUntil: 'networkidle0' });
    
    // Inject fake token
    await page.evaluate(() => {
      localStorage.setItem('admin_token', 'fake_token');
      localStorage.setItem('admin_user', JSON.stringify({ name: 'Admin', role: 'superadmin' }));
    });
    
    // Reload the page
    await page.goto('http://localhost:3001/admin', { waitUntil: 'networkidle0' });
    
    // Wait for drivers to load or timeout
    try {
      await page.waitForSelector('.content-card', { timeout: 3000 });
      // Click on the first driver to set selectedDriver
      await page.evaluate(() => {
        const drivers = document.querySelectorAll('.content-card > div > div > div');
        if (drivers.length > 2) { // Just grab something clickable
            drivers[1].click();
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch(e) {}
    
    const html = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('dom_snapshot.html', html);
    
    await browser.close();
    console.log('DOM snapshot saved.');
  } catch (err) {
    console.error(err);
  }
})();
