const db = require('../config/database');

// Safe Schema Guard
if (db.query) {
  db.query("ALTER TABLE parties ADD COLUMN IF NOT EXISTS override_comm_perc NUMERIC DEFAULT 0;", [], function() {});
  db.query("ALTER TABLE parties ADD COLUMN IF NOT EXISTS override_comm_party VARCHAR(255) DEFAULT '';", [], function() {});
  db.query("ALTER TABLE parties ADD COLUMN IF NOT EXISTS override_lc_perc NUMERIC DEFAULT 0;", [], function() {});
  db.query("ALTER TABLE parties ADD COLUMN IF NOT EXISTS override_lc_party VARCHAR(255) DEFAULT '';", [], function() {});
  db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_party_name VARCHAR(255) DEFAULT '';", [], function() {});
}

// Helper: Hissa Party ko Auto Agent banane ya Update karne ke liye
const syncHissaPartyAgent = function(hissaPartyName, companyId) {
  if (!hissaPartyName || !hissaPartyName.trim()) return;

  const cleanName = hissaPartyName.trim();
  const lowerUsername = cleanName.toLowerCase();
  const compId = companyId || 'DEMO_COMP_101';

  // Check if User already exists
  const checkQuery = "SELECT id FROM users WHERE LOWER(username) = $1 AND company_id = $2;";
  db.all(checkQuery, [lowerUsername, compId], function(err, rows) {
    if (err) {
      console.error("Agent check error:", err.message);
      return;
    }

    if (!rows || rows.length === 0) {
      // Auto Create Agent User with default Password '1234'
      const insertUser = "INSERT INTO users (username, password, role, company_id, linked_party_name) VALUES ($1, $2, 'agent', $3, $4);";
      db.run(insertUser, [lowerUsername, '1234', compId, cleanName], function(insertErr) {
        if (insertErr) console.error("Auto Agent Creation Error:", insertErr.message);
        else console.log("Auto Agent created for Hissa Party:", cleanName);
      });
    } else {
      // Update linked_party_name
      const updateUser = "UPDATE users SET linked_party_name = $1, role = 'agent' WHERE LOWER(username) = $2 AND company_id = $3;";
      db.run(updateUser, [cleanName, lowerUsername, compId], function(updateErr) {
        if (updateErr) console.error("Agent Link Update Error:", updateErr.message);
      });
    }
  });
};

// 1. FETCH ALL PARTIES
const getAllParties = function(req, res) {
  const query = "SELECT * FROM parties ORDER BY pno ASC;";
  db.all(query, [], function(err, rows) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    return res.json(rows || []);
  });
};

// 2. CREATE NEW PARTY
const createParty = function(req, res) {
  const body = req.body || {};
  const party_name = body.party_name;
  const city = body.city;
  const phone = body.phone;
  const d_comm = body.d_comm;
  const d_amt = body.d_amt;
  const a_comm = body.a_comm;
  const a_amt = body.a_amt;
  const patti_perc = body.patti_perc;
  const lc_perc = body.lc_perc;
  const hissa_party = body.hissa_party;
  const hissa_patti_perc = body.hissa_patti_perc;
  const override_comm_perc = body.override_comm_perc;
  const override_comm_party = body.override_comm_party;
  const override_lc_perc = body.override_lc_perc;
  const override_lc_party = body.override_lc_party;
  const company_id = body.company_id || 'DEMO_COMP_101';

  if (!party_name) {
    return res.status(400).json({ success: false, error: 'Party Name is required' });
  }

  const query = "INSERT INTO parties " +
    "(party_name, city, phone, d_comm, d_amt, a_comm, a_amt, patti_perc, lc_perc, hissa_party, hissa_patti_perc, override_comm_perc, override_comm_party, override_lc_perc, override_lc_party, status) " +
    "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'Active') RETURNING pno;";

  const params = [
    String(party_name).trim(),
    city ? String(city).trim() : '',
    phone ? String(phone).trim() : '',
    Number(d_comm) || 0,
    Number(d_amt) || 0,
    Number(a_comm) || 0,
    Number(a_amt) || 0,
    Number(patti_perc) || 0,
    Number(lc_perc) || 0,
    hissa_party ? String(hissa_party).trim() : '',
    Number(hissa_patti_perc) || 0,
    Number(override_comm_perc) || 0,
    override_comm_party ? String(override_comm_party).trim() : '',
    Number(override_lc_perc) || 0,
    override_lc_party ? String(override_lc_party).trim() : ''
  ];

  db.run(query, params, function(err) {
    if (err) {
      if (err.message && (err.message.indexOf('UNIQUE') !== -1 || err.message.indexOf('unique') !== -1)) {
        return res.status(400).json({ success: false, error: 'Party Name already exists!' });
      }
      return res.status(500).json({ success: false, error: err.message });
    }

    // Auto Link / Create Agent if Hissa Party is set
    if (hissa_party) {
      syncHissaPartyAgent(hissa_party, company_id);
    }

    const insertedPno = this && this.lastID ? this.lastID : 1;
    return res.json({ success: true, pno: insertedPno, message: 'Party created successfully' });
  });
};

