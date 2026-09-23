const http = require('https');

function apiRequest(path, options) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'bus-ev-sewa-car-booking.onrender.com',
      port: 443,
      path: '/api' + path,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    let postData;
    if (options.body) {
      postData = options.body;
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
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

const USED_SEATS = new Set();
function getRandomSeat() {
  let seat;
  do {
    const row = Math.floor(Math.random() * 10) + 1;
    const col = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
    seat = `${row}${col}`;
  } while (USED_SEATS.has(seat));
  USED_SEATS.add(seat);
  return seat;
}

async function createFreshBooking(custToken, vehicleId) {
  const seat = getRandomSeat();
  const res = await apiRequest('/customer/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${custToken}` },
    body: JSON.stringify({
      vehicleId,
      serviceType: 'Bus',
      pickup: 'Delhi',
      dropoff: 'Jaipur',
      pickupLocation: 'ISBT Kashmiri Gate, Delhi',
      dropLocation: 'Sindhi Camp, Jaipur',
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      passengers: 1,
      seatNumber: [seat],
      fare: 500,
      driverPaymentAmount: 450
    })
  });
  console.log('Booking response:', res.status, res.data.booking ? res.data.booking.bookingId : res.data);
}

async function main() {
  const custAuth = await apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'priya.nair@example.com', password: 'user123', role: 'customer' })
  });
  const custToken = custAuth.data.token;

  const vRes = await apiRequest('/vehicles', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
  const vehicles = vRes.data.data || vRes.data || [];
  const harshBus = vehicles.find(v => v.vehicleNumber === 'DL 01 AB 4321') || vehicles[0];

  await createFreshBooking(custToken, harshBus._id);
}
main();
