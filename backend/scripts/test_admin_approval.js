const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

async function testAdminApproval() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.log("No admin found");
    process.exit(1);
  }
  
  const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
  const scheduleId = '6ab5f8aa522f467752afacad'; // The ID we created earlier
  
  try {
    const res = await axios.patch(`http://localhost:5006/api/admin/schedules/${scheduleId}/approve`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Schedule approved:", res.data);
  } catch (err) {
    console.error("Failed to approve schedule:", err.response ? err.response.data : err.message);
  }
  process.exit(0);
}
testAdminApproval();
