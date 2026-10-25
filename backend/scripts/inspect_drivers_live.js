const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Driver = require('../src/models/Driver');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const drivers = await Driver.find().populate('user', 'name phone email status').populate('assignedVehicle').lean();
  console.log('Total drivers:', drivers.length);
  drivers.forEach((d, idx) => {
    const vType = d.assignedVehicle?.vehicleType || 'None';
    const vRoute = d.assignedVehicle?.route ? `${d.assignedVehicle.route.origin} -> ${d.assignedVehicle.route.destination}` : 'None';
    console.log(`[${idx}] DriverID: ${d._id} | Name: ${d.name} | Phone: ${d.mobileNumber} | Status: ${d.driverStatus} | Online: ${d.isOnline} | Route: ${d.route?.origin} -> ${d.route?.destination} | VehicleType: ${vType} | VehicleRoute: ${vRoute} | UserPhone: ${d.user?.phone} | PushToken: ${d.pushToken ? 'YES' : 'NO'}`);
  });
  await mongoose.disconnect();
}
check().catch(console.error);
