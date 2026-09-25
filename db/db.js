// db/db.js
// Sets up the SQLite database and creates all tables if they don't exist yet.
// SQLite stores everything in one file (boutique.db) - nothing else to install.

const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'boutique.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','tailor','customer')),
  phone TEXT,
  capacity_per_week INTEGER DEFAULT 5,   -- only meaningful for tailors
  specialization TEXT,                    -- only meaningful for tailors e.g. "Blouse, Saree falls"
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL UNIQUE,
  chest REAL, waist REAL, hip REAL, shoulder REAL,
  sleeve_length REAL, shirt_length REAL, inseam REAL, neck REAL,
  notes TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fabrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT,
  type TEXT,                 -- e.g. Cotton, Silk, Linen
  quantity_meters REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  tailor_id INTEGER,
  garment_type TEXT NOT NULL,          -- e.g. Blouse, Kurti, Suit
  customization_details TEXT,          -- customer's requirement text
  design_notes TEXT,                   -- reference / design description
  fabric_id INTEGER,
  fabric_allocated_meters REAL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','assigned','in_progress','query_raised','completed','cancelled')),
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
  order_date TEXT DEFAULT (datetime('now')),
  due_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tailor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (fabric_id) REFERENCES fabrics(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  tailor_id INTEGER NOT NULL,
  query_type TEXT NOT NULL CHECK(query_type IN ('insufficient_fabric','insufficient_thread','unable_to_complete','deadline_extension','other')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
  admin_response TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (tailor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  order_id INTEGER,
  subject TEXT,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);
`);

module.exports = db;
