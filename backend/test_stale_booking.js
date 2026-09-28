const mongoose = require('mongoose');
const Booking = require('./src/models/Booking');

async function run() {
  await mongoose.connect('mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0');
  
  const staleBooking = await Booking.create({
    bookingId: 'BK-STALE-123',
    bookingMode: 'INSTANT',
    pickupLocation: 'Delhi',
    dropLocation: 'Jaipur',
    fare: 100,
    driver: new mongoose.Types.ObjectId(), // mock driver
    rideStatus: 'None', // Stale/null equivalent
    bookingStatus: 'Pending Driver Confirmation'
  });

  const hasActiveInstantBooking = Boolean(await Booking.exists({
      driver: staleBooking.driver,
      bookingMode: 'INSTANT',
      rideStatus: { $in: ['Accepted', 'Arrived', 'Started', 'Ongoing'] },
      bookingStatus: {
        $in: [
          'Pending Admin Confirmation',
          'PENDING_ADMIN_CONFIRMATION',
          'Admin Confirmed',
          'ADMIN_CONFIRMED',
          'Pending',
          'Pending Driver Confirmation',
          'Awaiting Cash Collection',
          'Confirmed',
          'Ongoing'
        ]
      }
    }));

  console.log('hasActiveInstantBooking for None:', hasActiveInstantBooking);

  await Booking.deleteOne({ _id: staleBooking._id });
  await mongoose.disconnect();
}
run().catch(console.dir);
