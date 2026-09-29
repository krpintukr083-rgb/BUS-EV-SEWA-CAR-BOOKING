require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Vehicle = require('./backend/src/models/Vehicle');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const v = await Vehicle.findOne({ 'route.origin': { $exists: true, $ne: '' } }).lean();
  console.log(JSON.stringify(v.route, null, 2));
  process.exit();
}
check();
