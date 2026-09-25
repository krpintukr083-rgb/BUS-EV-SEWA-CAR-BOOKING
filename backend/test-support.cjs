const axios = require('axios');

async function testSupport() {
  try {
    const loginRes = await axios.post('https://bus-ev-sewa-car-booking.onrender.com/api/auth/login', {
      identifier: 'harsh.driver@platform.com',
      password: 'driver123',
      role: 'driver'
    });
    
    const token = loginRes.data.token;
    console.log('Logged in successfully');

    const supportRes = await axios.post('https://bus-ev-sewa-car-booking.onrender.com/api/driver/support/ticket', {
      category: 'Vehicle Issue',
      subject: 'Test issue',
      supportIssue: 'Vehicle related support problem'
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Support Ticket Success:', supportRes.data);
  } catch (error) {
    if (error.response) {
      console.log('Support Ticket Failed:', error.response.status, JSON.stringify(error.response.data));
    } else {
      console.log('Support Ticket Error:', error.message);
    }
  }
}
testSupport();
