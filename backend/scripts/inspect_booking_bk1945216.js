require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const Vehicle = require('../src/models/Vehicle');
const Driver = require('../src/models/Driver');
const Notification = require('../src/models/Notification');

async function inspectBooking() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB:', mongoose.connection.name);

  const b = await Booking.findOne({
    $or: [{ bookingId: 'BK-1945216' }, { bookingId: /1945216/ }]
  }).populate('vehicle').populate('driver');

  if (!b) {
    console.log('No booking found matching BK-1945216. Looking for latest bookings:');
    const latest = await Booking.find().sort({ createdAt: -1 }).limit(5);
    console.log(latest.map(x => ({ id: x._id, bookingId: x.bookingId, type: x.vehicleType, pickup: x.pickupLocation, drop: x.dropLocation, vehicle: x.vehicle, driver: x.driver })));
    process.exit(0);
  }

  console.log('\n--- BOOKING DETAILS ---');
  console.log({
    _id: b._id,
    bookingId: b.bookingId,
    vehicleType: b.vehicleType,
    bookingMode: b.bookingMode,
    bookingStatus: b.bookingStatus,
    pickupLocation: b.pickupLocation,
    dropLocation: b.dropLocation,
    route: b.route,
    vehicle: b.vehicle ? {
      _id: b.vehicle._id,
      number: b.vehicle.vehicleNumber,
      name: b.vehicle.vehicleName,
      type: b.vehicle.vehicleType,
      route: b.vehicle.route,
      assignedDriver: b.vehicle.assignedDriver
    } : null,
    driver: b.driver ? {
      _id: b.driver._id,
      name: b.driver.name,
      route: b.driver.route,
      assignedVehicle: b.driver.assignedVehicle
    } : null,
    scheduleId: b.scheduleId,
    customerViewOtp: b.customerViewOtp,
    confirmationOtp: b.confirmationOtp
  });

  // Check notifications for this booking
  const notifs = await Notification.find({ entityId: b._id });
  console.log('\n--- NOTIFICATIONS FOR BOOKING ---');
  console.log(notifs.map(n => ({
    id: n._id,
    title: n.title,
    recipient: n.recipient,
    recipientRole: n.recipientRole,
    recipientId: n.recipientId,
    driverId: n.driverId,
    eventType: n.eventType
  })));

  // Check review driver
  const reviewDriver = await Driver.findOne({ mobileNumber: '+9779800000099' });
  if (reviewDriver) {
    console.log('\n--- REVIEW DRIVER ---');
    console.log({
      _id: reviewDriver._id,
      name: reviewDriver.name,
      route: reviewDriver.route,
      assignedVehicle: reviewDriver.assignedVehicle
    });
  }

  await mongoose.disconnect();
}

inspectBooking().catch(err => {
  console.error(err);
  process.exit(1);
});
