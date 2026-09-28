const mongoose = require('mongoose');
const Booking = require('./src/models/Booking');
const Driver = require('./src/models/Driver');
const User = require('./src/models/User');
const driverController = require('./src/controllers/driverController');

async function run() {
  await mongoose.connect('mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_test?retryWrites=true&w=majority&appName=Cluster0');
  
  const user = await User.create({ name: 'Test', phone: '+1234567890', role: 'driver' });
  const driver = await Driver.create({ user: user._id, driverStatus: 'Active', isOnline: true });

  const staleBooking = await Booking.create({
    bookingId: 'BK-STALE',
    bookingMode: 'INSTANT',
    pickupLocation: 'Delhi',
    dropLocation: 'Jaipur',
    fare: 100,
    driver: driver._id,
    rideStatus: 'None',
    bookingStatus: 'Pending Driver Confirmation'
  });

  const freshBooking = await Booking.create({
    bookingId: 'BK-FRESH',
    bookingMode: 'INSTANT',
    pickupLocation: 'Delhi',
    dropLocation: 'Jaipur',
    fare: 100,
    bookingStatus: 'Pending Driver Confirmation'
  });

  // Mock req and res
  const req = { driver };
  const res = {
    json: (data) => console.log('Response:', data),
    status: () => res
  };

  await driverController.getBookingRequests(req, res);

  await Booking.deleteMany({ bookingId: { $in: ['BK-STALE', 'BK-FRESH'] } });
  await Driver.deleteOne({ _id: driver._id });
  await User.deleteOne({ _id: user._id });

  await mongoose.disconnect();
}
run().catch(console.dir);
