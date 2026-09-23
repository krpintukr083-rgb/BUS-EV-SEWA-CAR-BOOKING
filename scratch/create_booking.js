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

async function createBooking() {
  try {
    const login = await apiRequest('/auth/login', 'POST', { identifier: 'priya.nair@example.com', password: 'user123', role: 'customer' });
    const token = login.data.token;
    
    // search vehicle
    const vehiclesRes = await apiRequest('/vehicles', 'GET', null, null);
    const vehicles = vehiclesRes.data.data || vehiclesRes.data || [];
    const harshBus = vehicles.find(v => v.vehicleNumber === 'DL 01 AB 4321') || vehicles[0];
    
    const seatNumber = `TEST-${Math.floor(Math.random()*1000)}`;
    const bookingData = {
      vehicleId: harshBus._id,
      serviceType: 'Bus',
      pickup: 'Delhi',
      dropoff: 'Jaipur',
      passengers: 1,
      seatNumber: [seatNumber]
    };
    
    const res = await apiRequest('/customer/bookings', 'POST', bookingData, token);
    console.log('Booking response:', res.status, res.data.booking ? res.data.booking.bookingId : res.data);
  } catch(e) {
    console.error(e);
  }
}
createBooking();
