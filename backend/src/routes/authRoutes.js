const express = require('express');
const router = express.Router();
const { login, getMe, register } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', register);
router.get('/me', verifyToken, getMe);

module.exports = router;

