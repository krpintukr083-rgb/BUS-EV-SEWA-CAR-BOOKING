require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Connect to MongoDB
connectDB();

const server = app.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`Transportation Backend Server Running`);
  console.log(`- Port: ${PORT}`);
  console.log(`- Local API:      http://localhost:${PORT}/api`);
  console.log(`- LAN API (WiFi): http://192.168.1.2:${PORT}/api`);
  console.log(`- Listening on:   0.0.0.0 (All network interfaces)`);
  console.log(`====================================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`);
});
