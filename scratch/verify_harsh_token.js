const http = require('https');

function apiRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'bus-ev-sewa-car-booking.onrender.com',
      port: 443,
      path: '/api' + path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch(e) {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function verify() {
  try {
    const res = await apiRequest('/auth/login', {
      identifier: 'harsh.driver@platform.com',
      password: 'driver123',
      role: 'driver'
    });
    
    if (res.status === 200 && res.data.success) {
      const driver = res.data.user || res.data.driver;
      console.log('--- HARSH PROFILE ---');
      console.log('Name:', driver.name);
      console.log('Expo Push Token:', driver.pushToken || driver.expoPushToken);
      console.log('FCM Token:', driver.fcmToken);
      console.log('---------------------');
    } else {
      console.error('Login Failed', res);
    }
  } catch(e) {
    console.error('Error', e);
  }
}
verify();
