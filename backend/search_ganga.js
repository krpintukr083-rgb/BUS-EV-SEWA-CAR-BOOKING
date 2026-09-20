const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));

  const b = await Booking.find({
    $or: [
      { bookingId: /1405809/ },
      { bookingId: /0971280/ },
      { bookingId: /0325602/ }
    ]
  }).lean();
  console.log('Bookings matching regex count:', b.length);
  b.forEach(item => console.log('Found booking:', item.bookingId, item.serviceType, item.vehicle, item.driver));

  const v = await Vehicle.find({
    $or: [
      { vehicleName: /ganga/i },
      { vehicleNumber: /87567546/i }
    ]
  }).lean();
  console.log('Vehicles matching ganga:', v);

  const allV = await Vehicle.find({}).lean();
  console.log('All vehicles in DB:');
  allV.forEach(x => console.log(x._id, x.vehicleName, x.vehicleNumber, x.vehicleType));

  process.exit(0);
}
check().catch(console.error);
