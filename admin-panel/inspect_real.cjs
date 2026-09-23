const puppeteer = require('puppeteer');
const https = require('https');
const fs = require('fs');

// Step 1: Get a real admin token from production
async function getToken() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ identifier: 'admin@platform.com', password: 'admin123', role: 'admin' });
    const req = https.request({
      hostname: 'bus-ev-sewa-car-booking.onrender.com',
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const j = JSON.parse(d);
        resolve({ token: j.token, user: j.user });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const { token, user } = await getToken();
  console.log('Got token:', !!token, 'User role:', user?.role);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Navigate to the admin panel and inject the real token
  await page.goto('http://localhost:4173/login', { waitUntil: 'networkidle0', timeout: 15000 });

  // Inject auth into localStorage
  await page.evaluate((tok, usr) => {
    localStorage.setItem('admin_token', tok);
    localStorage.setItem('admin_user', JSON.stringify(usr));
  }, token, user);

  // Navigate to driver-verification
  await page.goto('http://localhost:4173/driver-verification', { waitUntil: 'networkidle0', timeout: 20000 });

  // Wait for drivers to load
  await new Promise(r => setTimeout(r, 3000));

  // Check DOM before clicking
  const beforeClickState = await page.evaluate(() => {
    const vehicleImagesElements = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent.includes('Vehicle Images') && el.childElementCount < 5
    );
    return {
      vehicleImagesFound: vehicleImagesElements.length,
      vehicleImagesText: vehicleImagesElements.map(e => e.tagName + ':' + e.className),
      bodyHTML_size: document.body.innerHTML.length
    };
  });
  console.log('\nBEFORE clicking Harsh:', JSON.stringify(beforeClickState, null, 2));

  // Find and click "Harsh" in the driver list
  const harshClicked = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('div, span'));
    const harsh = allElements.find(el => el.textContent.trim() === 'Harsh' && el.children.length === 0);
    if (harsh) {
      harsh.click();
      return true;
    }
    // Try finding Harsh more broadly
    const harshParent = allElements.find(el => el.innerText && el.innerText.includes('Harsh') && !el.innerText.includes('Ayush'));
    if (harshParent) {
      harshParent.click();
      return 'broad click';
    }
    return false;
  });
  console.log('Harsh clicked:', harshClicked);

  await new Promise(r => setTimeout(r, 1500));

  // Check DOM after clicking
  const afterClickState = await page.evaluate(() => {
    const vehicleImagesElements = Array.from(document.querySelectorAll('*')).filter(el => 
      el.textContent && el.textContent.includes('Vehicle Images') && el.childElementCount < 5
    );
    const darkCards = Array.from(document.querySelectorAll('div')).filter(el => {
      const bg = el.style.backgroundColor;
      return bg === 'rgb(30, 41, 59)' || bg === '#1e293b';
    });
    return {
      vehicleImagesFound: vehicleImagesElements.length,
      vehicleImagesElements: vehicleImagesElements.map(e => ({
        tag: e.tagName, 
        class: e.className,
        text: e.textContent?.substring(0, 50),
        display: e.style.display,
        visibility: e.style.visibility,
        rect: e.getBoundingClientRect ? {
          top: Math.round(e.getBoundingClientRect().top),
          height: Math.round(e.getBoundingClientRect().height)
        } : null
      })),
      darkCards: darkCards.length,
      darkCardDetails: darkCards.map(e => ({
        text: e.textContent?.substring(0, 80),
        rect: { 
          top: Math.round(e.getBoundingClientRect().top),
          height: Math.round(e.getBoundingClientRect().height),
          bottom: Math.round(e.getBoundingClientRect().bottom)
        }
      })),
      pageHeight: document.documentElement.scrollHeight,
      windowHeight: window.innerHeight,
      selectedDriverName: document.querySelector('h3')?.textContent
    };
  });
  console.log('\nAFTER clicking Harsh:', JSON.stringify(afterClickState, null, 2));

  // Save full DOM
  const fullHTML = await page.evaluate(() => document.body.innerHTML);
  const vehicleSection = fullHTML.indexOf('Vehicle Images');
  console.log('\n"Vehicle Images" appears in HTML at position:', vehicleSection);
  if (vehicleSection > 0) {
    console.log('Context:', fullHTML.substring(vehicleSection - 100, vehicleSection + 500));
  }

  await browser.close();
})().catch(console.error);
