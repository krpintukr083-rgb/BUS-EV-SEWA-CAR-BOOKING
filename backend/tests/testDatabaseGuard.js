const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const TEST_DATABASE_NAME = 'transport_booking_test';

const validateTestMongoUri = (uri) => {
  if (typeof uri !== 'string' || !uri.trim()) {
    throw new Error(
      'Refusing to run backend tests: TEST_MONGODB_URI must be configured in backend/.env.test or the process environment.'
    );
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch (error) {
    throw new Error('Refusing to run backend tests: TEST_MONGODB_URI is not a valid MongoDB URI.');
  }

  const host = parsed.hostname.toLowerCase();
  let databaseName;
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  } catch (error) {
    throw new Error('Refusing to run backend tests: TEST_MONGODB_URI contains an invalid database name.');
  }

  if (parsed.protocol !== 'mongodb+srv:') {
    throw new Error('Refusing to run backend tests: TEST_MONGODB_URI must use an Atlas mongodb+srv URI.');
  }
  if (!host.endsWith('.mongodb.net')) {
    throw new Error(`Refusing to run backend tests against non-Atlas MongoDB host "${host}".`);
  }
  if (databaseName !== TEST_DATABASE_NAME) {
    throw new Error(`Refusing to run backend tests: the database must be "${TEST_DATABASE_NAME}".`);
  }

  return { uri, host, databaseName };
};

const testDatabase = validateTestMongoUri(process.env.TEST_MONGODB_URI);
const mongoose = require('mongoose');

console.log(`Host: ${testDatabase.host}`);
console.log(`Database: ${testDatabase.databaseName}`);
console.log('Environment: TEST');

const originalConnect = mongoose.connect.bind(mongoose);
mongoose.connect = (uri, options) => {
  const validated = validateTestMongoUri(uri);
  if (validated.uri !== process.env.TEST_MONGODB_URI) {
    throw new Error('Refusing backend test connection: mongoose.connect must use TEST_MONGODB_URI.');
  }
  return originalConnect(validated.uri, options);
};

const originalCreateConnection = mongoose.createConnection.bind(mongoose);
mongoose.createConnection = (uri, options) => {
  const validated = validateTestMongoUri(uri);
  if (validated.uri !== process.env.TEST_MONGODB_URI) {
    throw new Error('Refusing backend test connection: mongoose.createConnection must use TEST_MONGODB_URI.');
  }
  return originalCreateConnection(validated.uri, options);
};
