const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Vehicle = require('./src/models/Vehicle');
  const v = await Vehicle.find({}).lean();
  let found = 0;
  v.forEach(veh => {
    const str = JSON.stringify(veh.vehicleImages);
    if (str.includes('uploads')) {
      console.log(`Vehicle ${veh._id} (${veh.vehicleName}): ${str}`);
      found++;
    }
  });
  console.log(`Total found: ${found}`);
  process.exit(0);
});
