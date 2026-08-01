const db = require('../config/database');

// Ensure permissions table exists with proper schema and user_id PRIMARY KEY
db.run(
  "CREATE TABLE IF NOT EXISTS permissions (" +
    "user_id INTEGER PRIMARY KEY, " +
    "f1_party INTEGER DEFAULT 1, " +
    "f2_voucher_sale INTEGER DEFAULT 1, " +
    "f3_voucher_yantri INTEGER DEFAULT 0, " +
    "f4_yantri INTEGER DEFAULT 0, " +
    "f5_master INTEGER DEFAULT 0, " +
    "f6_result INTEGER DEFAULT 0, " +
    "f7_summary INTEGER DEFAULT 0, " +
    "f8_balance_history INTEGER DEFAULT 0, " +
    "f9_sale_lc INTEGER DEFAULT 0, " +
    "f10_account INTEGER DEFAULT 0, " +
    "f11_balance_sheet INTEGER DEFAULT 0, " +
    "f12_profit_loss INTEGER DEFAULT 0, " +
    "game_access INTEGER DEFAULT 0, " +
    "can_edit_party INTEGER DEFAULT 0, " +
    "can_delete_voucher INTEGER DEFAULT 0, " +
    "f5_sync_mode TEXT DEFAULT 'user'" +
  ")"
);

// Helper function to safely evaluate Truthy values (handles true, 1, '1', 'true')
function parseBit(val) {
  if (val === true || val === 1 || val === '1' || val === 'true') {
    return 1;
  }
  return 0;
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
  const query = "SELECT id, username, role FROM users";
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

// 2. Fetch Permissions for Selected User
const getUserPermissions = (req, res) => {
  const userId = req.params.userId;
  const query = "SELECT * FROM permissions WHERE user_id = ?";
  db.get(query, [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.json(getDefaultPermissions(Number(userId), 'user'));
    }
    res.json(row);
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
    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
    "ON CONFLICT(user_id) DO UPDATE SET " +
    "f1_party = excluded.f1_party, " +
    "f2_voucher_sale = excluded.f2_voucher_sale, " +
    "f3_voucher_yantri = excluded.f3_voucher_yantri, " +
    "f4_yantri = excluded.f4_yantri, " +
    "f5_master = excluded.f5_master, " +
    "f6_result = excluded.f6_result, " +
    "f7_summary = excluded.f7_summary, " +
    "f8_balance_history = excluded.f8_balance_history, " +
    "f9_sale_lc = excluded.f9_sale_lc, " +
    "f10_account = excluded.f10_account, " +
    "f11_balance_sheet = excluded.f11_balance_sheet, " +
    "f12_profit_loss = excluded.f12_profit_loss, " +
    "game_access = excluded.game_access, " +
    "can_edit_party = excluded.can_edit_party, " +
    "can_delete_voucher = excluded.can_delete_voucher, " +
    "f5_sync_mode = excluded.f5_sync_mode";

  const params = [
    userId, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12,
    game, editParty, delVoucher, syncMode
  ];

  db.run(upsertQuery, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: "Permissions updated successfully" });
  });
};

// 4. Create New User
const createUser = (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const userRole = role ? role.toLowerCase() : 'user';
  const insertUserQuery = "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";

  db.run(insertUserQuery, [username.trim(), password.trim(), userRole], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: "Username already exists" });
      }
      return res.status(500).json({ error: err.message });
    }

    const newUserId = this.lastID;
    const isUserRole = userRole === 'user';
    const f5MasterVal = isUserRole ? 1 : 0;

    const insertPermQuery =
      "INSERT OR REPLACE INTO permissions (" +
      "user_id, f1_party, f2_voucher_sale, f3_voucher_yantri, f4_yantri, f5_master, " +
      "f6_result, f7_summary, f8_balance_history, f9_sale_lc, f10_account, f11_balance_sheet, " +
      "f12_profit_loss, game_access, can_edit_party, can_delete_voucher, f5_sync_mode" +
      ") VALUES (?, 1, 1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'user')";

    db.run(insertPermQuery, [newUserId, f5MasterVal], function (permErr) {
      if (permErr) {
        console.error("Permission init error:", permErr.message);
      }
      return res.json({ success: true, message: "User created successfully", userId: newUserId });
    });
  });
};

// 5. User Login Controller (Guaranteed Permissions)
const loginUser = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  const sqlUser = "SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?)) AND password = ?";
  db.get(sqlUser, [username.trim(), password.trim()], (err, userRow) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    if (!userRow) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    const sqlPerm = "SELECT * FROM permissions WHERE user_id = ?";
    db.get(sqlPerm, [userRow.id], (permErr, permRow) => {
      if (permErr) {
        return res.status(500).json({ success: false, message: permErr.message });
      }

      let finalPerms = permRow;
      if (!finalPerms) {
        finalPerms = getDefaultPermissions(userRow.id, userRow.role);
      }

      return res.json({
        success: true,
        user: {
          id: userRow.id,
          username: userRow.username,
          role: userRow.role
        },
        permissions: finalPerms
      });
    });
  });
};

// 6. Change Password Controller (For both Admin & Users)
const changePassword = (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "UserId, old password and new password are required" });
  }

  // First verify old password
  const verifySql = "SELECT * FROM users WHERE id = ? AND password = ?";
  db.get(verifySql, [userId, oldPassword.trim()], (err, userRow) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    if (!userRow) {
      return res.status(400).json({ success: false, message: "पुराना पासवर्ड गलत है!" });
    }

    // Update to new password
    const updateSql = "UPDATE users SET password = ? WHERE id = ?";
    db.run(updateSql, [newPassword.trim(), userId], function (updateErr) {
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