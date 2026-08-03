 const db = require('../config/database');

// Date conversion helper (DD/MM/YYYY -> YYYY-MM-DD for accurate date range filtering)
function toIsoDate(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (str.indexOf('/') !== -1) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const dd = parts[0].padStart(2, '0');
      const mm = parts[1].padStart(2, '0');
      const yyyy = parts[2];
      return yyyy + '-' + mm + '-' + dd;
    }
  }
  return str;
}

// 1. Fetch History Entries for F10 Grid
const getAccountHistory = function(req, res) {
  try {
    const party = String(req.query.party || 'All').trim();
    const type = String(req.query.type || 'All').trim();
    const fromDateRaw = String(req.query.fromDate || '').trim();
    const toDateRaw = String(req.query.toDate || '').trim();

    let query = "SELECT entry_id AS acc_id, entry_date AS date_val, party_name, " +
      "description, debit_amt, credit_amt " +
      "FROM ledger_entries WHERE 1=1 ";
    
    const params = [];

    // Filter by Party
    if (party !== 'All' && party !== '') {
      query += "AND LOWER(TRIM(party_name)) = LOWER(TRIM($1)) ";
      params.push(party);
    }

    query += "ORDER BY entry_id DESC;";

    db.all(query, params, function(err, rows) {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      const isoFromDate = fromDateRaw ? toIsoDate(fromDateRaw) : '';
      const isoToDate = toDateRaw ? toIsoDate(toDateRaw) : '';

      const safeRows = rows || [];

      // Accurate Filtering in JavaScript
      const filteredRows = safeRows.filter(function(r) {
        const isoEntryDate = toIsoDate(r.date_val);

        if (isoFromDate && isoEntryDate < isoFromDate) return false;
        if (isoToDate && isoEntryDate > isoToDate) return false;

        const isCredit = Number(r.credit_amt || 0) > 0;
        const isDebit = Number(r.debit_amt || 0) > 0;

        if (type === 'Receipt/Liye' && !isCredit) return false;
        if (type === 'Payment/Diye' && !isDebit) return false;

        return true;
      });

      const formattedRows = filteredRows.map(function(r) {
        const creditAmt = Number(r.credit_amt || 0);
        const debitAmt = Number(r.debit_amt || 0);

        // Correct Rule: Credit = Receipt/Liye (जमा/लिए), Debit = Payment/Diye (दिए/नामे)
        const isReceipt = creditAmt > 0;
        const amt = isReceipt ? creditAmt : debitAmt;
        const transType = isReceipt ? 'Receipt/Liye' : 'Payment/Diye';

        let oppParty = '';
        let cleanNarration = r.description || '';

        if (cleanNarration.indexOf('[Opposite:') !== -1) {
          const parts = cleanNarration.split('[Opposite:');
          cleanNarration = parts[0].trim();
          if (parts[1]) {
            oppParty = parts[1].replace(']', '').trim();
          }
        }

        return {
          acc_id: r.acc_id,
          date_val: r.date_val,
          party_name: r.party_name,
          opposite_party: oppParty,
          amount: amt,
          type: transType,
          debit_amt: debitAmt,
          credit_amt: creditAmt,
          narration: cleanNarration
        };
      });

      return res.json({ success: true, rows: formattedRows });
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Save or Update Account Entry (Flexible: Payment/Diye OR Receipt/Liye)
const saveAccountEntry = function(req, res) {
  try {
    const acc_id = req.body.acc_id;
    const party_name = String(req.body.party_name || '').trim();
    const opposite_party = String(req.body.opposite_party || '').trim();
    const date_val = String(req.body.date_val || '').trim();
    const amount = Number(req.body.amount) || 0;
    const narration = String(req.body.narration || '').trim();
    const transType = String(req.body.type || req.body.transType || 'Payment/Diye').trim();

    if (!party_name || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Party Name and valid Amount are required' });
    }

    // Accounting Fix:
    // Receipt/Liye => credit_amt (पार्टी का बकाया घटा/जमा हुआ)
    // Payment/Diye => debit_amt (पार्टी को दिए/बकाया बढ़ा)
    let debitAmt = 0;
    let creditAmt = 0;

    if (transType.indexOf('Receipt') !== -1 || transType.indexOf('Liye') !== -1 || transType === 'Credit') {
      creditAmt = amount;
      debitAmt = 0;
    } else {
      debitAmt = amount;
      creditAmt = 0;
    }

    let mainDesc = narration;
    if (opposite_party) {
      mainDesc = (narration ? narration + ' ' : '') + '[Opposite: ' + opposite_party + ']';
    }

    if (acc_id) {
      // Update Existing Entry
      const updateQuery = "UPDATE ledger_entries SET " +
        "entry_date = $1, party_name = $2, description = $3, debit_amt = $4, credit_amt = $5 " +
        "WHERE entry_id = $6;";

      db.run(updateQuery, [date_val, party_name, mainDesc, debitAmt, creditAmt, acc_id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        return res.json({ success: true, message: 'Transaction updated successfully' });
      });
    } else {
      // Insert Main Entry
      const insertQuery = "INSERT INTO ledger_entries " +
        "(entry_date, party_name, description, debit_amt, credit_amt) " +
        "VALUES ($1, $2, $3, $4, $5);";

      db.run(insertQuery, [date_val, party_name, mainDesc, debitAmt, creditAmt], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });

        // Opposite Party Entry (Reverse Debit/Credit for opposite party)
        if (opposite_party) {
          const oppDebitAmt = creditAmt;  // Agar main Party ka Credit hai toh Opposite ka Debit hoga
          const oppCreditAmt = debitAmt; // Agar main Party ka Debit hai toh Opposite ka Credit hoga
          const oppDesc = (narration ? narration + ' ' : '') + '[Opposite: ' + party_name + ']';

          db.run(insertQuery, [date_val, opposite_party, oppDesc, oppDebitAmt, oppCreditAmt], function(oppErr) {
            if (oppErr) console.error('Error inserting opposite entry:', oppErr.message);
          });
        }

        return res.json({ success: true, message: 'Transaction saved successfully' });
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Delete Account Entry
const deleteAccountEntry = function(req, res) {
  try {
    const acc_id = req.params.id;

    if (!acc_id) {
      return res.status(400).json({ success: false, error: 'Entry ID is required' });
    }

    const deleteQuery = "DELETE FROM ledger_entries WHERE entry_id = $1;";
    db.run(deleteQuery, [acc_id], function(err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      return res.json({ success: true, message: 'Transaction deleted successfully' });
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAccountHistory: getAccountHistory,
  saveAccountEntry: saveAccountEntry,
  deleteAccountEntry: deleteAccountEntry
};