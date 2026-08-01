const db = require('../config/database');

// Helper function for DB Queries (Promises)
const dbRun = function(sql, params) {
  if (!params) params = [];
  return new Promise(function(resolve, reject) {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbAll = function(sql, params) {
  if (!params) params = [];
  return new Promise(function(resolve, reject) {
    db.all(sql, params, function(err, rows) {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// 1. Upload Local Sale to Staging Table (User Action - Complete Voucher & Items Sync)
exports.uploadSale = async function(req, res) {
  try {
    const date = req.body.date;
    const game = req.body.game;
    const userId = req.body.userId;
    const shift = req.body.shift;
    let vouchers = req.body.vouchers;

    if (vouchers && !Array.isArray(vouchers)) {
      vouchers = [vouchers];
    }

    if (!vouchers || !Array.isArray(vouchers) || vouchers.length === 0) {
      return res.status(400).json({ status: false, message: 'No valid vouchers provided for upload.' });
    }

    const fallbackUserId = userId || (req.user && req.user.id) || '1';
    const fallbackShift = shift || '1';

    for (let i = 0; i < vouchers.length; i++) {
      const v = vouchers[i];
      const partyId = v.partyId || v.party_id || v.pno || '0';
      const partyName = v.partyName || v.party_name || v.pname || 'Unknown';
      const amount = v.amount || v.total_amount || 0;

      const pendingQuery = "INSERT INTO pending_sales (sale_date, game_name, uid, shift, party_id, party_name, total_amount, voucher_data, status, uploaded_on) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', DATETIME('now', 'localtime'))";
      
      const voucherJsonStr = typeof v === 'object' ? JSON.stringify(v) : v;

      const pendingParams = [
        date, 
        game, 
        fallbackUserId, 
        fallbackShift, 
        partyId, 
        partyName, 
        amount, 
        voucherJsonStr
      ];

      await dbRun(pendingQuery, pendingParams);
    }

    // Insert entry into upload logs
    const logQuery = "INSERT INTO upload_logs (sale_date, game_name, uid, shift, entry_date_time) VALUES (?, ?, ?, ?, DATETIME('now', 'localtime'))";
    const logParams = [date, game, fallbackUserId, fallbackShift];

    await dbRun(logQuery, logParams);

    const successMsg = 'Sale uploaded successfully for ' + game + ' (' + date + ')';
    return res.status(200).json({ status: true, message: successMsg });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 2. Upload F1 Party Accounts to Server (Admin Action - All Rates & Commission)
exports.uploadParty = async function(req, res) {
  try {
    const parties = req.body.parties;
    if (!parties || !Array.isArray(parties)) {
      return res.status(400).json({ status: false, message: 'No parties provided to upload.' });
    }

    for (let i = 0; i < parties.length; i++) {
      const p = parties[i];
      const partyQuery = "INSERT INTO server_parties (pno, party_name, opening_balance, d_comm, d_amt, a_comm, a_amt, patti_perc, lc_perc, hissa_party, hissa_patti_perc, override_lc_party, override_lc_perc) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(pno) DO UPDATE SET " +
        "party_name = excluded.party_name, " +
        "opening_balance = excluded.opening_balance, " +
        "d_comm = excluded.d_comm, " +
        "d_amt = excluded.d_amt, " +
        "a_comm = excluded.a_comm, " +
        "a_amt = excluded.a_amt, " +
        "patti_perc = excluded.patti_perc, " +
        "lc_perc = excluded.lc_perc, " +
        "hissa_party = excluded.hissa_party, " +
        "hissa_patti_perc = excluded.hissa_patti_perc, " +
        "override_lc_party = excluded.override_lc_party, " +
        "override_lc_perc = excluded.override_lc_perc";
      
      const partyParams = [
        p.pno || p.id, 
        p.party_name || p.name, 
        p.opening_balance || 0,
        p.d_comm || 10,
        p.d_amt || 90,
        p.a_comm || 10,
        p.a_amt || 9,
        p.patti_perc || 0,
        p.lc_perc || 5,
        p.hissa_party || '',
        p.hissa_patti_perc || 0,
        p.override_lc_party || '',
        p.override_lc_perc || 0
      ];

      await dbRun(partyQuery, partyParams);
    }

    return res.status(200).json({ status: true, message: 'Parties synced to server successfully.' });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 3. Download F1 Party Accounts from Server (User Action - Full Master Sync)
exports.downloadParty = async function(req, res) {
  try {
    const serverParties = await dbAll("SELECT * FROM server_parties");
    
    for (let i = 0; i < serverParties.length; i++) {
      const p = serverParties[i];
      
      const syncQuery = "INSERT OR REPLACE INTO parties (pno, party_name, opening_balance, d_comm, d_amt, a_comm, a_amt, patti_perc, lc_perc, hissa_party, hissa_patti_perc, override_lc_party, override_lc_perc) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      
      const params = [
        p.pno, 
        p.party_name, 
        p.opening_balance || 0,
        p.d_comm || 10,
        p.d_amt || 90,
        p.a_comm || 10,
        p.a_amt || 9,
        p.patti_perc || 0,
        p.lc_perc || 5,
        p.hissa_party || '',
        p.hissa_patti_perc || 0,
        p.override_lc_party || '',
        p.override_lc_perc || 0
      ];

      await dbRun(syncQuery, params);
    }

    return res.status(200).json({ 
      status: true, 
      message: 'Party accounts downloaded successfully.',
      parties: serverParties 
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 4. Download Server Sales into Main Party Ledger (Admin Action - FULL SALES + SALE ITEMS FIX)
exports.downloadSale = async function(req, res) {
  try {
    const date = req.body.date;
    const game = req.body.game;

    const selectQuery = "SELECT * FROM pending_sales WHERE LOWER(TRIM(sale_date)) = LOWER(TRIM(?)) AND UPPER(TRIM(game_name)) = UPPER(TRIM(?)) AND status = 'PENDING'";
    const pendingSales = await dbAll(selectQuery, [date, game]);

    if (!pendingSales || pendingSales.length === 0) {
      return res.status(400).json({ status: false, message: 'No pending sales found for selected Date & Game.' });
    }

    for (let i = 0; i < pendingSales.length; i++) {
      const pending = pendingSales[i];
      let vData = {};
      
      try {
        vData = typeof pending.voucher_data === 'string' ? JSON.parse(pending.voucher_data) : (pending.voucher_data || {});
      } catch(e) {
        vData = {};
      }

      // 1. Insert into main 'sales' table
      const insertSaleQuery = "INSERT INTO sales (sale_date, game_name, uid, shift, party_name, total_amount, d_comm, d_amt, a_comm, a_amt, patti_perc, entry_date_time) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      
      const insertParams = [
        pending.sale_date, 
        pending.game_name, 
        pending.uid, 
        pending.shift, 
        pending.party_name, 
        pending.total_amount,
        vData.d_comm || null,
        vData.d_amt || null,
        vData.a_comm || null,
        vData.a_amt || null,
        vData.patti_perc || null,
        pending.uploaded_on
      ];

      const result = await dbRun(insertSaleQuery, insertParams);
      const insertedSaleId = result.lastID; // Newly generated sale_id

      // 2. Insert into 'sale_items' (For F7/F11/F12 Automatic Calculation)
      const items = vData.items || vData.bets || vData.sale_items || [];
      if (Array.isArray(items) && items.length > 0) {
        for (let j = 0; j < items.length; j++) {
          const item = items[j];
          const itemQuery = "INSERT INTO sale_items (sale_id, number_val, amount, bet_type) VALUES (?, ?, ?, ?)";
          await dbRun(itemQuery, [
            insertedSaleId, 
            item.number_val || item.number || item.num, 
            item.amount || item.amt || 0, 
            item.bet_type || item.type || 'JODI'
          ]);
        }
      }
    }

    // Mark pending_sales as PROCESSED
    const updateStatusQuery = "UPDATE pending_sales SET status = 'PROCESSED' WHERE LOWER(TRIM(sale_date)) = LOWER(TRIM(?)) AND UPPER(TRIM(game_name)) = UPPER(TRIM(?))";
    await dbRun(updateStatusQuery, [date, game]);

    const msg = 'Server sales downloaded and posted to Party Ledgers with items for ' + game + ' (' + date + ')';
    return res.status(200).json({ status: true, message: msg });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 5. Delete Downloaded Vouchers Cache
exports.deleteDownloadedVouchers = async function(req, res) {
  try {
    await dbRun("DELETE FROM pending_sales WHERE status = 'PROCESSED'");
    return res.status(200).json({ status: true, message: 'Downloaded vouchers cleared.' });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 6. Delete Sale With Opening
exports.deleteSaleWithOpening = async function(req, res) {
  try {
    const tillDate = req.body.tillDate;
    await dbRun("DELETE FROM sales WHERE sale_date <= ?", [tillDate]);
    
    const msg = 'Sales deleted up to ' + tillDate + '. Opening balances preserved.';
    return res.status(200).json({ status: true, message: msg });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 7. Delete Sale Without Opening
exports.deleteSaleWithoutOpening = async function(req, res) {
  try {
    const type = req.body.type;
    const tillDate = req.body.tillDate;
    const partyId = req.body.partyId;

    let query = "DELETE FROM sales WHERE sale_date <= ?";
    let params = [tillDate];

    if (type === 'Selected Party' && partyId) {
      query = query + " AND party_name IN (SELECT party_name FROM parties WHERE pno = ? OR id = ?)";
      params.push(partyId, partyId);
    }

    await dbRun(query, params);
    return res.status(200).json({ status: true, message: 'Sales deleted without changing opening balance.' });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 8. Delete Party Account
exports.deleteAccount = async function(req, res) {
  try {
    const type = req.body.type;
    const partyId = req.body.partyId;

    let query = "DELETE FROM parties";
    let params = [];

    if (type === 'Selected Party' && partyId) {
      query = query + " WHERE pno = ? OR id = ?";
      params.push(partyId, partyId);
    }

    await dbRun(query, params);
    return res.status(200).json({ status: true, message: 'Account(s) deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 9. User Sale Summary Query
exports.getUserSaleSummary = async function(req, res) {
  try {
    const date = req.query.date;
    const game = req.query.game;

    const saleDate = String(date || '').trim();
    const gameName = String(game || '').trim().toUpperCase();

    const query = "SELECT uid AS userId, SUM(total_amount) AS amount FROM pending_sales " +
      "WHERE LOWER(TRIM(sale_date)) = LOWER(TRIM(?)) AND UPPER(TRIM(game_name)) = ? " +
      "GROUP BY uid ORDER BY uid ASC";

    const rows = await dbAll(query, [saleDate, gameName]);
    let total = 0;
    
    const summary = (rows || []).map(function(row) {
      const amt = Number(row.amount) || 0;
      total = total + amt;
      return { userId: row.userId || '1', amount: amt.toFixed(1) };
    });

    return res.status(200).json({ summary: summary, totalAmount: total.toFixed(1) });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// 10. User Sale Upload Logs Query
exports.getUserSaleLogs = async function(req, res) {
  try {
    const date = req.query.date;
    const shift = req.query.shift;

    const logDate = String(date || '').trim();
    const currentShift = String(shift || '').trim();

    const allUsers = await dbAll("SELECT username AS userId FROM users WHERE LOWER(role) = 'user' ORDER BY username ASC");

    let logQuery = "SELECT sale_date AS saleDate, shift, uid AS userId, entry_date_time AS uploadedOn FROM upload_logs WHERE LOWER(TRIM(sale_date)) = LOWER(TRIM(?))";
    let logParams = [logDate];

    if (currentShift) {
      logQuery = logQuery + " AND LOWER(TRIM(shift)) = LOWER(TRIM(?))";
      logParams.push(currentShift);
    }

    const uploadedRows = await dbAll(logQuery, logParams);

    const logs = (allUsers || []).map(function(u) {
      const found = (uploadedRows || []).find(function(row) {
        return String(row.userId).toLowerCase() === String(u.userId).toLowerCase();
      });

      if (found) {
        return {
          saleDate: found.saleDate || logDate,
          shift: found.shift || currentShift || '1',
          userId: u.userId,
          uploadedOn: found.uploadedOn || ''
        };
      } else {
        return {
          saleDate: logDate,
          shift: currentShift || '-',
          userId: u.userId,
          uploadedOn: 'PENDING'
        };
      }
    });

    return res.status(200).json({ logs: logs });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};