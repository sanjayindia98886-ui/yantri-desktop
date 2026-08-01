const express = require('express');
const router = express.Router();
const yantriController = require('../controllers/yantriController');

// Yantri Grid Data Route
router.get('/grid', yantriController.getYantriGridData);

// High Amt (Party / Client Tracer) Route
router.get('/trace-client', yantriController.traceClientByAmt);

module.exports = router;