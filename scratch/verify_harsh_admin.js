const http = require('https');

function apiRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'bus-ev-sewa-car-booking.onrender.com',
      port: 443,
      path: '/api' + path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    
    let postData;
    if (data) {
      postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

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
    if (postData) req.write(postData);
    req.end();
  });
}

async function verify() {
  try {
    const login = await apiRequest('/auth/login', 'POST', { identifier: 'admin@platform.com', password: 'admin123', role: 'admin' });
    const token = login.data.token;
    
    const drivers = await apiRequest('/admin/drivers?limit=100', 'GET', null, token);
    const harsh = drivers.data.data ? drivers.data.data.find(d => d.name === 'Harsh') : null;
    
    if (harsh) {
      console.log('--- HARSH DB PROFILE ---');
      console.log('Name:', harsh.name);
      console.log('Expo Push Token:', harsh.pushToken || harsh.expoPushToken || 'null');
      console.log('FCM Token:', harsh.fcmToken || 'null');
    } else {
      console.log('Could not find Harsh. Drivers available:', drivers.data.data ? drivers.data.data.map(d => d.name) : drivers.data);
    }
  } catch(e) {
    console.error(e);
  }
}
verify();
