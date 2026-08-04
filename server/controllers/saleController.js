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
const saveVoucherSale = async (req, res) => {
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

  try {
    const insertSaleQuery = "INSERT INTO sales (sale_date, game_name, party_name, total_amount, uid, entry_date_time, third_party_hissa, d_comm, d_amt, a_comm, a_amt, patti_perc) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING sale_id;";
    
    const saleParams = [date, game, party, total_amount, uid, entryDateTime, thirdPartyHissaStr, d_comm, d_amt, a_comm, a_amt, patti_perc];
    
    const result = await db.query(insertSaleQuery, saleParams);
    
    const insertedSaleId = result.rows && result.rows[0] ? result.rows[0].sale_id : null;

    if (!insertedSaleId) {
      throw new Error("Supabase did not return inserted sale_id");
    }

    if (items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const numVal = String(items[i].number_val || items[i].no || '').trim();
        const amtVal = Number(items[i].amount) || 0;
        const betTypeVal = detectBetType(numVal, items[i].bet_type || items[i].type);

        const itemQuery = "INSERT INTO sale_items (sale_id, number_val, amount, bet_type) VALUES ($1, $2, $3, $4);";
        await db.query(itemQuery, [insertedSaleId, numVal, amtVal, betTypeVal]);
      }
    }

    return res.json({ 
      success: true, 
      message: 'Voucher Saved Successfully', 
      saleId: insertedSaleId, 
      entry_date_time: entryDateTime 
    });

  } catch (err) {
    console.error("Voucher Save Server Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 2. Fetch Summary for Right Side Table
const getPartySalesSummary = async (req, res) => {
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
    "WHERE LOWER(TRIM(s.sale_date)) = LOWER(TRIM($1)) " +
    "AND LOWER(TRIM(s.game_name)) = LOWER(TRIM($2)) ";

  const params = [date, game];

  if (role !== 'super_admin' && userId) {
    query += " AND CAST(s.uid AS TEXT) = CAST($3 AS TEXT) ";
    params.push(userId);
  }

  query += " ORDER BY s.sale_id ASC";

  try {
    const result = await db.query(query, params);
    return res.json(result.rows || []);
  } catch (err) {
    console.error('Error fetching sales list:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 3. Fetch Specific Voucher Items
const getVoucherDetails = async (req, res) => {
  const saleId = req.params.saleId;
  const query = "SELECT number_val AS no, amount, bet_type FROM sale_items WHERE sale_id = $1 ORDER BY item_id ASC";

  try {
    const result = await db.query(query, [saleId]);
    return res.json({ success: true, items: result.rows || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 4. Update Existing Voucher Sale
const updateVoucherSale = async (req, res) => {
  const saleId = req.params.saleId;
  const items = req.body.items || [];
  const party = String(req.body.party || '').trim();
  const date = String(req.body.date || '').trim();
  const hissaParty = String(req.body.hissaParty || '').trim();
  const hissaPerc = String(req.body.hissaPerc || '0').trim();
  const d_comm = Number(req.body.d_comm) || 10;
  const d_amt = Number(req.body.d_amt) || 90;
  const a_comm = Number(req.body.a_comm) || 10;
  const a_amt = Number(req.body.a_amt) || 9;
  const patti_perc = Number(req.body.patti_perc) || 0;

  if (!party) {
    return res.status(400).json({ success: false, error: 'Party name is required' });
  }

  let total_amount = 0;
  items.forEach(function (it) {
    total_amount += (Number(it.amount) || 0);
  });

  const entryDateTime = buildEntryDateTime(date);
  const thirdPartyHissaStr = hissaParty ? (hissaParty + ' ' + hissaPerc + '%') : '0';

  try {
    const updateQuery = "UPDATE sales SET party_name = $1, total_amount = $2, entry_date_time = $3, d_comm = $4, d_amt = $5, a_comm = $6, a_amt = $7, patti_perc = $8, third_party_hissa = $9 WHERE sale_id = $10;";
    await db.query(updateQuery, [party, total_amount, entryDateTime, d_comm, d_amt, a_comm, a_amt, patti_perc, thirdPartyHissaStr, saleId]);

    const deleteItemsQuery = "DELETE FROM sale_items WHERE sale_id = $1;";
    await db.query(deleteItemsQuery, [saleId]);

    if (items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const numVal = String(items[i].number_val || items[i].no || '').trim();
        const amtVal = Number(items[i].amount) || 0;
        const betTypeVal = detectBetType(numVal, items[i].bet_type || items[i].type);

        const insertItemQuery = "INSERT INTO sale_items (sale_id, number_val, amount, bet_type) VALUES ($1, $2, $3, $4);";
        await db.query(insertItemQuery, [saleId, numVal, amtVal, betTypeVal]);
      }
    }

    return res.json({ 
      success: true, 
      message: 'Voucher Updated Successfully', 
      entry_date_time: entryDateTime 
    });

  } catch (err) {
    console.error("Voucher Update Server Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 5. Delete Voucher Sale
const deleteVoucherSale = async (req, res) => {
  const saleId = req.params.saleId;

  try {
    await db.query("DELETE FROM sale_items WHERE sale_id = $1;", [saleId]);
    await db.query("DELETE FROM sales WHERE sale_id = $1;", [saleId]);

    return res.json({ success: true, message: 'Voucher Deleted Successfully' });
  } catch (err) {
    console.error("Voucher Delete Server Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// 6. Move Voucher Sale (Updated to save new Rates & Patti Perc)
const moveVoucherSale = async (req, res) => {
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

  try {
    const moveQuery = "UPDATE sales SET sale_date = $1, game_name = $2, party_name = $3, d_comm = $4, d_amt = $5, a_comm = $6, a_amt = $7, patti_perc = $8 WHERE sale_id = $9;";
    await db.query(moveQuery, [newDate, newGame, newParty, d_comm, d_amt, a_comm, a_amt, patti_perc, saleId]);

    return res.json({ success: true, message: 'Voucher Moved Successfully' });
  } catch (err) {
    try {
      const fallbackQuery = "UPDATE sales SET sale_date = $1, game_name = $2, party_name = $3 WHERE sale_id = $4;";
      await db.query(fallbackQuery, [newDate, newGame, newParty, saleId]);
      return res.json({ success: true, message: 'Voucher Moved Successfully' });
    } catch (fbErr) {
      console.error("Voucher Move Server Error:", fbErr.message);
      return res.status(500).json({ success: false, error: fbErr.message });
    }
  }
};

module.exports = {
  saveVoucherSale,
  getPartySalesSummary,
  getVoucherDetails,
  updateVoucherSale,
  deleteVoucherSale,
  moveVoucherSale
};