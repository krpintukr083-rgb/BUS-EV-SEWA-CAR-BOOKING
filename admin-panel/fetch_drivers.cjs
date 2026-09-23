const https = require('https');

const loginBody = JSON.stringify({ identifier: 'admin@platform.com', password: 'admin123', role: 'admin' });
const loginOpts = {
  hostname: 'bus-ev-sewa-car-booking.onrender.com',
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': loginBody.length }
};

const req = https.request(loginOpts, loginRes => {
  let d = '';
  loginRes.on('data', c => d += c);
  loginRes.on('end', () => {
    const j = JSON.parse(d);
    const token = j.token;
    if (!token) { console.error('NO TOKEN:', d); return; }

    // Fetch drivers
    const driversReq = https.request({
      hostname: 'bus-ev-sewa-car-booking.onrender.com',
      path: '/api/admin/drivers',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }, res => {
      let d2 = '';
      res.on('data', c => d2 += c);
      res.on('end', () => {
        console.log('\n=== DRIVERS API RESPONSE ===');
        console.log('STATUS:', res.statusCode);
        const r = JSON.parse(d2);
        console.log('TOP LEVEL KEYS:', Object.keys(r));
        console.log('r.success:', r.success);
        console.log('Array.isArray(r.data):', Array.isArray(r.data));
        console.log('Array.isArray(r):', Array.isArray(r));

        const list = Array.isArray(r.data) ? r.data : (Array.isArray(r) ? r : []);
        console.log('\nDRIVER COUNT:', list.length);

        list.forEach((driver, i) => {
          console.log(`\n--- Driver[${i}] ---`);
          console.log('name:', driver.name);
          console.log('_id:', driver._id);
          console.log('assignedVehicle type:', typeof driver.assignedVehicle);
          console.log('assignedVehicle value:', JSON.stringify(driver.assignedVehicle)?.substring(0, 300));
          if (driver.assignedVehicle && typeof driver.assignedVehicle === 'object') {
            console.log('assignedVehicle._id:', driver.assignedVehicle._id);
            console.log('vehicleImages:', JSON.stringify(driver.assignedVehicle.vehicleImages));
          }
        });
      });
    });
    driversReq.end();
  });
});
req.write(loginBody);
req.end();
