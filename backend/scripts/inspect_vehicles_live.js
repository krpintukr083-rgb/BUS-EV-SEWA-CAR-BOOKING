const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Vehicle = require('../src/models/Vehicle');
const Driver = require('../src/models/Driver');

async function checkVehicles() {
  await mongoose.connect(process.env.MONGODB_URI);
  const vehicles = await Vehicle.find().populate('assignedDriver', 'name mobileNumber').lean();
  console.log('Total vehicles:', vehicles.length);
  vehicles.forEach((v, idx) => {
    console.log(`[${idx}] VehicleID: ${v._id} | Number: ${v.vehicleNumber} | Name: ${v.vehicleName} | Type: ${v.vehicleType} | Status: ${v.vehicleStatus} | Driver: ${v.assignedDriver?.name} (${v.assignedDriver?._id}) | Route: ${v.route?.origin} -> ${v.route?.destination}`);
  });
  await mongoose.disconnect();
}
checkVehicles().catch(console.error);
