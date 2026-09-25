const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');
const jwt = require('jsonwebtoken');

async function testDelete() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const admin = await User.findOne({ role: 'admin' });
  const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
  
  const vehicle = await Vehicle.findOne();
  if (!vehicle) {
    console.log("No vehicles in DB to test");
    process.exit(1);
  }
  
  const id = vehicle._id.toString();
  console.log("Attempting to delete vehicle ID:", id);
  
  try {
    const res = await axios.delete(`https://bus-ev-sewa-car-booking.onrender.com/api/admin/vehicles/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Delete success:", res.data);
  } catch (err) {
    if (err.response) {
      console.error("Delete failed with status:", err.response.status, "data:", err.response.data);
    } else {
      console.error("Delete failed:", err.message);
    }
  }
  process.exit(0);
}
testDelete();
