const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: './.env'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./src/models/User');
  const user = await User.findOne({ email: 'harsh.driver@platform.com' }).lean();
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  const token = jwt.sign({ id: user._id, role: 'driver' }, process.env.JWT_SECRET || 'transport_platform_jwt_secret_key_2026_super_secure', { expiresIn: '7d' });
  console.log(token);
  process.exit(0);
});
