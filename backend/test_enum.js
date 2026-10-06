require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const u = await User.findOne({role: 'customer'});
  console.log(u.phone);
  process.exit(0);
});
