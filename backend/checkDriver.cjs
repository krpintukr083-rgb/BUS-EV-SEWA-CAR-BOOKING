const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Driver = require('./src/models/Driver');
  const driver = await Driver.findOne().lean();
  console.log(driver);
  process.exit(0);
});
