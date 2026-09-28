const axios = require('axios');

async function testAll() {
  console.log('Testing locally...');
  const baseUrl = 'http://localhost:5000/api';
  
  try {
    const r1 = await axios.post(`${baseUrl}/auth/login`, { identifier: 'priya.nair@example.com', password: 'user123', role: 'customer' });
    console.log('Customer login:', r1.data.success ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('Customer login:', e.response?.data?.message || e.message);
  }

  try {
    const r2 = await axios.post(`${baseUrl}/auth/login`, { identifier: 'harsh.driver@platform.com', password: 'user123', role: 'customer' });
    console.log('Wrong role:', r2.data.success ? 'FAIL' : 'PASS');
  } catch (e) {
    console.log('Wrong role:', e.response?.data?.message || e.message);
  }

  try {
    const r3 = await axios.post(`${baseUrl}/auth/login`, { identifier: 'harsh.driver@platform.com', password: 'user123', role: 'driver' });
    console.log('Driver login:', r3.data.success ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('Driver login:', e.response?.data?.message || e.message);
  }

  try {
    const r4 = await axios.post(`${baseUrl}/auth/login`, { identifier: 'priya.nair@example.com', password: 'wrongpassword', role: 'customer' });
    console.log('Invalid password:', r4.data.success ? 'FAIL' : 'PASS');
  } catch (e) {
    console.log('Invalid password:', e.response?.data?.message || e.message);
  }
}

testAll();
