const dns = require('dns');
dns.setServers(['8.8.8.8']);
const mongoose = require('mongoose');
const uri = 'mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const User = require('./src/models/User');
  const { getAvailableInstantVehicleDrivers } = require('./src/utils/instantBookingAvailability');
  const Vehicle = require('./src/models/Vehicle');
  const Driver = require('./src/models/Driver');
  const Booking = require('./src/models/Booking');

  const users = await mongoose.connection.db.collection('users').find({ email: /priya/i }).toArray();
  console.log('Priya users:', users.map(u => ({ id: u._id, email: u.email, name: u.name, phone: u.phone })));





  // Let's inspect all Bus vehicles and their drivers
  const buses = await Vehicle.find({ vehicleType: 'Bus' }).lean();
  console.log('\n--- Bus Vehicles Detail ---');
  for (const b of buses) {
    console.log(`Bus ${b.name} (${b.registrationNumber}) status=${b.vehicleStatus} driverId=${b.assignedDriver}`);
    console.log(`  Route:`, b.route);
    const d = await Driver.findById(b.assignedDriver).populate('user').lean();
    console.log(`  Assigned Driver:`, d ? `${d.name} (status=${d.driverStatus}, online=${d.isOnline}, assignedVehicle=${d.assignedVehicle}) userStatus=${d.user?.status}` : 'None');
    const bookings = await Booking.find({
      driver: d?._id,
      travelDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    }).lean();
    console.log(`  Driver active bookings count today:`, bookings.length, bookings.map(bk => ({ id: bk._id, status: bk.bookingStatus, rideStatus: bk.rideStatus })));
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
