const db = require('../config/database');

// 1. Submit / Update Result (Auto-replace if same date & game exist, no popups)
const submitResult = (req, res) => {
  const r = req.body;
  const dateVal = r.date || r.resultDate || r.result_date;
  const gameVal = r.shift || r.game || r.game_name;
  const winVal = r.result || r.result_val || r.winning_number;

  if (!dateVal || !gameVal || winVal === undefined || winVal === '') {
    return res.status(400).json({ error: "Missing required fields (date, game, result)" });
  }

  const cleanDate = String(dateVal).trim();
  const cleanGame = String(gameVal).trim();
  const cleanWin = String(winVal).trim().padStart(2, '0');

  // Check if result already exists for the same date and game
  const checkQuery = "SELECT result_id FROM results WHERE LOWER(TRIM(result_date)) = LOWER(TRIM(?)) AND LOWER(TRIM(game_name)) = LOWER(TRIM(?))";

  db.get(checkQuery, [cleanDate, cleanGame], (err, existingRow) => {
    if (err) {
      return res.status(500).json({ error: "DB Check Error: " + err.message });
    }

    if (existingRow) {
      // Update existing result automatically without prompting/popups
      const updateQuery = "UPDATE results SET winning_number = ? WHERE result_id = ?";
      db.run(updateQuery, [cleanWin, existingRow.result_id], function (uErr) {
        if (uErr) {
          return res.status(500).json({ error: "DB Update Error: " + uErr.message });
        }
        return res.json({ success: true, message: "Result updated successfully" });
      });
    } else {
      // Insert new result if not declared yet
      const insertQuery = "INSERT INTO results (result_date, game_name, winning_number) VALUES (?, ?, ?)";
      db.run(insertQuery, [cleanDate, cleanGame, cleanWin], function (iErr) {
        if (iErr) {
          return res.status(500).json({ error: "DB Insert Error: " + iErr.message });
        }
        return res.json({ success: true, message: "Result submitted successfully" });
      });
    }
  });
};

// 2. Get Result History
const getResultHistory = (req, res) => {
  const { fromDate, toDate } = req.query;
  let query = "SELECT result_id AS id, result_date AS date, game_name AS shift, winning_number AS result FROM results ORDER BY result_id DESC LIMIT 50";
  let params = [];

  if (fromDate && toDate) {
    query = "SELECT result_id AS id, result_date AS date, game_name AS shift, winning_number AS result FROM results WHERE result_date BETWEEN ? AND ? ORDER BY result_id DESC";
    params = [fromDate, toDate];
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
};

// 3. Get Pending Results with Clear / Pending Status (Synced with Game Master)
const getPendingResults = (req, res) => {
  const dateVal = String(req.query.date || '').trim();

  const gamesQuery = "SELECT game_name FROM games";
  db.all(gamesQuery, [], (gErr, gameRows) => {
    let allGames = ['GB', 'DN', 'FB', 'DS', 'ND', 'PATNA'];
    if (!gErr && gameRows && gameRows.length > 0) {
      allGames = gameRows.map(function(g) { return String(g.game_name || '').toUpperCase().trim(); });
    }

    const query = "SELECT game_name, winning_number FROM results WHERE LOWER(TRIM(result_date)) = LOWER(TRIM(?))";
    db.all(query, [dateVal], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const declaredMap = {};
      (rows || []).forEach(function (r) {
        const gName = String(r.game_name || '').toUpperCase().trim();
        declaredMap[gName] = String(r.winning_number || '').padStart(2, '0');
      });

      const gameStatuses = allGames.map(function (g) {
        const isDeclared = declaredMap.hasOwnProperty(g);
        return {
          shift: g,
          status: isDeclared ? 'Clear' : 'Pending',
          isDeclared: isDeclared,
          winningNumber: isDeclared ? declaredMap[g] : null
        };
      });

      res.json(gameStatuses);
    });
  });
};

// 4. Delete Result by ID or Date+Game
const deleteResult = (req, res) => {
  const resultId = req.params.id;
  const dateVal = req.query.date || req.body.date;
  const gameVal = req.query.game || req.body.game || req.query.shift || req.body.shift;

  if (resultId && resultId !== 'undefined' && resultId !== 'null') {
    const deleteQuery = "DELETE FROM results WHERE result_id = ?";
    db.run(deleteQuery, [resultId], function (err) {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      return res.json({ success: true, message: "Result deleted successfully" });
    });
  } else if (dateVal && gameVal) {
    const cleanDate = String(dateVal).trim();
    const cleanGame = String(gameVal).trim();
    const deleteQueryByGame = "DELETE FROM results WHERE LOWER(TRIM(result_date)) = LOWER(TRIM(?)) AND LOWER(TRIM(game_name)) = LOWER(TRIM(?))";
    
    db.run(deleteQueryByGame, [cleanDate, cleanGame], function (err) {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      return res.json({ success: true, message: "Result deleted successfully" });
    });
  } else {
    return res.status(400).json({ success: false, error: "Result ID or Date/Game parameters required" });
  }
};

module.exports = {
  submitResult,
  getResultHistory,
  getPendingResults,
  deleteResult
};