const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

// Upload Routes
router.post('/upload-sale', masterController.uploadSale);
router.post('/upload-party', masterController.uploadParty);

// Download Routes
router.post('/download-sale', masterController.downloadSale);
router.post('/download-party', masterController.downloadParty); // <--- User ke liye F1 Download Route add kar diya hai

// Delete Routes
router.post('/delete-downloaded-vouchers', masterController.deleteDownloadedVouchers);
router.post('/delete-sale-with-opening', masterController.deleteSaleWithOpening);
router.post('/delete-sale-without-opening', masterController.deleteSaleWithoutOpening);
router.post('/delete-account', masterController.deleteAccount);

// Query / Summary Routes
router.get('/user-sale-summary', masterController.getUserSaleSummary);
router.get('/user-sale-logs', masterController.getUserSaleLogs);

module.exports = router;