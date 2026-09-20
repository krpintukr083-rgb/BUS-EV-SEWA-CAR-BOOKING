const RENDER_BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function main() {
  console.log('Logging in driver with identifier...');

  const drvRes = await fetch(`${RENDER_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'driver@platform.com', password: 'driver123' })
  });
  const drvData = await drvRes.json();
  const token = drvData.data?.token || drvData.token;
  console.log('Driver Login Token:', token ? 'SUCCESS' : 'FAILED');

  if (token) {
    const reqRes = await fetch(`${RENDER_BASE_URL}/driver/requests`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const reqData = await reqRes.json();
    console.log('Driver Requests:', JSON.stringify(reqData, null, 2));
  }
}

main();
