const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

router.get('/', gameController.getAllGames);
router.post('/', gameController.addGame);
router.delete('/:id', gameController.deleteGame);

module.exports = router;