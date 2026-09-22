const express = require('express');
const router = express.Router();
const {
  getBanners,
  getActiveBanners,
  createBanner,
  updateBanner,
  toggleBannerStatus,
  deleteBanner
} = require('../controllers/bannerController');
const { verifyToken, adminAuth } = require('../middleware/auth');
const { handleSingleUpload } = require('../middleware/upload');

// Public route for Customer App
router.get('/active', getActiveBanners);
router.get('/customer', getActiveBanners);

// Protected Admin Routes
router.get('/', verifyToken, adminAuth, getBanners);
router.post('/', verifyToken, adminAuth, handleSingleUpload('bannerImage'), createBanner);
router.put('/:id', verifyToken, adminAuth, handleSingleUpload('bannerImage'), updateBanner);
router.patch('/:id/status', verifyToken, adminAuth, toggleBannerStatus);
router.delete('/:id', verifyToken, adminAuth, deleteBanner);

module.exports = router;
