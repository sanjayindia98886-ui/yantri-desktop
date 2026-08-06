const db = require('../config/database');

// Helper function to safely evaluate Truthy values (handles true, 1, '1', 'true')
function parseBit(val) {
  if (val === true || val === 1 || val === '1' || val === 'true') {
    return 1;
  }
  return 0;
}

// Helper to normalize permissions object so frontend receives both key formats seamlessly
function normalizePermissions(row, userId, role) {
  if (!row) return getDefaultPermissions(userId, role);
  
  return {
    user_id: row.user_id || userId,
    f1_party: parseBit(row.f1_party),
    f2_voucher_sale: parseBit(row.f2_voucher_sale),
    f3_voucher_yantri: parseBit(row.f3_voucher_yantri),
    f4_yantri: parseBit(row.f4_yantri),
    f5_master: parseBit(row.f5_master),
    f6_result: parseBit(row.f6_result),
    f7_summary: parseBit(row.f7_summary),
    f8_balance_history: parseBit(row.f8_balance_history),
    f9_sale_lc: parseBit(row.f9_sale_lc),
    f10_account: parseBit(row.f10_account),
    f11_balance_sheet: parseBit(row.f11_balance_sheet),
    f12_profit_loss: parseBit(row.f12_profit_loss),
    game_access: parseBit(row.game_access),
    can_edit_party: parseBit(row.can_edit_party),
    can_delete_voucher: parseBit(row.can_delete_voucher),
    f5_sync_mode: row.f5_sync_mode || 'user'
  };
}

// Default Permission Object
function getDefaultPermissions(userId, role) {
  const isUserRole = String(role || '').toLowerCase() === 'user';
  return {
    user_id: userId,
    f1_party: 1,
    f2_voucher_sale: 1,
    f3_voucher_yantri: 0,
    f4_yantri: 0,
    f5_master: isUserRole ? 1 : 0,
    f6_result: 0,
    f7_summary: 0,
    f8_balance_history: 0,
    f9_sale_lc: 0,
    f10_account: 0,
    f11_balance_sheet: 0,
    f12_profit_loss: 0,
    game_access: 0,
    can_edit_party: 0,
    can_delete_voucher: 0,
    f5_sync_mode: 'user'
  };
}

// 1. Fetch All Users
const getUsers = (req, res) => {
  const query = "SELECT id, username, role, linked_party_name FROM users ORDER BY id ASC";
  db.query(query, [], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(result ? result.rows : []);
  });
};

// 2. Fetch Permissions for Selected User (Normalized)
const getUserPermissions = (req, res) => {
  const userId = req.params.userId;
  const query = "SELECT * FROM permissions WHERE user_id = $1";
  db.query(query, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const row = result && result.rows ? result.rows[0] : null;
    const perms = normalizePermissions(row, Number(userId), 'user');
    res.json(perms);
  });
};

// 3. Update User Permissions (Fixed Tick/Untick Savings)
const updateUserPermissions = (req, res) => {
  const userId = req.params.userId;
  const p = req.body || {};

  const f1 = parseBit(p.f1_party !== undefined ? p.f1_party : p.f1Party);
  const f2 = parseBit(p.f2_voucher_sale !== undefined ? p.f2_voucher_sale : p.f2VoucherSale);
  const f3 = parseBit(p.f3_voucher_yantri !== undefined ? p.f3_voucher_yantri : p.f3VoucherYantri);
  const f4 = parseBit(p.f4_yantri !== undefined ? p.f4_yantri : p.f4Yantri);
  const f5 = parseBit(p.f5_master !== undefined ? p.f5_master : p.f5Master);
  const f6 = parseBit(p.f6_result !== undefined ? p.f6_result : p.f6Result);
  const f7 = parseBit(p.f7_summary !== undefined ? p.f7_summary : p.f7Summary);
  const f8 = parseBit(p.f8_balance_history !== undefined ? p.f8_balance_history : p.f8BalanceHistory);
  const f9 = parseBit(p.f9_sale_lc !== undefined ? p.f9_sale_lc : p.f9SaleLc);
  const f10 = parseBit(p.f10_account !== undefined ? p.f10_account : p.f10Account);
  const f11 = parseBit(p.f11_balance_sheet !== undefined ? p.f11_balance_sheet : p.f11BalanceSheet);
  const f12 = parseBit(p.f12_profit_loss !== undefined ? p.f12_profit_loss : p.f12ProfitLoss);
  const game = parseBit(p.game_access !== undefined ? p.game_access : p.gameAccess);
  const editParty = parseBit(p.can_edit_party !== undefined ? p.can_edit_party : p.canEditParty);
  const delVoucher = parseBit(p.can_delete_voucher !== undefined ? p.can_delete_voucher : p.canDeleteVoucher);
  const syncMode = p.f5_sync_mode || 'user';

  const upsertQuery =
    "INSERT INTO permissions (" +
    "user_id, f1_party, f2_voucher_sale, f3_voucher_yantri, f4_yantri, f5_master, f6_result, " +
    "f7_summary, f8_balance_history, f9_sale_lc, f10_account, f11_balance_sheet, f12_profit_loss, " +
    "game_access, can_edit_party, can_delete_voucher, f5_sync_mode" +
    ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) " +
    "ON CONFLICT(user_id) DO UPDATE SET " +
    "f1_party = EXCLUDED.f1_party, " +
    "f2_voucher_sale = EXCLUDED.f2_voucher_sale, " +
    "f3_voucher_yantri = EXCLUDED.f3_voucher_yantri, " +
    "f4_yantri = EXCLUDED.f4_yantri, " +
    "f5_master = EXCLUDED.f5_master, " +
    "f6_result = EXCLUDED.f6_result, " +
    "f7_summary = EXCLUDED.f7_summary, " +
    "f8_balance_history = EXCLUDED.f8_balance_history, " +
    "f9_sale_lc = EXCLUDED.f9_sale_lc, " +
    "f10_account = EXCLUDED.f10_account, " +
    "f11_balance_sheet = EXCLUDED.f11_balance_sheet, " +
    "f12_profit_loss = EXCLUDED.f12_profit_loss, " +
    "game_access = EXCLUDED.game_access, " +
    "can_edit_party = EXCLUDED.can_edit_party, " +
    "can_delete_voucher = EXCLUDED.can_delete_voucher, " +
    "f5_sync_mode = EXCLUDED.f5_sync_mode";

  const params = [
    userId, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12,
    game, editParty, delVoucher, syncMode
  ];

  db.query(upsertQuery, params, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: "Permissions updated successfully" });
  });
};

