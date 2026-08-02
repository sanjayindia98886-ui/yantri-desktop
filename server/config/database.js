const { Pool } = require("pg");
require("dotenv").config();

// Supabase PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test Connection
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Supabase PostgreSQL Connection Error:", err.stack);
  } else {
    console.log("🚀 Connected to Supabase PostgreSQL Database Successfully!");
    release();
  }
});

// Database Migration & Table Setup Logic
const initDatabase = async () => {
  try {
    // 1. Company Config Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS company_config (" +
        "id SERIAL PRIMARY KEY, " +
        "company_id VARCHAR(100) UNIQUE NOT NULL, " +
        "company_name VARCHAR(255), " +
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
      ");"
    );

    // 2. App Licenses Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS licenses (" +
        "id SERIAL PRIMARY KEY, " +
        "license_key VARCHAR(100) UNIQUE NOT NULL, " +
        "company_id VARCHAR(100), " +
        "max_devices INT DEFAULT 10, " +
        "activation_date TIMESTAMP, " +
        "expiry_date TIMESTAMP, " +
        "status VARCHAR(20) DEFAULT 'ACTIVE', " +
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
      ");"
    );

    // 3. Parties Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS parties (" +
        "pno SERIAL PRIMARY KEY, " +
        "company_id VARCHAR(100) NOT NULL DEFAULT 'DEMO_COMP_101', " +
        "party_name VARCHAR(255) NOT NULL, " +
        "city VARCHAR(100), " +
        "phone VARCHAR(20), " +
        "opening_bal NUMERIC DEFAULT 0, " +
        "d_comm NUMERIC DEFAULT 0, " +
        "d_amt NUMERIC DEFAULT 0, " +
        "a_comm NUMERIC DEFAULT 0, " +
        "a_amt NUMERIC DEFAULT 0, " +
        "patti_perc NUMERIC DEFAULT 0, " +
        "lc_perc NUMERIC DEFAULT 0, " +
        "hissa_party VARCHAR(255), " +
        "hissa_patti_perc NUMERIC DEFAULT 0, " +
        "override_comm_perc NUMERIC DEFAULT 0, " +
        "override_comm_party VARCHAR(255) DEFAULT '', " +
        "override_lc_perc NUMERIC DEFAULT 0, " +
        "override_lc_party VARCHAR(255) DEFAULT '', " +
        "status VARCHAR(50) DEFAULT 'Active', " +
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
        "CONSTRAINT unique_party_per_company UNIQUE (company_id, party_name)" +
      ");"
    );

    // 4. Sales Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS sales (" +
        "sale_id SERIAL PRIMARY KEY, " +
        "company_id VARCHAR(100) NOT NULL DEFAULT 'DEMO_COMP_101', " +
        "sale_date VARCHAR(50) NOT NULL, " +
        "game_name VARCHAR(100) NOT NULL, " +
        "party_name VARCHAR(255) NOT NULL, " +
        "total_amount NUMERIC DEFAULT 0, " +
        "uid VARCHAR(50) DEFAULT '1', " +
        "shift VARCHAR(50) DEFAULT '1', " +
        "d_comm NUMERIC DEFAULT 10, " +
        "d_amt NUMERIC DEFAULT 90, " +
        "a_comm NUMERIC DEFAULT 10, " +
        "a_amt NUMERIC DEFAULT 9, " +
        "patti_perc NUMERIC DEFAULT 0, " +
        "entry_date_time VARCHAR(100), " +
        "third_party_hissa VARCHAR(100) DEFAULT '0', " +
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
      ");"
    );

    // 5. Pending Sales Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS pending_sales (" +
        "id SERIAL PRIMARY KEY, " +
        "company_id VARCHAR(100) DEFAULT 'DEMO_COMP_101', " +
        "sale_date VARCHAR(50), " +
        "game_name VARCHAR(100), " +
        "uid VARCHAR(50), " +
        "shift VARCHAR(50), " +
        "party_id VARCHAR(50), " +
        "party_name VARCHAR(255), " +
        "total_amount NUMERIC, " +
        "voucher_data TEXT, " +
        "status VARCHAR(50) DEFAULT 'PENDING', " +
        "uploaded_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
      ");"
    );

    // 6. Upload Logs Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS upload_logs (" +
        "id SERIAL PRIMARY KEY, " +
        "company_id VARCHAR(100) DEFAULT 'DEMO_COMP_101', " +
        "sale_date VARCHAR(50), " +
        "game_name VARCHAR(100), " +
        "uid VARCHAR(50), " +
        "shift VARCHAR(50), " +
        "entry_date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
      ");"
    );

    // 7. Server Parties Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS server_parties (" +
        "pno INT PRIMARY KEY, " +
        "company_id VARCHAR(100) NOT NULL DEFAULT 'DEMO_COMP_101', " +
        "party_name VARCHAR(255) NOT NULL, " +
        "opening_balance NUMERIC DEFAULT 0" +
      ");"
    );

    // 8. Sale Items / Bets Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS sale_items (" +
        "item_id SERIAL PRIMARY KEY, " +
        "sale_id INT REFERENCES sales(sale_id) ON DELETE CASCADE, " +
        "number_val VARCHAR(50) NOT NULL, " +
        "amount NUMERIC NOT NULL, " +
        "bet_type VARCHAR(50) DEFAULT 'Direct'" +
      ");"
    );

    // 9. Game Results Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS results (" +
        "result_id SERIAL PRIMARY KEY, " +
        "company_id VARCHAR(100) NOT NULL DEFAULT 'DEMO_COMP_101', " +
        "result_date VARCHAR(50) NOT NULL, " +
        "game_name VARCHAR(100) NOT NULL, " +
        "winning_number VARCHAR(50) NOT NULL, " +
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
      ");"
    );

    // 10. Account Ledger Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS ledger_entries (" +
        "entry_id SERIAL PRIMARY KEY, " +
        "company_id VARCHAR(100) NOT NULL DEFAULT 'DEMO_COMP_101', " +
        "entry_date VARCHAR(50) NOT NULL, " +
        "party_name VARCHAR(255) NOT NULL, " +
        "game_name VARCHAR(100), " +
        "description TEXT, " +
        "narration TEXT, " +
        "debit_amt NUMERIC DEFAULT 0, " +
        "credit_amt NUMERIC DEFAULT 0, " +
        "balance NUMERIC DEFAULT 0, " +
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP" +
      ");"
    );

    // 11. Users Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS users (" +
        "id SERIAL PRIMARY KEY, " +
        "company_id VARCHAR(100) DEFAULT 'DEMO_COMP_101', " +
        "username VARCHAR(100) NOT NULL, " +
        "password VARCHAR(255) NOT NULL, " +
        "role VARCHAR(50) CHECK(role IN ('super_admin', 'user')) DEFAULT 'user', " +
        "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
        "CONSTRAINT unique_user_per_company UNIQUE (company_id, username)" +
      ");"
    );

    // 12. Permissions Table
    await pool.query(
      "CREATE TABLE IF NOT EXISTS permissions (" +
        "user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, " +
        "f1_party INT DEFAULT 1, " +
        "f2_voucher_sale INT DEFAULT 1, " +
        "f3_voucher_yantri INT DEFAULT 1, " +
        "f4_yantri INT DEFAULT 1, " +
        "f5_master INT DEFAULT 1, " +
        "f6_result INT DEFAULT 1, " +
        "f8_balance_history INT DEFAULT 1, " +
        "f9_sale_lc INT DEFAULT 1, " +
        "f10_account INT DEFAULT 1, " +
        "f11_balance_sheet INT DEFAULT 1, " +
        "f12_profit_loss INT DEFAULT 1, " +
        "game_access INT DEFAULT 1, " +
        "can_edit_party INT DEFAULT 1, " +
        "can_delete_voucher INT DEFAULT 1, " +
        "f5_sync_mode VARCHAR(50) DEFAULT 'user'" +
      ");"
    );

    // 13. Default Company & Admin Entry
    await pool.query(
      "INSERT INTO company_config (company_id, company_name) " +
        "VALUES ('DEMO_COMP_101', 'Default Demo Company') " +
        "ON CONFLICT (company_id) DO NOTHING;"
    );

    await pool.query(
      "INSERT INTO users (id, company_id, username, password, role) " +
        "VALUES (1, 'DEMO_COMP_101', 'admin', 'admin123', 'super_admin') " +
        "ON CONFLICT (id) DO NOTHING;"
    );

    await pool.query(
      "INSERT INTO permissions (" +
        "user_id, f1_party, f2_voucher_sale, f3_voucher_yantri, f4_yantri, " +
        "f5_master, f6_result, f8_balance_history, f9_sale_lc, " +
        "f10_account, f11_balance_sheet, f12_profit_loss, game_access, " +
        "can_edit_party, can_delete_voucher, f5_sync_mode" +
      ") VALUES (1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 'admin') " +
      "ON CONFLICT (user_id) DO NOTHING;"
    );

    // 14. Performance Indexes Setup
    await pool.query("CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_sales_date_party ON sales(company_id, sale_date, party_name);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_sales_game_date ON sales(company_id, game_name, sale_date);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_sale_items_number ON sale_items(number_val);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_ledger_party_date ON ledger_entries(company_id, party_name, entry_date);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_parties_company ON parties(company_id, party_name);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_results_company ON results(company_id, result_date, game_name);");

    console.log("✅ Supabase Tables, Company ID Columns, Licenses, and Indexes Initialized Successfully!");
  } catch (err) {
    console.error("❌ Error Initializing Supabase Tables:", err.message);
  }
};

