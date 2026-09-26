const mongoose = require('../backend/node_modules/mongoose');

(async () => {
  const mongoUri = 'mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;

  console.log('=== DRIVERS ===');
  const drivers = await db.collection('drivers').find({
    name: { $in: ['Harsh', 'Ayush', 'Pintu'] }
  }).toArray();
  for (const d of drivers) {
    console.log({
      _id: d._id.toString(),
      name: d.name,
      driverStatus: d.driverStatus,
      isOnline: d.isOnline,
      assignedVehicle: d.assignedVehicle ? d.assignedVehicle.toString() : null
    });
  }

  console.log('\n=== BUS VEHICLES ===');
  const vehicles = await db.collection('vehicles').find({
    vehicleType: 'Bus'
  }).toArray();
  for (const v of vehicles) {
    console.log({
      _id: v._id.toString(),
      name: v.name || v.busName || v.vehicleName,
      registrationNumber: v.registrationNumber,
      vehicleStatus: v.vehicleStatus,
      vehicleSource: v.vehicleSource,
      route: v.route,
      assignedDriver: v.assignedDriver ? v.assignedDriver.toString() : null
    });
  }

  console.log('\n=== SCHEDULES ===');
  const schedules = await db.collection('schedules').find({
    vehicle: { $in: vehicles.map(v => v._id) }
  }).toArray();
  for (const s of schedules) {
    console.log({
      _id: s._id.toString(),
      vehicle: s.vehicle.toString(),
      status: s.status,
      travelDate: s.travelDate
    });
  }

  console.log('\n=== BOOKINGS FOR DEMO DRIVERS ===');
  const driverIds = drivers.map(d => d._id);
  const bookings = await db.collection('bookings').find({
    driver: { $in: driverIds }
  }).toArray();
  for (const b of bookings) {
    console.log({
      _id: b._id.toString(),
      driver: b.driver.toString(),
      bookingStatus: b.bookingStatus,
      travelDate: b.travelDate,
      rideStatus: b.rideStatus
    });
  }

  await mongoose.disconnect();
})();
