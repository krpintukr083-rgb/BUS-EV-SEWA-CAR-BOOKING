const mongoose = require('mongoose');
require('dotenv').config();
require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');

async function updateJoylong() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const updateResult = await Vehicle.updateMany(
      { vehicleType: 'EV-Sewa', vehicleStatus: 'Active' },
      {
        $set: {
          vehicleModel: 'Joylong E6 Electric Passenger Van',
          vehicleName: 'Joylong E6 EcoRide Rapid Express'
        }
      }
    );
    console.log('Update Result:', updateResult);

    const activeEvs = await Vehicle.find({ vehicleType: 'EV-Sewa' }).populate('assignedDriver');
    console.log('Active EV-Sewa in MongoDB:', JSON.stringify(activeEvs, null, 2));

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

updateJoylong();
