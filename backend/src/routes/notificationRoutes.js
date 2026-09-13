const express = require('express');
const router = express.Router();
const { getNotifications } = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);
router.get('/', getNotifications);

module.exports = router;
