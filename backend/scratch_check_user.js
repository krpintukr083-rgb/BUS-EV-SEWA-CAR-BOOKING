const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const User = require('./src/models/User');
const Driver = require('./src/models/Driver');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    const userId = '6ab8ccb4c847144af4b39a42';
    
    const user = await User.findById(userId);
    console.log(`User: ${user ? user.name : 'NOT FOUND'}`);
    
    if (user) {
      const driver = await Driver.findOne({ user: userId });
      console.log(`Driver associated with this User: ${driver ? driver.name : 'NOT FOUND'}`);
      console.log(`Driver ID: ${driver ? driver._id : 'N/A'}`);
    }
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkUser();
