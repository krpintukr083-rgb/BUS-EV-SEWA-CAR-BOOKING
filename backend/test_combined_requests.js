const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Booking = require('./src/models/Booking');
const Vehicle = require('./src/models/Vehicle');
const Driver = require('./src/models/Driver');
const { getScheduleBookingRequests } = require('./src/controllers/driverController');

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // 1. Create a fresh unclaimed INSTANT booking (Delhi -> Jaipur)
  const booking = await Booking.create({
    bookingMode: 'INSTANT',
    bookingStatus: 'Pending Driver Confirmation',
    rideStatus: 'Pending',
    serviceType: 'Any',
    driverConfirmed: false,
    driverConfirmationStatus: 'Pending',
    pickupLocation: 'Delhi',
    dropLocation: 'Jaipur',
    origin: 'Delhi',
    destination: 'Jaipur'
  });

  // 2. Find a driver (Harsh) and their assigned vehicle
  // Just find any active driver
  const driver = await Driver.findOne({ driverStatus: 'Active', isOnline: true });
  if (!driver) {
    console.log("No active/online driver found");
    process.exit(1);
  }

  const assignedVehicle = await Vehicle.findOne({ assignedDriver: driver._id, vehicleStatus: 'Active' });
  if (!assignedVehicle) {
    console.log("No assigned vehicle found for driver");
    process.exit(1);
  }

  // Update vehicle to Delhi -> Jaipur
  assignedVehicle.route = { origin: 'Delhi', destination: 'Jaipur' };
  await assignedVehicle.save();

  // 3. Mock req/res
  const req = {
    driver: driver,
    query: {} // no mode
  };

  const res = {
    json: function(data) {
      console.log(JSON.stringify(data, null, 2));
    },
    set: function() {}
  };

  // 4. Call getScheduleBookingRequests
  console.log("Calling getBookingRequests (isCombined = true)");
  
  // We need to require the controller again or just call it if it's exported.
  const { getBookingRequests } = require('./src/controllers/driverController');
  
  try {
    await getBookingRequests(req, res, (err) => console.log("Next err:", err));
  } catch (err) {
    console.log("Error:", err);
  }

  // Cleanup
  await Booking.findByIdAndDelete(booking._id);
  process.exit(0);
}

runTest();
