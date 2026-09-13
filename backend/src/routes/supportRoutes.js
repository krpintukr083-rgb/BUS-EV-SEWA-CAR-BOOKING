const express = require('express');
const router = express.Router();
const { createSupportTicket, getCustomerSupport } = require('../controllers/supportController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.post('/', createSupportTicket);
router.get('/', getCustomerSupport);

module.exports = router;
