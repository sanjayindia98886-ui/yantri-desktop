const express = require('express');
const router = express.Router();
const partyController = require('../controllers/partyController');

// 1. Get All Parties
router.get('/', partyController.getAllParties);

// 2. Create New Party
router.post('/', partyController.createParty);

// 3. Update Existing Party
router.put('/', partyController.updateParty);

// 4. Delete Party
router.delete('/:pno', partyController.deleteParty);

module.exports = router;