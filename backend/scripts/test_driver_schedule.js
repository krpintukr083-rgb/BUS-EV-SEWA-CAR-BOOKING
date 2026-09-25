const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const jwt = require('jsonwebtoken');

async function testDriverSchedule() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const driver = await Driver.findOne({ driverStatus: 'Active' });
  if (!driver) {
    console.log("No active driver found");
    process.exit(1);
  }
  
  const vehicle = await Vehicle.findOne({ vehicleStatus: 'Active', assignedDriver: driver._id });
  if (!vehicle) {
    console.log("No active vehicle found assigned to driver", driver.name);
    process.exit(1);
  }
  
  const token = jwt.sign({ id: driver._id, role: 'driver' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
  
  try {
    const res = await axios.post('http://localhost:5006/api/driver/schedules', {
      vehicle: vehicle._id.toString(),
      origin: 'Delhi',
      destination: 'Jaipur',
      travelDate: new Date().toISOString(),
      departureTime: '10:00 AM'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Schedule created:", res.data);
  } catch (err) {
    console.error("Failed to create schedule:", err.response ? err.response.data : err.message);
  }
  process.exit(0);
}
testDriverSchedule();
