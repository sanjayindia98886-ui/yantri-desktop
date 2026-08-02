const express = require('express');
const router = express.Router();
const { processWhatsAppBatch } = require('../controllers/whatsappController');

// WhatsApp Batch Entry Endpoint
// Route URL: POST https://yantri-desktop.onrender.com/api/whatsapp/batch
router.post('/batch', processWhatsAppBatch);

module.exports = router;