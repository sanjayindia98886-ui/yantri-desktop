const db = require('../config/database');

// Helper function for DB Queries (Supabase PostgreSQL Compatible)
const dbQuery = function(sql, params) {
  if (!params) params = [];
  return new Promise(function(resolve, reject) {
    db.query(sql, params, function(err, result) {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

// 1. Submit / Update Result (Auto-replace if same date & game exist, no popups)
const submitResult = async (req, res) => {
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

  try {
    // Check if result already exists for the same date and game
    const checkQuery = "SELECT result_id FROM results WHERE LOWER(TRIM(result_date)) = LOWER(TRIM($1)) AND LOWER(TRIM(game_name)) = LOWER(TRIM($2));";
    const checkRes = await dbQuery(checkQuery, [cleanDate, cleanGame]);
    const rows = checkRes ? (checkRes.rows || checkRes) : [];
    const existingRow = rows && rows.length > 0 ? rows[0] : null;

    if (existingRow) {
      // Update existing result automatically without prompting/popups
      const updateQuery = "UPDATE results SET winning_number = $1 WHERE result_id = $2;";
      await dbQuery(updateQuery, [cleanWin, existingRow.result_id]);
      return res.json({ success: true, message: "Result updated successfully" });
    } else {
      // Insert new result if not declared yet
      const insertQuery = "INSERT INTO results (result_date, game_name, winning_number) VALUES ($1, $2, $3);";
      await dbQuery(insertQuery, [cleanDate, cleanGame, cleanWin]);
      return res.json({ success: true, message: "Result submitted successfully" });
    }
  } catch (err) {
    console.error("submitResult Error:", err.message);
    return res.status(500).json({ error: "DB Processing Error: " + err.message });
  }
};

// 2. Get Result History
const getResultHistory = async (req, res) => {
  const { fromDate, toDate } = req.query;
  let query = "SELECT result_id AS id, result_date AS date, game_name AS shift, winning_number AS result FROM results ORDER BY result_id DESC LIMIT 50;";
  let params = [];

  if (fromDate && toDate) {
    query = "SELECT result_id AS id, result_date AS date, game_name AS shift, winning_number AS result FROM results WHERE result_date BETWEEN $1 AND $2 ORDER BY result_id DESC;";
    params = [fromDate, toDate];
  }

  try {
    const resDb = await dbQuery(query, params);
    const rows = resDb ? (resDb.rows || resDb) : [];
    return res.json(rows || []);
  } catch (err) {
    console.error("getResultHistory Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 3. Get Pending Results with Clear / Pending Status (Synced with Game Master)
const getPendingResults = async (req, res) => {
  const dateVal = String(req.query.date || '').trim();

  try {
    let allGames = ['GB', 'DN', 'FB', 'DS', 'ND', 'PATNA'];
    
    try {
      const gamesQuery = "SELECT game_name FROM games;";
      const gamesRes = await dbQuery(gamesQuery, []);
      const gameRows = gamesRes ? (gamesRes.rows || gamesRes) : [];
      if (gameRows && gameRows.length > 0) {
        allGames = gameRows.map(function(g) { return String(g.game_name || '').toUpperCase().trim(); });
      }
    } catch (gErr) {
      // Fallback to default games list if games table is not present
    }

    const query = "SELECT game_name, winning_number FROM results WHERE LOWER(TRIM(result_date)) = LOWER(TRIM($1));";
    const resDb = await dbQuery(query, [dateVal]);
    const rows = resDb ? (resDb.rows || resDb) : [];

    const declaredMap = {};
    (rows || []).forEach(function (r) {
      const gName = String(r.game_name || '').toUpperCase().trim();
      declaredMap[gName] = String(r.winning_number || '').padStart(2, '0');
    });

    const gameStatuses = allGames.map(function (g) {
      const isDeclared = Object.prototype.hasOwnProperty.call(declaredMap, g);
      return {
        shift: g,
        status: isDeclared ? 'Clear' : 'Pending',
        isDeclared: isDeclared,
        winningNumber: isDeclared ? declaredMap[g] : null
      };
    });

    return res.json(gameStatuses);
  } catch (err) {
    console.error("getPendingResults Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 4. Delete Result by ID or Date+Game
const deleteResult = async (req, res) => {
  const resultId = req.params.id;
  const dateVal = req.query.date || req.body.date;
  const gameVal = req.query.game || req.body.game || req.query.shift || req.body.shift;

  try {
    if (resultId && resultId !== 'undefined' && resultId !== 'null') {
      const deleteQuery = "DELETE FROM results WHERE result_id = $1;";
      await dbQuery(deleteQuery, [resultId]);
      return res.json({ success: true, message: "Result deleted successfully" });
    } else if (dateVal && gameVal) {
      const cleanDate = String(dateVal).trim();
      const cleanGame = String(gameVal).trim();
      const deleteQueryByGame = "DELETE FROM results WHERE LOWER(TRIM(result_date)) = LOWER(TRIM($1)) AND LOWER(TRIM(game_name)) = LOWER(TRIM($2));";
      await dbQuery(deleteQueryByGame, [cleanDate, cleanGame]);
      return res.json({ success: true, message: "Result deleted successfully" });
    } else {
      return res.status(400).json({ success: false, error: "Result ID or Date/Game parameters required" });
    }
  } catch (err) {
    console.error("deleteResult Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  submitResult,
  getResultHistory,
  getPendingResults,
  deleteResult
};