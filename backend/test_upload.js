const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function test() {
  try {
    // 1. Login to get token
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      identifier: 'admin',
      password: 'admin', // assuming this works or I can bypass it. Wait, I will just do a direct call to the controller by writing a test script that bypasses Express.
    });
  } catch(e) {
    console.log(e.message);
  }
}
test();
