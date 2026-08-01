const express = require('express');
const router = express.Router();

// पुरानी रिपोर्ट कंट्रोलर फाइल से ही कनेक्ट करें
const reportController = require('../controllers/reportController');

// F8 Balance History Report
router.get('/', reportController.getBalanceHistory);
router.get('/balance-history', reportController.getBalanceHistory);

module.exports = router;