const express = require('express');
const router = express.Router();
const { getBusOffer, updateBusOffer } = require('../controllers/settingsController');
const { verifyToken, adminAuth } = require('../middleware/auth');

// Public read-only endpoint for customer app & public consumption
router.get('/bus-offer', getBusOffer);

// Protected update endpoint for Super Admin
router.put('/bus-offer', verifyToken, adminAuth, updateBusOffer);

module.exports = router;
