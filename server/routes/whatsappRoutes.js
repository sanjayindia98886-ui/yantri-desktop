const express = require('express');
const router = express.Router();
const { processWhatsAppBatch } = require('../controllers/whatsappController');

// WhatsApp Batch Entry Endpoint
// Route URL: POST http://localhost:5000/api/whatsapp/batch
router.post('/batch', processWhatsAppBatch);

module.exports = router;