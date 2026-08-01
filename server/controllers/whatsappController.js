const db = require('../config/database'); // yantriController वाला सेम पाथ

exports.processWhatsAppBatch = (req, res) => {
  const { userId, marketName, partyName, entries, grandTotal } = req.body;

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ success: false, message: 'No entries provided' });
  }

  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const currentDateTime = new Date().toLocaleString();

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. sales टेबल में इंसर्ट
    const saleQuery = 'INSERT INTO sales (sale_date, game_name, party_name, total_amount, uid, entry_date_time) VALUES (?, ?, ?, ?, ?, ?)';
    
    db.run(saleQuery, [currentDate, marketName || 'DB', partyName || 'kumar', grandTotal || 0, String(userId || '1'), currentDateTime], function (err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ success: false, message: 'Sale insert failed', error: err.message });
      }

      const saleId = this.lastID;

      // 2. sale_items टेबल में नंबर और अमाउंट इंसर्ट (number_val कॉलम यूज़ किया है)
      const itemQuery = 'INSERT INTO sale_items (sale_id, number_val, amount, bet_type) VALUES (?, ?, ?, ?)';
      const stmt = db.prepare(itemQuery);

      let hasError = false;

      entries.forEach((entry) => {
        if (entry.bets && Array.isArray(entry.bets)) {
          entry.bets.forEach((b) => {
            stmt.run([saleId, String(b.number), b.amount, b.type || 'Direct'], (itemErr) => {
              if (itemErr) hasError = true;
            });
          });
        }
      });

      stmt.finalize((finalizeErr) => {
        if (hasError || finalizeErr) {
          db.run('ROLLBACK');
          return res.status(500).json({ success: false, message: 'Item insert failed' });
        }

        db.run('COMMIT', (commitErr) => {
          if (commitErr) {
            return res.status(500).json({ success: false, message: 'Commit failed' });
          }
          return res.json({ success: true, message: 'WhatsApp entries saved successfully', saleId: saleId });
        });
      });
    });
  });
};