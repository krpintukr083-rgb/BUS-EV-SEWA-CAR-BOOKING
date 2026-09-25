const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Driver = require('../src/models/Driver');
const Vehicle = require('../src/models/Vehicle');
const Schedule = require('../src/models/Schedule');

async function testDriverSchedule() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const driver = await Driver.findOne({ driverStatus: 'Active' });
  const vehicle = await Vehicle.findOne({ vehicleStatus: 'Active', assignedDriver: driver._id });
  
  const schedule = await Schedule.create({
    vehicle: vehicle._id,
    driver: driver._id,
    origin: 'Delhi',
    destination: 'Jaipur',
    travelDate: new Date(),
    departureTime: '10:00 AM',
    fareRate: 500,
    status: 'Pending'
  });
  
  console.log("Schedule created in DB:", schedule._id);
  process.exit(0);
}
testDriverSchedule();
