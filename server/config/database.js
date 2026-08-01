const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Environment or Packaged Check for Database Path
let dbDir;
if (process.env.APPDATA) {
  // Production .exe ke liye Windows AppData folder
  dbDir = path.join(process.env.APPDATA, 'yantri-desktop-db');
} else {
  // Development mode
  dbDir = path.resolve(__dirname, '../database');
}

// Database folder nahi hai to bana do
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'app_database.sqlite');
console.log('Database Path:', dbPath);

const db = new sqlite3.Database(dbPath, function(err) {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite Database at:', dbPath);
  }
});

db.serialize(function() {
  // 1. Parties Table (F1)
  db.run("CREATE TABLE IF NOT EXISTS parties (" +
    "pno INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "party_name TEXT NOT NULL UNIQUE, " +
    "city TEXT, phone TEXT, " +
    "opening_bal REAL DEFAULT 0, " +
    "d_comm REAL DEFAULT 0, d_amt REAL DEFAULT 0, " +
    "a_comm REAL DEFAULT 0, a_amt REAL DEFAULT 0, " +
    "patti_perc REAL DEFAULT 0, lc_perc REAL DEFAULT 0, " +
    "hissa_party TEXT, hissa_patti_perc REAL DEFAULT 0, " +
    "override_comm_perc REAL DEFAULT 0, " +
    "override_lc_perc REAL DEFAULT 0, " +
    "status TEXT DEFAULT 'Active', " +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");

  db.run("ALTER TABLE parties ADD COLUMN opening_bal REAL DEFAULT 0", function() {});
  db.run("ALTER TABLE parties ADD COLUMN override_comm_perc REAL DEFAULT 0", function() {});
  db.run("ALTER TABLE parties ADD COLUMN override_lc_perc REAL DEFAULT 0", function() {});

  // 2. Sales Table (F2, F3)
  db.run("CREATE TABLE IF NOT EXISTS sales (" +
    "sale_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "sale_date TEXT NOT NULL, " +
    "game_name TEXT NOT NULL, " +
    "party_name TEXT NOT NULL, " +
    "total_amount REAL DEFAULT 0, " +
    "uid TEXT DEFAULT '1', " +
    "shift TEXT DEFAULT '1', " +
    "d_comm REAL DEFAULT 10, " +
    "d_amt REAL DEFAULT 90, " +
    "a_comm REAL DEFAULT 10, " +
    "a_amt REAL DEFAULT 9, " +
    "patti_perc REAL DEFAULT 0, " +
    "entry_date_time TEXT, " +
    "third_party_hissa TEXT DEFAULT '0', " +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");

  db.run("ALTER TABLE sales ADD COLUMN uid TEXT DEFAULT '1'", function() {});
  db.run("ALTER TABLE sales ADD COLUMN shift TEXT DEFAULT '1'", function() {});
  db.run("ALTER TABLE sales ADD COLUMN entry_date_time TEXT", function() {});
  db.run("ALTER TABLE sales ADD COLUMN third_party_hissa TEXT DEFAULT '0'", function() {});
  db.run("ALTER TABLE sales ADD COLUMN d_comm REAL DEFAULT 10", function() {});
  db.run("ALTER TABLE sales ADD COLUMN d_amt REAL DEFAULT 90", function() {});
  db.run("ALTER TABLE sales ADD COLUMN a_comm REAL DEFAULT 10", function() {});
  db.run("ALTER TABLE sales ADD COLUMN a_amt REAL DEFAULT 9", function() {});
  db.run("ALTER TABLE sales ADD COLUMN patti_perc REAL DEFAULT 0", function() {});

  // 3. Pending Sales Table
  db.run("CREATE TABLE IF NOT EXISTS pending_sales (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "sale_date TEXT, " +
    "game_name TEXT, " +
    "uid TEXT, " +
    "shift TEXT, " +
    "party_id TEXT, " +
    "party_name TEXT, " +
    "total_amount REAL, " +
    "voucher_data TEXT, " +
    "status TEXT DEFAULT 'PENDING', " +
    "uploaded_on DATETIME DEFAULT CURRENT_TIMESTAMP)");

  // 4. Upload Logs Table
  db.run("CREATE TABLE IF NOT EXISTS upload_logs (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "sale_date TEXT, " +
    "game_name TEXT, " +
    "uid TEXT, " +
    "shift TEXT, " +
    "entry_date_time DATETIME DEFAULT CURRENT_TIMESTAMP)");

  // 5. Server Parties Table
  db.run("CREATE TABLE IF NOT EXISTS server_parties (" +
    "pno INTEGER PRIMARY KEY, " +
    "party_name TEXT NOT NULL, " +
    "opening_balance REAL DEFAULT 0)");

  // 6. Sale Items / Bets Table (F2, F3, F4)
  db.run("CREATE TABLE IF NOT EXISTS sale_items (" +
    "item_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "sale_id INTEGER, " +
    "number_val TEXT NOT NULL, " +
    "amount REAL NOT NULL, " +
    "bet_type TEXT DEFAULT 'Direct', " +
    "FOREIGN KEY(sale_id) REFERENCES sales(sale_id))");

  // 7. Game Results Table (F6)
  db.run("CREATE TABLE IF NOT EXISTS results (" +
    "result_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "result_date TEXT NOT NULL, " +
    "game_name TEXT NOT NULL, " +
    "winning_number TEXT NOT NULL, " +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");

  db.run("DELETE FROM results WHERE result_id NOT IN (" +
    "SELECT MAX(result_id) FROM results GROUP BY LOWER(TRIM(result_date)), LOWER(TRIM(game_name))" +
    ")", function(err) {
      if (!err) {
        console.log("Duplicate result entries cleaned up successfully!");
      }
  });

  // 8. Account Ledger Table (F7, F8, F10, F11, F12)
  db.run("CREATE TABLE IF NOT EXISTS ledger_entries (" +
    "entry_id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "entry_date TEXT NOT NULL, " +
    "party_name TEXT NOT NULL, " +
    "game_name TEXT, " +
    "description TEXT, " +
    "narration TEXT, " +
    "debit_amt REAL DEFAULT 0, " +
    "credit_amt REAL DEFAULT 0, " +
    "balance REAL DEFAULT 0, " +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");

  db.run("ALTER TABLE ledger_entries ADD COLUMN narration TEXT", function() {});

  // 9. Users Table
  db.run("CREATE TABLE IF NOT EXISTS users (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "username TEXT UNIQUE NOT NULL, " +
    "password TEXT NOT NULL, " +
    "role TEXT CHECK(role IN ('super_admin', 'user')) DEFAULT 'user', " +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");

  // 10. Permissions Table
  db.run("CREATE TABLE IF NOT EXISTS permissions (" +
    "user_id INTEGER PRIMARY KEY, " +
    "f1_party BOOLEAN DEFAULT 0, " +
    "f2_voucher_sale BOOLEAN DEFAULT 0, " +
    "f3_voucher_yantri BOOLEAN DEFAULT 0, " +
    "f4_yantri BOOLEAN DEFAULT 0, " +
    "f5_master BOOLEAN DEFAULT 0, " +
    "f6_result BOOLEAN DEFAULT 0, " +
    "f8_balance_history BOOLEAN DEFAULT 0, " +
    "f9_sale_lc BOOLEAN DEFAULT 0, " +
    "f10_account BOOLEAN DEFAULT 0, " +
    "f11_balance_sheet BOOLEAN DEFAULT 0, " +
    "f12_profit_loss BOOLEAN DEFAULT 0, " +
    "game_access BOOLEAN DEFAULT 0, " +
    "can_edit_party BOOLEAN DEFAULT 0, " +
    "can_delete_voucher BOOLEAN DEFAULT 0, " +
    "f5_sync_mode TEXT DEFAULT 'user', " +
    "FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)");

  db.run("ALTER TABLE permissions ADD COLUMN can_edit_party BOOLEAN DEFAULT 0", function() {});
  db.run("ALTER TABLE permissions ADD COLUMN can_delete_voucher BOOLEAN DEFAULT 0", function() {});
  db.run("ALTER TABLE permissions ADD COLUMN f5_sync_mode TEXT DEFAULT 'user'", function() {});

  // 11. App License Table
  db.run("CREATE TABLE IF NOT EXISTS license (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "license_key TEXT UNIQUE NOT NULL, " +
    "company_id TEXT, " +
    "activation_date DATETIME, " +
    "expiry_date DATETIME, " +
    "status TEXT DEFAULT 'ACTIVE')");

  // 12. Company Config Table
  db.run("CREATE TABLE IF NOT EXISTS company_config (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "company_id TEXT UNIQUE NOT NULL, " +
    "company_name TEXT, " +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");

  // Default Admin Entry
  db.run("INSERT OR IGNORE INTO users (id, username, password, role) VALUES (1, 'admin', 'admin123', 'super_admin')");
  db.run("INSERT OR IGNORE INTO permissions (" +
    "user_id, f1_party, f2_voucher_sale, f3_voucher_yantri, f4_yantri, " +
    "f5_master, f6_result, f8_balance_history, f9_sale_lc, " +
    "f10_account, f11_balance_sheet, f12_profit_loss, game_access, " +
    "can_edit_party, can_delete_voucher, f5_sync_mode) " +
    "VALUES (1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 'admin')");

  // Indexes Setup
  db.run("CREATE INDEX IF NOT EXISTS idx_sales_date_party ON sales(sale_date, party_name)");
  db.run("CREATE INDEX IF NOT EXISTS idx_sales_game_date ON sales(game_name, sale_date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_sale_items_number ON sale_items(number_val)");
  db.run("CREATE INDEX IF NOT EXISTS idx_ledger_party_date ON ledger_entries(party_name, entry_date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_results_date_game ON results(result_date, game_name)");
  db.run("CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(party_name)");
  db.run("CREATE INDEX IF NOT EXISTS idx_parties_status ON parties(status)");

  console.log("Database Indexes and License tables initialized successfully!");
});

module.exports = db;