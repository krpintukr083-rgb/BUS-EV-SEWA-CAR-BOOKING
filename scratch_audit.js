const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './backend/.env' });

const {
  ACTIVE_INSTANT_BOOKING_STATUSES,
  ACTIVE_INSTANT_RIDE_STATUSES,
  ACTIVE_INSTANT_DRIVER_CONFIRMATION_STATUSES,
  ACTIVE_INSTANT_CANCELLATION_STATUSES,
  ACTIVE_INSTANT_PAYMENT_STATUSES
} = require('./backend/src/utils/activeInstantBooking');

async function run() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("No MONGODB_URI found");
    
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");
    
    const db = mongoose.connection.db;
    const indexes = await db.collection('bookings').indexes();
    
    const index = indexes.find(i => i.name === 'one_active_instant_booking_per_driver');
    if (index) {
      console.log("\n--- INDEX PARTIAL FILTER EXPRESSION ---");
      console.log(JSON.stringify(index.partialFilterExpression, null, 2));
    } else {
      console.log("\nIndex one_active_instant_booking_per_driver NOT FOUND.");
    }
    
    console.log("\n--- RUNNING AUDIT ---");
    const predicate = {
      bookingMode: 'INSTANT',
      driver: { $type: 'objectId' },
      bookingStatus: { $in: ACTIVE_INSTANT_BOOKING_STATUSES },
      rideStatus: { $in: ACTIVE_INSTANT_RIDE_STATUSES },
      driverConfirmationStatus: { $in: ACTIVE_INSTANT_DRIVER_CONFIRMATION_STATUSES },
      cancellationStatus: { $in: ACTIVE_INSTANT_CANCELLATION_STATUSES },
      paymentStatus: { $in: ACTIVE_INSTANT_PAYMENT_STATUSES },
      completedAt: null
    };
    
    const duplicates = await db.collection('bookings').aggregate([
      { $match: predicate },
      { $group: { _id: "$driver", count: { $sum: 1 }, bookings: { $push: "$bookingId" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    
    if (duplicates.length > 0) {
      console.log("\nDUPLICATES FOUND:");
      console.log(JSON.stringify(duplicates, null, 2));
    } else {
      console.log("\nNo duplicates found.");
      console.log("Production is safe for controlled index rebuild.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
