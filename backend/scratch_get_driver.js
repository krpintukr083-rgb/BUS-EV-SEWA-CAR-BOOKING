const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Driver = require('./src/models/Driver');

async function getDriver() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    
    const driver = await Driver.findById('6ab178f69352b8284c02ab39');
    console.log(`Phone: ${driver.phone}`);
    console.log(`Status: ${driver.driverStatus}`);
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

getDriver();
