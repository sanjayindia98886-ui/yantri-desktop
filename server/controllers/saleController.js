const db = require('../config/database');

// Helper to determine bet_type automatically (Ander, Bahar, or Direct)
function detectBetType(numberVal, betTypeVal) {
  const nVal = String(numberVal || '').trim().toUpperCase();
  let bType = String(betTypeVal || '').trim().toLowerCase();

  if (bType && bType !== 'direct' && bType !== 'undefined') {
    return bType;
  }

  if (/^(000|111|222|333|444|555|666|777|888|999)$/.test(nVal) || nVal.includes('B')) {
    return 'Bahar';
  }

  if (nVal.includes('A')) {
    return 'Ander';
  }

  return 'Direct';
}

// Helper to format EntryDateTime using the selected F2 Form Date + Current Time
function buildEntryDateTime(selectedFormDate) {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm;

  if (selectedFormDate && selectedFormDate.trim() !== '') {
    return selectedFormDate.trim() + ' ' + timeStr;
  }

  const day = String(now.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  return day + '/' + month + '/' + year + ' ' + timeStr;
}

// 1. Save New Voucher Sale (Pass logged-in operator's UID & Patti Perc)
const saveVoucherSale = (req, res) => {
  const date = String(req.body.date || '').trim();
  const game = String(req.body.game || '').trim();
  const party = String(req.body.party || '').trim();
  const uid = String(req.body.uid || '1').trim();
  const hissaParty = String(req.body.hissaParty || '').trim();
  const hissaPerc = String(req.body.hissaPerc || '0').trim();
  const d_comm = Number(req.body.d_comm) || 10;
  const d_amt = Number(req.body.d_amt) || 90;
  const a_comm = Number(req.body.a_comm) || 10;
  const a_amt = Number(req.body.a_amt) || 9;
  const patti_perc = Number(req.body.patti_perc) || 0;
  const items = req.body.items || [];

  if (!party) {
    return res.status(400).json({ success: false, error: 'Party name is required' });
  }

  let total_amount = 0;
  items.forEach(function (it) {
    total_amount += (Number(it.amount) || 0);
  });

  const entryDateTime = buildEntryDateTime(date);
  const thirdPartyHissaStr = hissaParty ? (hissaParty + ' ' + hissaPerc + '%') : '0';

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    const insertSaleQuery = "INSERT INTO sales (sale_date, game_name, party_name, total_amount, uid, entry_date_time, third_party_hissa, d_comm, d_amt, a_comm, a_amt, patti_perc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    db.run(insertSaleQuery, [date, game, party, total_amount, uid, entryDateTime, thirdPartyHissaStr, d_comm, d_amt, a_comm, a_amt, patti_perc], function (err) {
      if (err) {
        // Fallback 1: If sales table lacks patti_perc column
        const fallbackQuery1 = "INSERT INTO sales (sale_date, game_name, party_name, total_amount, uid, entry_date_time, third_party_hissa, d_comm, d_amt, a_comm, a_amt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        db.run(fallbackQuery1, [date, game, party, total_amount, uid, entryDateTime, thirdPartyHissaStr, d_comm, d_amt, a_comm, a_amt], function (fbErr1) {
          if (fbErr1) {
            // Fallback 2: Basic columns
            const fallbackQuery2 = "INSERT INTO sales (sale_date, game_name, party_name, total_amount, uid, entry_date_time, third_party_hissa) VALUES (?, ?, ?, ?, ?, ?, ?)";
            db.run(fallbackQuery2, [date, game, party, total_amount, uid, entryDateTime, thirdPartyHissaStr], function (fbErr2) {
              if (fbErr2) {
                db.run("ROLLBACK");
                return res.status(500).json({ success: false, error: fbErr2.message });
              }
              processItems(this.lastID);
            });
          } else {
            processItems(this.lastID);
          }
        });
      } else {
        processItems(this.lastID);
      }

      function processItems(saleId) {
        if (items.length > 0) {
          const stmt = db.prepare("INSERT INTO sale_items (sale_id, number_val, amount, bet_type) VALUES (?, ?, ?, ?)");
          for (let i = 0; i < items.length; i++) {
            const numVal = String(items[i].number_val || items[i].no || '').trim();
            const amtVal = Number(items[i].amount) || 0;
            const betTypeVal = detectBetType(numVal, items[i].bet_type || items[i].type);

            stmt.run([saleId, numVal, amtVal, betTypeVal]);
          }
          stmt.finalize((stmtErr) => {
            if (stmtErr) {
              db.run("ROLLBACK");
              return res.status(500).json({ success: false, error: stmtErr.message });
            }
            db.run("COMMIT", (commitErr) => {
              if (commitErr) return res.status(500).json({ success: false, error: commitErr.message });
              return res.json({ success: true, message: 'Voucher Saved Successfully', saleId: saleId, entry_date_time: entryDateTime });
            });
          });
        } else {
          db.run("COMMIT", (commitErr) => {
            if (commitErr) return res.status(500).json({ success: false, error: commitErr.message });
            return res.json({ success: true, message: 'Voucher Saved Successfully', saleId: saleId, entry_date_time: entryDateTime });
          });
        }
      }
    });
  });
};

