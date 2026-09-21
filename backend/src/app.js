const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const driverRoutes = require('./routes/driverRoutes');
const adminRoutes = require('./routes/adminRoutes');
const customerRoutes = require('./routes/customerRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const supportRoutes = require('./routes/supportRoutes');
const policyRoutes = require('./routes/policyRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// Allowed Origins Configuration
const allowedOrigins = [
  'https://bus-ev-sewa-car-booking-5ctefa5m0-krpintukr083-rgb.vercel.app',
  'https://bus-ev-sewa-car-booking.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

// Add origins from environment variables if present
['ALLOWED_ORIGINS', 'CLIENT_URL', 'FRONTEND_URL', 'CORS_ORIGIN'].forEach(envVar => {
  if (process.env[envVar]) {
    process.env[envVar].split(',').forEach(url => {
      const trimmed = url.trim();
      if (trimmed && !allowedOrigins.includes(trimmed)) {
        allowedOrigins.push(trimmed);
      }
    });
  }
});

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser tools (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }

    // Default allow requesting origin
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'bypass-tunnel-reminder', 'Bypass-Tunnel-Reminder', 'ngrok-skip-browser-warning'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded assets statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.8-driver-canonical-otp-fix',
    platform: 'Bus Booking + EV-Sewa + Car Booking MERN Platform',
    timestamp: new Date().toISOString()
  });
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/user', customerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.originalUrl}`
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
