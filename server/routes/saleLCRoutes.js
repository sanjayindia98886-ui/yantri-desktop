const express = require('express');
const router = express.Router();
const { getSaleLCData, postLCEntry, deleteLCEntry } = require('../controllers/saleLCController');

// GET LC Data (http://localhost:5000/api/sale-lc)
router.get('/', getSaleLCData);

// POST LC Entries (http://localhost:5000/api/sale-lc/post-lc)
router.post('/post-lc', postLCEntry);

// DELETE LC Entry (http://localhost:5000/api/sale-lc/delete-lc)
router.post('/delete-lc', deleteLCEntry);

module.exports = router;