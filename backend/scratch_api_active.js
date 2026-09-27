const axios = require('axios');

async function checkApiActiveBookings() {
  try {
    // 1. Login to get token
    const loginRes = await axios.post('https://bus-ev-sewa-car-booking.onrender.com/api/auth/login', {
      identifier: '+919876500001', // Harsh's number
      password: 'password123',
      role: 'driver'
    });
    
    const token = loginRes.data.token;
    console.log('Logged in successfully, token:', token.substring(0, 20) + '...');
    
    // 2. Get active bookings
    const activeRes = await axios.get('https://bus-ev-sewa-car-booking.onrender.com/api/driver/active-bookings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const activeBookings = activeRes.data.data || [];
    console.log(`Found ${activeBookings.length} active bookings via API.`);
    for (const b of activeBookings) {
      console.log(`- ${b.bookingId} | Mode: ${b.bookingMode} | Status: ${b.bookingStatus}`);
    }
    
  } catch (error) {
    console.error('API Error:', error.response ? error.response.data : error.message);
  }
}

checkApiActiveBookings();
