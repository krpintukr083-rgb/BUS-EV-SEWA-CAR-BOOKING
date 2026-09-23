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

async function checkBookings() {
  try {
    const login = await apiRequest('/auth/login', 'POST', { identifier: 'admin@platform.com', password: 'admin123', role: 'admin' });
    const token = login.data.token;
    
    // get recent bookings
    const bookingsRes = await apiRequest('/admin/bookings?limit=5', 'GET', null, token);
    const bookings = bookingsRes.data.data || bookingsRes.data;
    
    if (Array.isArray(bookings)) {
      bookings.forEach(b => {
        console.log(`Booking ID: ${b.bookingId || b._id} | Route: ${b.pickup} -> ${b.dropoff} | Status: ${b.status} | CreatedAt: ${b.createdAt}`);
      });
    } else {
      console.log('No recent bookings or unexpected format:', bookings);
    }
  } catch(e) {
    console.error(e);
  }
}
checkBookings();
