const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function listAllActiveInstants() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    
    const rawBookings = await mongoose.connection.db.collection('bookings').find({
      bookingMode: 'INSTANT',
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
    }).toArray();
    
    console.log(`Found ${rawBookings.length} total active instant bookings.`);
    for (const b of rawBookings) {
      console.log(`- ${b.bookingId} | driver: ${b.driver}`);
    }
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

listAllActiveInstants();
