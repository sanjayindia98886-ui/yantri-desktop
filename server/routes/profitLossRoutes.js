const express = require('express');
const router = express.Router();
const profitLossController = require('../controllers/profitLossController');

// ✅ Routes defined relative to /api/profit-loss
router.get('/', profitLossController.getProfitLoss);
router.post('/post-tp-comm', profitLossController.postTPCommEntry);
router.post('/delete-tp-comm', profitLossController.deleteTPCommEntry);

module.exports = router;