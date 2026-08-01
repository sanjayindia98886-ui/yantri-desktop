const db = require('../config/database');

// Database Schema Safe Guard (Ensure columns exist without dropping data)
db.serialize(function() {
  db.run("ALTER TABLE parties ADD COLUMN override_comm_perc REAL DEFAULT 0", function() {});
  db.run("ALTER TABLE parties ADD COLUMN override_comm_party TEXT DEFAULT ''", function() {});
  db.run("ALTER TABLE parties ADD COLUMN override_lc_perc REAL DEFAULT 0", function() {});
  db.run("ALTER TABLE parties ADD COLUMN override_lc_party TEXT DEFAULT ''", function() {});
});

// 1. FETCH ALL PARTIES (For both Admin & User - Read Only Access)
const getAllParties = function(req, res) {
  const query = "SELECT * FROM parties ORDER BY pno ASC";
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

  if (!party_name) {
    return res.status(400).json({ success: false, error: 'Party Name is required' });
  }

  const query = "INSERT INTO parties " +
    "(party_name, city, phone, d_comm, d_amt, a_comm, a_amt, patti_perc, lc_perc, hissa_party, hissa_patti_perc, override_comm_perc, override_comm_party, override_lc_perc, override_lc_party, status) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')";

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
      if (err.message && err.message.indexOf('UNIQUE') !== -1) {
        return res.status(400).json({ success: false, error: 'Party Name already exists!' });
      }
      return res.status(500).json({ success: false, error: err.message });
    }
    return res.json({ success: true, pno: this.lastID, message: 'Party created successfully' });
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

  if (!pno) {
    return res.status(400).json({ success: false, error: 'Party Number (pno) is required for update' });
  }

  const query = "UPDATE parties SET " +
    "party_name = ?, city = ?, phone = ?, d_comm = ?, d_amt = ?, " +
    "a_comm = ?, a_amt = ?, patti_perc = ?, lc_perc = ?, " +
    "hissa_party = ?, hissa_patti_perc = ?, status = ?, " +
    "override_comm_perc = ?, override_comm_party = ?, " +
    "override_lc_perc = ?, override_lc_party = ? " +
    "WHERE pno = ?";

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
    return res.json({ success: true, message: 'Party updated successfully' });
  });
};

// 4. DELETE PARTY
const deleteParty = function(req, res) {
  const pno = req.params.pno || (req.body ? req.body.pno : null);

  if (!pno) {
    return res.status(400).json({ success: false, error: 'Party Number (pno) is required' });
  }

  const query = "DELETE FROM parties WHERE pno = ?";
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