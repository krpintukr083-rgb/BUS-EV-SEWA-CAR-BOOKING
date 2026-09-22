require('dotenv').config({path: './.env'});
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI).then(async () => {
  const Driver = require('./src/models/Driver');
  const User = require('./src/models/User');
  const Vehicle = require('./src/models/Vehicle');
  const drivers = await Driver.find({ 
    $or: [
      { name: /Vikram/i }, 
      { mobileNumber: /9812999888/ }
    ] 
  });
  if(drivers.length === 0) {
    console.log('Driver not found');
  } else {
    for (let d of drivers) {
      console.log('Driver Name:', d.name);
      console.log('Mobile:', d.mobileNumber);
      console.log('Status:', d.status);
      console.log('KYC:', d.kycStatus);
      const u = await User.findById(d.user);
      console.log('Has Password:', u && u.password ? 'Yes' : 'No');
      let vDetails = 'None';
      if (d.assignedVehicle) {
        const v = await Vehicle.findById(d.assignedVehicle);
        if (v) {
          vDetails = `${v.vehicleName} (${v.vehicleNumber}) - Route: ${v.route?.origin} to ${v.route?.destination}`;
        }
      }
      console.log('Vehicle:', vDetails);
      console.log('---');
    }
  }
  process.exit(0);
});
