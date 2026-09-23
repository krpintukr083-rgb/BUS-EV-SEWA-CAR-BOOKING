const mongoose = require('mongoose');
require('dotenv').config();
const Driver = require('./src/models/Driver');
const Vehicle = require('./src/models/Vehicle');

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://user:pass@cluster.mongodb.net/test?retryWrites=true&w=majority').then(async () => {
    console.log('Connected to DB');
    const driversList = await Driver.find().populate('assignedVehicle');
    if (driversList.length > 0) {
        const driver = driversList.find(d => d.assignedVehicle);
        if (driver) {
            console.log('Found driver with vehicle:');
            console.log(JSON.stringify(driver.assignedVehicle, null, 2));
            const obj = driver.toObject();
            console.log('toObject assignedVehicle:');
            console.log(JSON.stringify(obj.assignedVehicle, null, 2));
        } else {
            console.log('No drivers with assignedVehicle found');
        }
    }
    process.exit(0);
});
