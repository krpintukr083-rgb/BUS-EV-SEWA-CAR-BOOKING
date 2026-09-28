const mongoose = require('mongoose');
const User = require('./src/models/User');

async function run() {
  await mongoose.connect('mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0');
  
  const cleanId = 'priya.nair@example.com';
  const isEmail = cleanId.includes('@');
  let user;
  if (isEmail) {
    user = await User.findOne({ email: cleanId.toLowerCase() }).select('+password');
  }
  console.log('Email lookup:', user ? user.name : null);

  const phoneId = '+919844556677';
  const digits = phoneId.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const orConditions = [
    { phone: phoneId },
    { phone: `+91${last10}` },
    { phone: `91${last10}` },
    { phone: last10 },
    { email: phoneId.toLowerCase() }
  ];
  if (last10.length >= 7) {
    orConditions.push({ phone: { $regex: new RegExp(last10 + '$') } });
  }
  user = await User.findOne({ $or: orConditions }).select('+password');
  console.log('Phone lookup:', user ? user.name : null);

  await mongoose.disconnect();
}
run().catch(console.dir);
