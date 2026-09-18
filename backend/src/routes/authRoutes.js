const express = require('express');
const router = express.Router();
const {
  login,
  getMe,
  register,
  driverRegister,
  sendOtp,
  verifyOtp
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', register);
router.post('/driver-register', driverRegister);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', verifyToken, getMe);

module.exports = router;
