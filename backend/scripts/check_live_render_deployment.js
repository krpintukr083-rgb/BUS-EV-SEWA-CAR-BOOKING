const axios = require('axios');

const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';
const DRIVER_EMAIL = 'krpintukr083+driverreview@gmail.com';
const DRIVER_PASS = 'YatraDriver@Review26!';

async function verifyLive() {
  console.log('--- 1. Authenticating Review Driver against Live Render ---');
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    identifier: DRIVER_EMAIL,
    password: DRIVER_PASS,
    role: 'driver'
  });
  console.log('Driver Login Status:', loginRes.data.success);
  const token = loginRes.data.token || loginRes.data.data?.token;
  const driverProfile = loginRes.data.driver || loginRes.data.data?.driver;
  console.log('Driver Name:', driverProfile?.name);
  console.log('Driver ID:', driverProfile?._id);
  console.log('Assigned Vehicle:', driverProfile?.assignedVehicle?.vehicleNumber);

  console.log('\n--- 2. Querying Active Bookings on Live Render ---');
  const activeRes = await axios.get(`${BASE_URL}/driver/active-bookings`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Active Bookings HTTP:', activeRes.status);
  console.log('Active Bookings Count:', activeRes.data.count);
  if (activeRes.data.data?.length > 0) {
    const sample = activeRes.data.data[0];
    console.log('Latest Active Booking ID:', sample.bookingId);
    console.log('customerViewOtp in response:', sample.customerViewOtp);
    console.log('confirmationOtp in response:', sample.confirmationOtp);
    console.log('confirmationOtpHash in response:', sample.confirmationOtpHash);
    console.log('rideOtp in response:', sample.rideOtp);
    console.log('driver field type/content:', typeof sample.driver, typeof sample.driver === 'object' ? Object.keys(sample.driver) : sample.driver);
  }
}

verifyLive().catch(err => {
  console.error('Live check failed:', err.response?.data || err.message);
  process.exit(1);
});
