const axios = require('axios');

async function testAdmin() {
  try {
    const loginRes = await axios.post('https://bus-ev-sewa-car-booking.onrender.com/api/auth/login', {
      identifier: 'admin@platform.com',
      password: 'admin123',
      role: 'admin'
    });
    
    const token = loginRes.data.token;
    console.log('Logged in successfully');

    const res = await axios.get('https://bus-ev-sewa-car-booking.onrender.com/api/admin/vehicles', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const vehicles = res.data.data;
    if (vehicles && vehicles.length > 0) {
      console.log('Total vehicles:', vehicles.length);
      console.log('First vehicle images:', vehicles[0].vehicleImages);
      console.log('First vehicle profilePhoto:', vehicles[0].profilePhoto);
      console.log('First vehicle driverPhoto:', vehicles[0].driverPhoto);
      if (vehicles[0].assignedDriver) {
        console.log('First vehicle assignedDriver.profilePhoto:', vehicles[0].assignedDriver.profilePhoto);
        console.log('First vehicle assignedDriver.driverPhoto:', vehicles[0].assignedDriver.driverPhoto);
      }
    } else {
      console.log('No vehicles found');
    }

  } catch (error) {
    console.log('Error:', error.message);
  }
}
testAdmin();
