const express = require('express');
const router = express.Router();
const { getPolicies, getPolicyByType } = require('../controllers/policyController');

router.get('/', getPolicies);
router.get('/:type', getPolicyByType);

module.exports = router;
