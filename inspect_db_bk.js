require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./backend/src/models/Booking');
const Vehicle = require('./backend/src/models/Vehicle');
const Driver = require('./backend/src/models/Driver');

const BASE_URL = 'https://bus-ev-sewa-car-booking.onrender.com/api';

async function check() {
  const mongoUri = process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const bk = await Booking.findOne({ bookingId: 'BK-5993241' }).populate('vehicle assignedDriver');
  console.log('--- MongoDB Booking Record for BK-5993241 ---');
  if (!bk) {
    console.log('Not found in DB!');
    process.exit(1);
  }
  console.log({
    _id: bk._id,
    bookingId: bk.bookingId,
    bookingMode: bk.bookingMode,
    bookingType: bk.bookingType,
    bookingStatus: bk.bookingStatus,
    paymentStatus: bk.paymentStatus,
    driverConfirmed: bk.driverConfirmed,
    rideStatus: bk.rideStatus,
    vehicle: bk.vehicle?._id,
    vehicleNumber: bk.vehicle?.vehicleNumber,
    vehicleRoute: bk.vehicle?.route,
    pickupLocation: bk.pickupLocation,
    dropLocation: bk.dropLocation,
    assignedDriver: bk.assignedDriver
  });

  const drivers = await Driver.find().populate('assignedVehicle');
  console.log('\n--- Drivers in DB ---');
  for (const d of drivers) {
    console.log({
      name: d.name,
      mobile: d.mobileNumber,
      driverStatus: d.driverStatus,
      isOnline: d.isOnline,
      assignedVehicleId: d.assignedVehicle?._id,
      assignedVehicleNumber: d.assignedVehicle?.vehicleNumber,
      vehicleRoute: d.assignedVehicle?.route
    });
  }

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
