const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const Vehicle = require('./src/models/Vehicle');

async function checkVehicle() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    const vehicle = await Vehicle.findById('6ab8ccb4c847144af4b39a42');
    console.log(`Vehicle: ${vehicle ? vehicle.registrationNumber : 'NOT FOUND'}`);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkVehicle();
