const axios = require('axios');

async function testReviewDriverLogin() {
  const PROD_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
  const email = 'krpintukr083+driverreview@gmail.com';
  const password = 'YatraDriver@Review26!';

  console.log('Testing Review Driver login against Production Backend:', PROD_URL);
  console.log('Identifier:', email);

  try {
    const loginRes = await axios.post(`${PROD_URL}/auth/login`, {
      identifier: email,
      password: password,
      role: 'driver'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log('\n--- LOGIN RESPONSE ---');
    console.log('HTTP Status:', loginRes.status);
    console.log('Success:', loginRes.data.success);
    console.log('Token received:', Boolean(loginRes.data.token));
    console.log('User Role:', loginRes.data.user?.role);
    console.log('User Status:', loginRes.data.user?.status);
    console.log('Driver ID:', loginRes.data.driver?._id || loginRes.data.user?.driverInfo?._id);
    console.log('Driver Status:', loginRes.data.driver?.driverStatus);

    const token = loginRes.data.token;
    if (!token) {
      throw new Error('No JWT token returned from login!');
    }

    // Test Driver Profile endpoint
    console.log('\n--- VERIFYING DRIVER PROFILE ACCESS ---');
    const profileRes = await axios.get(`${PROD_URL}/driver/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000
    });

    console.log('Profile HTTP Status:', profileRes.status);
    console.log('Profile Name:', profileRes.data.data?.name);
    console.log('Profile Mobile:', profileRes.data.data?.mobileNumber);
    console.log('Documents Status:', profileRes.data.data?.requiredDocumentsStatus);
    console.log('Driver Online:', profileRes.data.data?.isOnline);

    // Test Driver Dashboard endpoint
    console.log('\n--- VERIFYING DRIVER DASHBOARD ACCESS ---');
    const dashRes = await axios.get(`${PROD_URL}/driver/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000
    });

    console.log('Dashboard HTTP Status:', dashRes.status);
    console.log('Dashboard Data Returned:', Boolean(dashRes.data.data));

    console.log('\n========================================');
    console.log('✅ ALL LOGIN AND ACCESS TESTS PASSED FOR GOOGLE PLAY REVIEW DRIVER ACCOUNT');
    console.log('========================================');
  } catch (err) {
    if (err.response) {
      console.error('Login Failed with HTTP', err.response.status, ':', err.response.data);
    } else {
      console.error('Request Error:', err.message);
    }
    process.exit(1);
  }
}

testReviewDriverLogin();
