const express = require('express');
const router = express.Router();
const { getSaleLCData, postLCEntry, deleteLCEntry } = require('../controllers/saleLCController');

// GET LC Data (https://yantri-desktop.onrender.com/api/sale-lc)
router.get('/', getSaleLCData);

// POST LC Entries (https://yantri-desktop.onrender.com/api/sale-lc/post-lc)
router.post('/post-lc', postLCEntry);

// DELETE LC Entry (https://yantri-desktop.onrender.com/api/sale-lc/delete-lc)
router.post('/delete-lc', deleteLCEntry);

module.exports = router;