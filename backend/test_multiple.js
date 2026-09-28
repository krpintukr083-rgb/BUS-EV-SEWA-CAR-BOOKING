const axios = require('axios');
async function testLogin(identifier) {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      identifier: identifier,
      password: 'user123',
      role: 'customer'
    });
    console.log(identifier, '=>', res.data);
  } catch (err) {
    console.error(identifier, '=>', err.response ? err.response.data : err.message);
  }
}
async function run() {
  await testLogin('priya.nair@example.com');
  await testLogin('ramesh.customer@test.com');
  await testLogin('driver_flow_customer@test.com');
}
run();
