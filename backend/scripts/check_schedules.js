const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Schedule = require('../src/models/Schedule');

async function checkSchedules() {
  await mongoose.connect(process.env.MONGODB_URI);
  const count = await Schedule.countDocuments();
  const pendingCount = await Schedule.countDocuments({ status: 'Pending' });
  const activeCount = await Schedule.countDocuments({ status: 'Active' });
  console.log(`Total Schedules: ${count}`);
  console.log(`Pending Schedules: ${pendingCount}`);
  console.log(`Active Schedules: ${activeCount}`);
  process.exit(0);
}
checkSchedules();