// 3. UPDATE PARTY
const updateParty = function(req, res) {
  const body = req.body || {};
  const pno = body.pno;
  const party_name = body.party_name;
  const city = body.city;
  const phone = body.phone;
  const d_comm = body.d_comm;
  const d_amt = body.d_amt;
  const a_comm = body.a_comm;
  const a_amt = body.a_amt;
  const patti_perc = body.patti_perc;
  const lc_perc = body.lc_perc;
  const hissa_party = body.hissa_party;
  const hissa_patti_perc = body.hissa_patti_perc;
  const status = body.status;
  const override_comm_perc = body.override_comm_perc;
  const override_comm_party = body.override_comm_party;
  const override_lc_perc = body.override_lc_perc;
  const override_lc_party = body.override_lc_party;
  const company_id = body.company_id || 'DEMO_COMP_101';

  if (!pno) {
    return res.status(400).json({ success: false, error: 'Party Number (pno) is required for update' });
  }

  const query = "UPDATE parties SET " +
    "party_name = $1, city = $2, phone = $3, d_comm = $4, d_amt = $5, " +
    "a_comm = $6, a_amt = $7, patti_perc = $8, lc_perc = $9, " +
    "hissa_party = $10, hissa_patti_perc = $11, status = $12, " +
    "override_comm_perc = $13, override_comm_party = $14, " +
    "override_lc_perc = $15, override_lc_party = $16 " +
    "WHERE pno = $17;";

  const params = [
    String(party_name || '').trim(),
    city ? String(city).trim() : '',
    phone ? String(phone).trim() : '',
    Number(d_comm) || 0,
    Number(d_amt) || 0,
    Number(a_comm) || 0,
    Number(a_amt) || 0,
    Number(patti_perc) || 0,
    Number(lc_perc) || 0,
    hissa_party ? String(hissa_party).trim() : '',
    Number(hissa_patti_perc) || 0,
    status || 'Active',
    Number(override_comm_perc) || 0,
    override_comm_party ? String(override_comm_party).trim() : '',
    Number(override_lc_perc) || 0,
    override_lc_party ? String(override_lc_party).trim() : '',
    pno
  ];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    // Auto Link / Create Agent if Hissa Party is set
    if (hissa_party) {
      syncHissaPartyAgent(hissa_party, company_id);
    }

    return res.json({ success: true, message: 'Party updated successfully' });
  });
};

// 4. DELETE PARTY
const deleteParty = function(req, res) {
  const pno = req.params.pno || (req.body ? req.body.pno : null);

  if (!pno) {
    return res.status(400).json({ success: false, error: 'Party Number (pno) is required' });
  }

  const query = "DELETE FROM parties WHERE pno = $1;";
  db.run(query, [pno], function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    return res.json({ success: true, message: 'Party deleted successfully' });
  });
};

module.exports = {
  getAllParties: getAllParties,
  createParty: createParty,
  updateParty: updateParty,
  deleteParty: deleteParty
};