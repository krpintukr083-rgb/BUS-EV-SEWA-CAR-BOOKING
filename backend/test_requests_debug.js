const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Booking = require('./src/models/Booking');
const Vehicle = require('./src/models/Vehicle');
const Driver = require('./src/models/Driver');
const { getBookingRequests } = require('./src/controllers/driverController');

async function debugBackend() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Clean up any stale test bookings
  await Booking.deleteMany({ bookingMode: 'INSTANT', origin: 'DelhiTest', destination: 'JaipurTest' });

  // Find an active driver
  const driver = await Driver.findOne({ driverStatus: 'Active', isOnline: true }).lean();
  if (!driver) {
    console.log("No active/online driver found. Exiting.");
    process.exit(1);
  }

  // Find assigned vehicle
  const assignedVehicle = await Vehicle.findOne({ assignedDriver: driver._id, vehicleStatus: 'Active' });
  if (!assignedVehicle) {
    console.log("No active assigned vehicle found for driver. Exiting.");
    process.exit(1);
  }

  const prevRoute = assignedVehicle.route;

  assignedVehicle.route = { origin: 'DelhiTest', destination: 'JaipurTest' };
  await assignedVehicle.save();

  const instantBooking = await Booking.create({
    bookingId: 'BK-TEST-' + Date.now(),
    customer: { name: 'Test User', phone: '9999999999' },
    fare: 500,
    bookingMode: 'INSTANT',
    bookingStatus: 'Pending Driver Confirmation',
    rideStatus: 'None',
    serviceType: 'Any',
    driverConfirmed: false,
    driverConfirmationStatus: 'Pending',
    pickupLocation: 'DelhiTest',
    dropLocation: 'JaipurTest',
    origin: 'DelhiTest',
    destination: 'JaipurTest'
  });
  console.log("Created fresh INSTANT booking:", instantBooking._id);
  console.log("Driver that received it:", driver._id);

  let finalCount = 0;
  const res = {
    json: function(data) {
      if (data.data) {
        let normalCount = 0;
        let scheduleCount = 0;
        let instantCount = 0;
        
        data.data.forEach(item => {
          if (item.bookingMode === 'NORMAL') normalCount++;
          if (item.bookingMode === 'SCHEDULE') scheduleCount++;
          if (item.bookingMode === 'INSTANT') instantCount++;
        });

        console.log("NORMAL candidate count:", normalCount);
        console.log("SCHEDULE candidate count:", scheduleCount);
        console.log("INSTANT candidate count:", instantCount);
        console.log("Final candidate count:", data.count);
        finalCount = data.count;
      }
    },
    set: function() {}
  };

  const req = {
    driver: driver,
    query: {}
  };

  console.log("\nCalling GET /api/driver/booking-requests (no mode) ...");
  await getBookingRequests(req, res, (err) => console.log("Next err:", err));

  await Booking.findByIdAndDelete(instantBooking._id);
  assignedVehicle.route = prevRoute;
  await assignedVehicle.save();
  
  console.log("\nDone.");
  process.exit(0);
}

debugBackend();
