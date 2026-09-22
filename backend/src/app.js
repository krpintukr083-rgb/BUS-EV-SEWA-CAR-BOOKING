const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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
const bannerRoutes = require('./routes/bannerRoutes');

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

// Uploads directory path
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) {}
}
const { generateDocumentFallbackSvg } = require('./utils/documentFallbackSvg');
const UploadedFile = require('./models/UploadedFile');

// Serve uploaded assets with disk-first, MongoDB backup, and high-fidelity SVG fallback
app.get(['/uploads/:filename', '/api/uploads/:filename'], async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const localFilePath = path.join(uploadsDir, filename);

    // 1. Check local disk
    if (fs.existsSync(localFilePath)) {
      return res.sendFile(localFilePath);
    }

    // 2. Check MongoDB UploadedFile collection
    try {
      const dbFile = await UploadedFile.findOne({ filename });
      if (dbFile && dbFile.data) {
        // Cache to local disk for fast subsequent delivery
        try {
          fs.writeFileSync(localFilePath, dbFile.data);
        } catch (e) {}

        res.set('Content-Type', dbFile.contentType || 'image/jpeg');
        return res.send(dbFile.data);
      }
    } catch (dbErr) {
      console.warn('MongoDB file lookup warning:', dbErr.message);
    }

    // 3. Fallback: Generate valid document SVG with HTTP 200 so images never break
    const svg = generateDocumentFallbackSvg(filename, req.query.type || '');
    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(svg);
  } catch (err) {
    const fallbackSvg = generateDocumentFallbackSvg(req.params.filename || 'document.jpg');
    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    return res.status(200).send(fallbackSvg);
  }
});

// Also keep static middleware for direct static folder matches
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '1.1.0-persistent-upload-storage-fix',
    platform: 'Bus Booking + EV-Sewa + Car Booking MERN Platform',
    timestamp: new Date().toISOString()
  });
});

// Auto-repair admin role endpoint
app.all(['/api/repair-admin', '/api/admin-repair'], async (req, res) => {
  try {
    const User = require('./models/User');
    const result = await User.updateMany(
      { email: { $in: ['admin@platform.com', 'admin@transportplatform.com'] } },
      { $set: { role: 'admin', status: 'Active' } }
    );
    res.json({
      success: true,
      message: 'Admin roles successfully repaired to admin!',
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
app.use('/api/banners', bannerRoutes);

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
