const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// F10 Account Ledger Endpoints
router.get('/', accountController.getAccountHistory);
router.post('/save', accountController.saveAccountEntry);
router.delete('/delete/:id', accountController.deleteAccountEntry);

module.exports = router;