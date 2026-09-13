require('dotenv').config();
const mongoose = require('mongoose');

const connectTestDB = async () => {
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/transport_booking_db';
    await mongoose.connect(mongoUri);
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
