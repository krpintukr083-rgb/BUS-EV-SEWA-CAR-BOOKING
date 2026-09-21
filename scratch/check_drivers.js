const mongoose = require('mongoose');
require('dotenv').config({ path: 'backend/.env' });
const User = require('./backend/src/models/User');
const Driver = require('./backend/src/models/Driver');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const drivers = await User.find({ role: 'driver' }).select('name email phone status role');
    console.log('--- ALL DRIVERS IN DATABASE ---');
    console.log(JSON.stringify(drivers, null, 2));

    const matches = await User.find({
      name: { $regex: /amit|vikram/i }
    }).select('name email phone status role');
    console.log('--- AMIT / VIKRAM USERS ---');
    console.log(JSON.stringify(matches, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
