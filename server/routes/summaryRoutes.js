const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summaryController');

// GET: /api/summary (Fetch F7 Summary data)
router.get('/', summaryController.getSummary);

module.exports = router;