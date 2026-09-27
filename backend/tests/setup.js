require('./testDatabaseGuard');
const mongoose = require('mongoose');

const connectTestDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  } else if (
    !['localhost', '127.0.0.1', '::1', '[::1]'].includes(mongoose.connection.host) ||
    mongoose.connection.name !== 'transport_booking_test'
  ) {
    throw new Error(
      `Refusing to use existing MongoDB connection ${mongoose.connection.host}/${mongoose.connection.name} for backend tests.`
    );
  }
};

const closeTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

module.exports = {
  connectTestDB,
  closeTestDB
};
