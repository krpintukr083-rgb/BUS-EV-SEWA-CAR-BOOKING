const express = require('express');
const { getActiveSchedules } = require('../controllers/workflowController');
const router = express.Router();
// Public customer catalogue: controller also verifies the referenced vehicle is Active.
router.get('/', getActiveSchedules);
module.exports = router;
