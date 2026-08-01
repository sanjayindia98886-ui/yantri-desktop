const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');

router.post('/submit', resultController.submitResult);
router.get('/history', resultController.getResultHistory);
router.get('/pending', resultController.getPendingResults);

// Delete Routes (ID aur Date/Game dono tarike se delete karne ke liye)
router.delete('/delete/by-game', resultController.deleteResult);
router.delete('/delete/:id', resultController.deleteResult);

module.exports = router;