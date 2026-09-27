const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const Driver = require('./src/models/Driver');

async function checkDriver() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    
    const driver = await Driver.findById('6ab8ccb4c847144af4b39a42');
    console.log(`Driver Name: ${driver.name}`);
    
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkDriver();
