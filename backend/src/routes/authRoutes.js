const express = require('express');
const router = express.Router();
const {
  login,
  getMe,
  register,
  driverRegister,
  registerSendOtp,
  driverRegisterSendOtp,
  sendOtp,
  verifyOtp
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', register);
router.post('/register/send-otp', registerSendOtp);
router.post('/driver-register', driverRegister);
router.post('/driver-register/send-otp', driverRegisterSendOtp);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', verifyToken, getMe);

const { forgotPasswordSendOtp, forgotPasswordVerifyOtp, forgotPasswordReset } = require('../controllers/authController');
router.post('/password-reset/send-otp', forgotPasswordSendOtp);
router.post('/password-reset/verify-otp', forgotPasswordVerifyOtp);
router.post('/password-reset/set-password', forgotPasswordReset);

module.exports = router;
