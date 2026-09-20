const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }));
  const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const all = await Booking.find({}).sort({ createdAt: -1 }).lean();
  console.log('Total bookings in DB:', all.length);
  const active = all.filter(b => !['Completed', 'Cancelled', 'Rejected'].includes(b.bookingStatus));
  console.log('Active / Pending bookings count:', active.length);
  for (const b of active) {
    const v = b.vehicle ? await Vehicle.findById(b.vehicle).lean() : null;
    const d = b.driver ? await Driver.findById(b.driver).lean() : null;
    console.log(`Booking: ${b.bookingId} | Type: ${b.serviceType} | Status: ${b.bookingStatus} | Driver: ${d?.name || 'Unassigned'} | Vehicle: ${v?.vehicleNumber || 'None'} (${v?.vehicleType || 'None'})`);
  }

  process.exit(0);
}
check().catch(console.error);
