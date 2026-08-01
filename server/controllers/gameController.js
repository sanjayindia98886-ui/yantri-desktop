const db = require('../config/database');

// 1. Ensure Table Exists & Fetch All Games
const getAllGames = function(req, res) {
  const createTableQuery = 'CREATE TABLE IF NOT EXISTS games (' +
    'game_id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
    'game_name TEXT UNIQUE NOT NULL' +
  ')';

  db.run(createTableQuery, [], function(cErr) {
    if (cErr) {
      return res.status(500).json({ success: false, message: cErr.message });
    }

    const selectQuery = 'SELECT game_id, game_name FROM games ORDER BY game_id ASC';
    db.all(selectQuery, [], function(sErr, rows) {
      if (sErr) {
        return res.status(500).json({ success: false, message: sErr.message });
      }
      return res.json({ success: true, games: rows || [] });
    });
  });
};

// 2. Add New Game
const addGame = function(req, res) {
  const gameName = req.body.game_name ? String(req.body.game_name).toUpperCase().trim() : '';

  if (!gameName) {
    return res.status(400).json({ success: false, message: 'Game name is required' });
  }

  const insertQuery = 'INSERT INTO games (game_name) VALUES (?)';
  db.run(insertQuery, [gameName], function(err) {
    if (err) {
      if (err.message.indexOf('UNIQUE') !== -1) {
        return res.status(400).json({ success: false, message: 'यह गेम पहले से मौजूद है!' });
      }
      return res.status(500).json({ success: false, message: err.message });
    }
    return res.json({ success: true, message: 'Game added successfully', game_id: this.lastID });
  });
};

// 3. Delete Game
const deleteGame = function(req, res) {
  const gameId = req.params.id;

  if (!gameId) {
    return res.status(400).json({ success: false, message: 'Game ID is required' });
  }

  const deleteQuery = 'DELETE FROM games WHERE game_id = ?';
  db.run(deleteQuery, [gameId], function(err) {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    return res.json({ success: true, message: 'Game deleted successfully' });
  });
};

module.exports = {
  getAllGames: getAllGames,
  addGame: addGame,
  deleteGame: deleteGame
};