// 4. Create New User / Agent
const createUser = (req, res) => {
  const { username, password, role, linked_party_name } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const userRole = role ? role.toLowerCase() : 'user';
  const linkedParty = linked_party_name || (userRole === 'agent' ? username.trim() : '');

  const insertUserQuery = "INSERT INTO users (username, password, role, linked_party_name) VALUES ($1, $2, $3, $4) RETURNING id";

  db.query(insertUserQuery, [username.trim(), password.trim(), userRole, linkedParty], (err, result) => {
    if (err) {
      if (err.message && err.message.includes('unique')) {
        return res.status(400).json({ error: "Username already exists" });
      }
      return res.status(500).json({ error: err.message });
    }

    const newUserId = result && result.rows && result.rows[0] ? result.rows[0].id : null;
    const isUserRole = userRole === 'user';
    const f5MasterVal = isUserRole ? 1 : 0;

    if (!newUserId) {
      return res.json({ success: true, message: "User created successfully" });
    }

    const insertPermQuery =
      "INSERT INTO permissions (" +
      "user_id, f1_party, f2_voucher_sale, f3_voucher_yantri, f4_yantri, f5_master, " +
      "f6_result, f7_summary, f8_balance_history, f9_sale_lc, f10_account, f11_balance_sheet, " +
      "f12_profit_loss, game_access, can_edit_party, can_delete_voucher, f5_sync_mode" +
      ") VALUES ($1, 1, 1, 0, 0, $2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'user') " +
      "ON CONFLICT(user_id) DO NOTHING";

    db.query(insertPermQuery, [newUserId, f5MasterVal], (permErr) => {
      if (permErr) {
        console.error("Permission init error:", permErr.message);
      }
      return res.json({ success: true, message: "User created successfully", userId: newUserId });
    });
  });
};

// 5. User Login Controller
const loginUser = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  const sqlUser = "SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM($1)) AND password = $2";
  
  db.query(sqlUser, [username.trim(), password.trim()], (err, result) => {
    if (err) {
      console.error("Login Error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    const userRow = result && result.rows ? result.rows[0] : null;

    if (!userRow) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const sqlPerm = "SELECT * FROM permissions WHERE user_id = $1";
    db.query(sqlPerm, [userRow.id], (permErr, permResult) => {
      if (permErr) {
        console.error("Perm Fetch Error:", permErr);
      }

      const permRow = permResult && permResult.rows ? permResult.rows[0] : null;
      const finalPerms = normalizePermissions(permRow, userRow.id, userRow.role);

      return res.json({
        success: true,
        user: {
          id: userRow.id,
          username: userRow.username,
          role: userRow.role,
          linked_party_name: userRow.linked_party_name || ''
        },
        permissions: finalPerms
      });
    });
  });
};

// 6. Change Password Controller
const changePassword = (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "UserId, old password and new password are required" });
  }

  const verifySql = "SELECT * FROM users WHERE id = $1 AND password = $2";
  db.query(verifySql, [userId, oldPassword.trim()], (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    const userRow = result && result.rows ? result.rows[0] : null;

    if (!userRow) {
      return res.status(400).json({ success: false, message: "पुराना पासवर्ड गलत है!" });
    }

    const updateSql = "UPDATE users SET password = $1 WHERE id = $2";
    db.query(updateSql, [newPassword.trim(), userId], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ success: false, message: updateErr.message });
      }
      return res.json({ success: true, message: "पासवर्ड सफलतापूर्वक बदल गया है!" });
    });
  });
};

module.exports = {
  getUsers,
  getUserPermissions,
  updateUserPermissions,
  createUser,
  loginUser,
  changePassword
};