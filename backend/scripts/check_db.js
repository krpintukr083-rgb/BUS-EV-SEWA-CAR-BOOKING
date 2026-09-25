const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Vehicle = require('../src/models/Vehicle');

async function checkDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  const vehicles = await Vehicle.find().sort({createdAt: -1}).limit(5).lean();
  console.log("Recent vehicles in DB:");
  vehicles.forEach(v => {
    console.log(`- ID: ${v._id}, Number: ${v.vehicleNumber}, Status: ${v.vehicleStatus}, Source: ${v.vehicleSource}`);
  });
  process.exit(0);
}
checkDB();