// Table Setup Run
initDatabase();

// ==========================================
// 🛡️ SQLITE COMPATIBILITY LAYER
// ==========================================

const db = {
  serialize: function(callback) {
    if (typeof callback === "function") {
      callback();
    }
  },

  run: async function(sql, params = [], callback) {
    if (typeof params === "function") {
      callback = params;
      params = [];
    }

    let paramIndex = 1;
    let pgSql = sql.replace(/\?/g, () => "$" + paramIndex++);

    // DATETIME ko TIMESTAMP mein badlo (PostgreSQL Compatibility)
    pgSql = pgSql.replace(/DATETIME/gi, "TIMESTAMP");

    // AUTOINCREMENT ko SERIAL mein badlo
    if (pgSql.indexOf("AUTOINCREMENT") !== -1) {
      pgSql = pgSql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY");
    }

    try {
      const result = await pool.query(pgSql, params);
      if (typeof callback === "function") {
        const mockContext = {
          lastID: result.rows && result.rows[0] ? (result.rows[0].id || result.rows[0].pno || 1) : 1,
          changes: result.rowCount || 0
        };
        callback.call(mockContext, null);
      }
    } catch (err) {
      if (typeof callback === "function") {
        callback(err);
      } else {
        console.error("DB Run Error:", err.message);
      }
    }
  },

  all: async function(sql, params = [], callback) {
    if (typeof params === "function") {
      callback = params;
      params = [];
    }

    let paramIndex = 1;
    let pgSql = sql.replace(/\?/g, () => "$" + paramIndex++);

    // DATETIME ko TIMESTAMP mein badlo
    pgSql = pgSql.replace(/DATETIME/gi, "TIMESTAMP");

    try {
      const result = await pool.query(pgSql, params);
      if (typeof callback === "function") {
        callback(null, result.rows || []);
      }
    } catch (err) {
      if (typeof callback === "function") {
        callback(err, []);
      } else {
        console.error("DB All Error:", err.message);
      }
    }
  },

  // FIXED QUERY METHOD: Supports both Callbacks and Promises
  query: async function(sql, params = [], callback) {
    if (typeof params === "function") {
      callback = params;
      params = [];
    }

    try {
      const result = await pool.query(sql, params);
      if (typeof callback === "function") {
        callback(null, result);
      }
      return result;
    } catch (err) {
      if (typeof callback === "function") {
        callback(err, null);
      } else {
        throw err;
      }
    }
  }
};

module.exports = db;