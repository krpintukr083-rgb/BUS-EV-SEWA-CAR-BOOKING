const axios = require('axios');
async function testLogin() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      identifier: 'priya.nair@example.com',
      password: 'user123',
      role: 'customer'
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
testLogin();
