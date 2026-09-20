const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
  const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }));

  const bIds = ['BK-1405809', 'BK-0971280', 'BK-0325602'];
  const found = await Booking.find({ bookingId: { $in: bIds } }).lean();
  console.log('Found bookings in DB:', found.length);
  for (const b of found) {
    const v = b.vehicle ? await Vehicle.findById(b.vehicle).lean() : null;
    const d = b.driver ? await Driver.findById(b.driver).lean() : null;
    console.log({
      id: b.bookingId,
      serviceType: b.serviceType,
      status: b.bookingStatus,
      driverConfirmationStatus: b.driverConfirmationStatus,
      vehicleId: b.vehicle,
      vehicleNum: v?.vehicleNumber,
      vehicleDriver: v?.assignedDriver,
      driverId: b.driver,
      driverName: d?.name,
      driverAssignedVeh: d?.assignedVehicle
    });
  }

  // Also search for vehicle DL-87567546
  const veh = await Vehicle.findOne({ vehicleNumber: /87567546/i }).lean();
  console.log('Vehicle ganga DL-87567546:', veh);

  process.exit(0);
}
check().catch(console.error);
