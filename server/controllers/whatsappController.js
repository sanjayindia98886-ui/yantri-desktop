const db = require('../config/database'); // yantriController वाला सेम पाथ

// Helper function to format date consistently (DD/MM/YYYY or YYYY-MM-DD format support)
function getFormattedDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return day + '/' + month + '/' + year;
}

function getFormattedDateTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm;
  return getFormattedDate() + ' ' + timeStr;
}

exports.processWhatsAppBatch = async (req, res) => {
  const { userId, marketName, partyName, entries, grandTotal, selectedDate } = req.body;

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ success: false, message: 'No entries provided' });
  }

  // Use selected form date if passed from front-end, else use current date
  const currentDate = (selectedDate && String(selectedDate).trim() !== '') ? String(selectedDate).trim() : getFormattedDate();
  const currentDateTime = getFormattedDateTime();

  try {
    // 1. Insert into sales table and GET the exact sale_id back from Supabase using RETURNING sale_id
    const saleQuery = "INSERT INTO sales (sale_date, game_name, party_name, total_amount, uid, entry_date_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING sale_id;";
    
    const saleParams = [
      currentDate, 
      marketName || 'DB', 
      partyName || 'kumar', 
      grandTotal || 0, 
      String(userId || '1'), 
      currentDateTime
    ];

    const result = await db.query(saleQuery, saleParams);
    
    const saleId = result.rows && result.rows[0] ? result.rows[0].sale_id : null;

    if (!saleId) {
      throw new Error("Supabase did not return sale_id for WhatsApp import");
    }

    // 2. Insert into sale_items table
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.bets && Array.isArray(entry.bets)) {
        for (let j = 0; j < entry.bets.length; j++) {
          const b = entry.bets[j];
          const itemQuery = "INSERT INTO sale_items (sale_id, number_val, amount, bet_type) VALUES ($1, $2, $3, $4);";
          await db.query(itemQuery, [saleId, String(b.number), b.amount, b.type || 'Direct']);
        }
      }
    }

    // Success response with created saleId and sale_date
    return res.json({ 
      success: true, 
      message: 'WhatsApp entries saved successfully', 
      saleId: saleId,
      sale_date: currentDate
    });

  } catch (err) {
    console.error("WhatsApp Batch Import Error:", err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'WhatsApp Batch Insert Failed', 
      error: err.message 
    });
  }
};