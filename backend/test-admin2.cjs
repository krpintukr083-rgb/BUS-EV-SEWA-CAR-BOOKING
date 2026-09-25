const axios = require('axios');

async function testAdmin() {
  try {
    const loginRes = await axios.post('https://bus-ev-sewa-car-booking.onrender.com/api/auth/login', {
      identifier: 'admin@platform.com',
      password: 'admin123',
      role: 'admin'
    });
    const token = loginRes.data.token;
    
    const res = await axios.get('https://bus-ev-sewa-car-booking.onrender.com/api/admin/vehicles', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const vehicles = res.data.data;
    const vWithImage = vehicles.find(v => v.vehicleImages && v.vehicleImages.length > 0);
    
    if (vWithImage) {
      console.log('Vehicle found with images:');
      console.log('vehicleImages:', vWithImage.vehicleImages);
    } else {
      console.log('No vehicles with images found');
    }

  } catch (error) {
    console.log('Error:', error.message);
  }
}
testAdmin();
