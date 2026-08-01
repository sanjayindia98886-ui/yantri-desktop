const express = require('express');
const router = express.Router();

// पुरानी रिपोर्ट कंट्रोलर फाइल
const reportController = require('../controllers/reportController');

// F7 Summary Report
router.get('/summary', reportController.getSummaryReport);

// F11 Balance Sheet Report
router.get('/balance-sheet', reportController.getBalanceSheet);

module.exports = router;