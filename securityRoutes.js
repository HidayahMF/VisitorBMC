const express = require('express');
const { authenticate } = require('../middleware/auth');
const { overviewHandler } = require('../controllers/securityController');

const router = express.Router();

router.use(authenticate);

router.get('/overview', overviewHandler);

module.exports = router;