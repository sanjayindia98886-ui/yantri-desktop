-- 1. Users Table (Super Admin & Operators)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('super_admin', 'user')) DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Permissions Table (Updated with Action Level Permissions)
CREATE TABLE IF NOT EXISTS permissions (
    user_id INTEGER PRIMARY KEY,
    f1_party BOOLEAN DEFAULT 0,
    f2_voucher_sale BOOLEAN DEFAULT 0,
    f3_voucher_yantri BOOLEAN DEFAULT 0,
    f4_yantri BOOLEAN DEFAULT 0,
    f5_master BOOLEAN DEFAULT 0,
    f6_result BOOLEAN DEFAULT 0,
    f7_summary BOOLEAN DEFAULT 0,
    f8_balance_history BOOLEAN DEFAULT 0,
    f9_sale_lc BOOLEAN DEFAULT 0,
    f10_account BOOLEAN DEFAULT 0,
    f11_balance_sheet BOOLEAN DEFAULT 0,
    f12_profit_loss BOOLEAN DEFAULT 0,
    game_access BOOLEAN DEFAULT 0,
    
    -- Action level permissions
    can_edit_party BOOLEAN DEFAULT 0,
    can_delete_voucher BOOLEAN DEFAULT 0,
    f5_sync_mode TEXT DEFAULT 'user',

    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Parties Table (F1 Party Master)
CREATE TABLE IF NOT EXISTS parties (
    pno INTEGER PRIMARY KEY AUTOINCREMENT,
    party_name TEXT NOT NULL UNIQUE,
    city TEXT,
    phone TEXT,
    d_comm REAL DEFAULT 0,
    d_amt REAL DEFAULT 0,
    a_comm REAL DEFAULT 0,
    a_amt REAL DEFAULT 0,
    patti_perc REAL DEFAULT 0,
    lc_perc REAL DEFAULT 0,
    hissa_party TEXT,
    hissa_patti_perc REAL DEFAULT 0,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Sales Table (F2, F3 Voucher Sales)
CREATE TABLE IF NOT EXISTS sales (
    sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_date TEXT NOT NULL,
    game_name TEXT NOT NULL,
    party_name TEXT NOT NULL,
    total_amount REAL DEFAULT 0,
    uid TEXT DEFAULT '1',
    d_comm REAL DEFAULT 10,
    d_amt REAL DEFAULT 90,
    a_comm REAL DEFAULT 10,
    a_amt REAL DEFAULT 9,
    patti_perc REAL DEFAULT 0,
    entry_date_time TEXT,
    third_party_hissa TEXT DEFAULT '0',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Sale Items Table (F2, F3, F4 Bets Details)
CREATE TABLE IF NOT EXISTS sale_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    number_val TEXT NOT NULL,
    amount REAL NOT NULL,
    bet_type TEXT DEFAULT 'Direct',
    FOREIGN KEY(sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE
);

-- 6. Game Results Table (F6 Winning Results)
CREATE TABLE IF NOT EXISTS results (
    result_id INTEGER PRIMARY KEY AUTOINCREMENT,
    result_date TEXT NOT NULL,
    game_name TEXT NOT NULL,
    winning_number TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Account Ledger Table (F7, F8, F10, F11, F12 Ledger Entries)
CREATE TABLE IF NOT EXISTS ledger_entries (
    entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date TEXT NOT NULL,
    party_name TEXT NOT NULL,
    game_name TEXT,
    description TEXT,
    debit_amt REAL DEFAULT 0,
    credit_amt REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default Super Admin Create
INSERT OR IGNORE INTO users (id, username, password, role) 
VALUES (1, 'admin', 'admin123', 'super_admin');

-- Default Super Admin Permissions
INSERT OR IGNORE INTO permissions (
    user_id, f1_party, f2_voucher_sale, f3_voucher_yantri, f4_yantri, 
    f5_master, f6_result, f7_summary, f8_balance_history, f9_sale_lc, 
    f10_account, f11_balance_sheet, f12_profit_loss, game_access,
    can_edit_party, can_delete_voucher, f5_sync_mode
) 
VALUES (1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 'admin');