// 2. Fetch Summary for Right Side Table
const getPartySalesSummary = (req, res) => {
  const date = String(req.query.date || '').trim();
  const game = String(req.query.game || '').trim();
  const userId = req.query.userId ? String(req.query.userId).trim() : null;
  const role = req.query.role ? String(req.query.role).trim() : null;

  let query = "SELECT s.sale_id, s.party_name, s.total_amount AS party_total, s.uid, s.entry_date_time, s.third_party_hissa, " +
    "COALESCE(s.d_comm, p.d_comm, 10) AS d_comm, COALESCE(s.d_amt, p.d_amt, 90) AS d_amt, " +
    "COALESCE(s.a_comm, p.a_comm, 10) AS a_comm, COALESCE(s.a_amt, p.a_amt, 9) AS a_amt, " +
    "COALESCE(s.patti_perc, p.patti_perc, 0) AS patti_perc " +
    "FROM sales s " +
    "LEFT JOIN parties p ON LOWER(TRIM(s.party_name)) = LOWER(TRIM(p.party_name)) " +
    "WHERE LOWER(TRIM(s.sale_date)) = LOWER(TRIM(?)) " +
    "AND LOWER(TRIM(s.game_name)) = LOWER(TRIM(?)) ";

  const params = [date, game];

  if (role !== 'super_admin' && userId) {
    query += " AND CAST(s.uid AS TEXT) = CAST(? AS TEXT) ";
    params.push(userId);
  }

  query += " ORDER BY s.sale_id ASC";

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching sales list:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
};

// 3. Fetch Specific Voucher Items
const getVoucherDetails = (req, res) => {
  const saleId = req.params.saleId;
  const query = "SELECT number_val AS no, amount, bet_type FROM sale_items WHERE sale_id = ? ORDER BY item_id ASC";

  db.all(query, [saleId], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, items: rows || [] });
  });
};

