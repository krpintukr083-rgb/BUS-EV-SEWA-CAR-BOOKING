const path = require('path');
const mongoose = require(path.join(__dirname, '../backend/node_modules/mongoose'));

async function resetTestDriver() {
  const MONGO_URI = 'mongodb+srv://krpintukr083_db_user:lrAak49opVLCDEmN@cluster0.xltshyt.mongodb.net/transport_booking_db?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(MONGO_URI);

  const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }));
  const driver = await Driver.findOne({ name: /Rajesh/i });

  if (driver) {
    driver.citizenshipStatus = 'Pending';
    driver.drivingLicenceStatus = 'Pending';
    driver.rcStatus = 'Pending';
    driver.insuranceStatus = 'Pending';
    driver.fitnessStatus = 'Pending';
    driver.driverStatus = 'Pending Verification';
    driver.rejectionReason = '';
    await driver.save();
    console.log(`Driver ${driver.name} reset to Pending Verification.`);
  }

  await mongoose.disconnect();
}

resetTestDriver();