// 4. Update Existing Voucher Sale
const updateVoucherSale = (req, res) => {
  const saleId = req.params.saleId;
  const items = req.body.items || [];
  const party = String(req.body.party || '').trim();
  const date = String(req.body.date || '').trim();

  if (!party) {
    return res.status(400).json({ success: false, error: 'Party name is required' });
  }

  let total_amount = 0;
  items.forEach(function (it) {
    total_amount += (Number(it.amount) || 0);
  });

  const entryDateTime = buildEntryDateTime(date);

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    const updateQuery = "UPDATE sales SET party_name = ?, total_amount = ?, entry_date_time = ? WHERE sale_id = ?";
    db.run(updateQuery, [party, total_amount, entryDateTime, saleId], (err) => {
      if (err) {
        db.run("ROLLBACK");
        return res.status(500).json({ success: false, error: err.message });
      }

      db.run("DELETE FROM sale_items WHERE sale_id = ?", [saleId], (delErr) => {
        if (delErr) {
          db.run("ROLLBACK");
          return res.status(500).json({ success: false, error: delErr.message });
        }

        if (items.length > 0) {
          const stmt = db.prepare("INSERT INTO sale_items (sale_id, number_val, amount, bet_type) VALUES (?, ?, ?, ?)");
          for (let i = 0; i < items.length; i++) {
            const numVal = String(items[i].number_val || items[i].no || '').trim();
            const amtVal = Number(items[i].amount) || 0;
            const betTypeVal = detectBetType(numVal, items[i].bet_type || items[i].type);

            stmt.run([saleId, numVal, amtVal, betTypeVal]);
          }
          stmt.finalize((stmtErr) => {
            if (stmtErr) {
              db.run("ROLLBACK");
              return res.status(500).json({ success: false, error: stmtErr.message });
            }
            db.run("COMMIT", (commitErr) => {
              if (commitErr) return res.status(500).json({ success: false, error: commitErr.message });
              return res.json({ success: true, message: 'Voucher Updated Successfully', entry_date_time: entryDateTime });
            });
          });
        } else {
          db.run("COMMIT", (commitErr) => {
            if (commitErr) return res.status(500).json({ success: false, error: commitErr.message });
            return res.json({ success: true, message: 'Voucher Updated Successfully', entry_date_time: entryDateTime });
          });
        }
      });
    });
  });
};

// 5. Delete Voucher Sale
const deleteVoucherSale = (req, res) => {
  const saleId = req.params.saleId;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    db.run("DELETE FROM sale_items WHERE sale_id = ?", [saleId], (err1) => {
      if (err1) {
        db.run("ROLLBACK");
        return res.status(500).json({ success: false, error: err1.message });
      }
      db.run("DELETE FROM sales WHERE sale_id = ?", [saleId], (err2) => {
        if (err2) {
          db.run("ROLLBACK");
          return res.status(500).json({ success: false, error: err2.message });
        }
        db.run("COMMIT", (commitErr) => {
          if (commitErr) return res.status(500).json({ success: false, error: commitErr.message });
          return res.json({ success: true, message: 'Voucher Deleted Successfully' });
        });
      });
    });
  });
};

// 6. Move Voucher Sale (Updated to save new Rates & Patti Perc)
const moveVoucherSale = (req, res) => {
  const saleId = req.params.saleId;
  const newDate = String(req.body.newDate || '').trim();
  const newGame = String(req.body.newGame || '').trim();
  const newParty = String(req.body.newParty || '').trim();

  const d_comm = Number(req.body.d_comm) || 10;
  const d_amt = Number(req.body.d_amt) || 90;
  const a_comm = Number(req.body.a_comm) || 10;
  const a_amt = Number(req.body.a_amt) || 9;
  const patti_perc = Number(req.body.patti_perc) || 0;

  if (!newDate || !newGame || !newParty) {
    return res.status(400).json({ success: false, error: 'Date, Game, and Party are required for moving' });
  }

  const moveQuery = "UPDATE sales SET sale_date = ?, game_name = ?, party_name = ?, d_comm = ?, d_amt = ?, a_comm = ?, a_amt = ?, patti_perc = ? WHERE sale_id = ?";
  db.run(moveQuery, [newDate, newGame, newParty, d_comm, d_amt, a_comm, a_amt, patti_perc, saleId], function (err) {
    if (err) {
      // Fallback if rate columns are missing
      const fallbackQuery = "UPDATE sales SET sale_date = ?, game_name = ?, party_name = ? WHERE sale_id = ?";
      db.run(fallbackQuery, [newDate, newGame, newParty, saleId], function (fbErr) {
        if (fbErr) {
          return res.status(500).json({ success: false, error: fbErr.message });
        }
        return res.json({ success: true, message: 'Voucher Moved Successfully' });
      });
    } else {
      return res.json({ success: true, message: 'Voucher Moved Successfully' });
    }
  });
};

module.exports = {
  saveVoucherSale,
  getPartySalesSummary,
  getVoucherDetails,
  updateVoucherSale,
  deleteVoucherSale,
  moveVoucherSale
};