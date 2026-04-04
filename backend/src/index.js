require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { uuidv4 } = require('./utils/id');


const app = express();

const PORT = process.env.PORT || 5400;


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

const db = new Database('./health.db', { verbose: console.log });
db.pragma('foreign_keys = OFF');
app.locals.db = db;

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.locals.uploadDir = uploadDir;


const authRouter = require('./routes/auth')(db); 
app.use('/api/auth', authRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'sqlite', time: new Date().toISOString() });
});

// Mount all API routes
const apiRouter = require('./routes');
app.use('/api', apiRouter);


function initDb() {
  db.exec(`
    -- 1. Teams
    CREATE TABLE IF NOT EXISTS teams (
        team_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sport TEXT,
        league TEXT,
        country TEXT,
        founded_year INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 2. Players
    CREATE TABLE IF NOT EXISTS players (
        player_id TEXT PRIMARY KEY,
        team_id TEXT REFERENCES teams(team_id) ON DELETE RESTRICT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth TEXT,
        gender TEXT,
        position TEXT,
        jersey_number INTEGER,
        nationality TEXT,
        height_cm REAL,
        weight_kg REAL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  

    -- 3. Users
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        role TEXT NOT NULL,
        team_id TEXT REFERENCES teams(team_id) ON DELETE SET NULL,
        player_id TEXT REFERENCES players(player_id) ON DELETE SET NULL,
        is_active INTEGER DEFAULT 1,
        last_login TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
 

    -- 4. Health Metric Types
    CREATE TABLE IF NOT EXISTS health_metric_types (
        metric_type_id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        unit TEXT,
        data_type TEXT NOT NULL CHECK(data_type IN ('numeric','integer','text','boolean','json')),
        min_value REAL, max_value REAL,
        normal_range_low REAL, normal_range_high REAL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 5. Health Records
    CREATE TABLE IF NOT EXISTS health_records (
        record_id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(player_id) ON DELETE RESTRICT,
        metric_type_id TEXT NOT NULL REFERENCES health_metric_types(metric_type_id) ON DELETE RESTRICT,
        recorded_at TEXT NOT NULL,          -- ISO 8601
        value TEXT NOT NULL,                -- stringified number/boolean/etc
        notes TEXT,
        entered_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
        context TEXT,                       -- JSON string
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
   

    -- 6. Attachments
    CREATE TABLE IF NOT EXISTS attachments (
        attachment_id TEXT PRIMARY KEY,
        record_id TEXT REFERENCES health_records(record_id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        mime_type TEXT,
        file_size_bytes INTEGER,
        uploaded_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
        uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
        description TEXT
    );
    
  `);

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    const seedSetting = db.prepare(
      'INSERT OR IGNORE INTO platform_settings (setting_key, setting_value) VALUES (?, ?)'
    );
    seedSetting.run('organization_name', 'Player Metrics Club');
    seedSetting.run('report_footer', 'Confidential — authorized staff only');
  } catch (e) {
    console.error('platform_settings init', e);
  }

  try {
    db.exec(`ALTER TABLE users ADD COLUMN player_id TEXT REFERENCES players(player_id) ON DELETE SET NULL`);
    console.log('Added users.player_id if missing');
  } catch (e) {
    if (!e.message || !e.message.includes('duplicate column')) console.error(e);
  }

  try {
    db.exec(
      `ALTER TABLE teams ADD COLUMN created_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL`
    );
    console.log('Added teams.created_by_user_id if missing');
  } catch (e) {
    if (!e.message || !e.message.includes('duplicate column')) console.error(e);
  }
  console.log('Database schema initialized / updated');
}

const indexStatements = [
    "CREATE INDEX IF NOT EXISTS idx_teams_name           ON teams(name)",
    "CREATE INDEX IF NOT EXISTS idx_players_team_id      ON players(team_id)",
    "CREATE INDEX IF NOT EXISTS idx_players_name         ON players(last_name, first_name)",
    "CREATE INDEX IF NOT EXISTS idx_players_jersey       ON players(jersey_number)",
    "CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_users_team_id        ON users(team_id)",
    "CREATE INDEX IF NOT EXISTS idx_metric_code          ON health_metric_types(code)",
    "CREATE INDEX IF NOT EXISTS idx_records_player       ON health_records(player_id)",
    "CREATE INDEX IF NOT EXISTS idx_records_metric       ON health_records(metric_type_id)",
    "CREATE INDEX IF NOT EXISTS idx_records_time         ON health_records(recorded_at)",
    "CREATE INDEX IF NOT EXISTS idx_records_player_time  ON health_records(player_id, recorded_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_attachments_record   ON attachments(record_id)",
  ];

  for (const stmt of indexStatements) {
    try {
      db.exec(stmt.replace("IF NOT EXISTS", "")); 
    } catch (err) {
      if (err.code !== 'SQLITE_ERROR' || !err.message.includes('already exists')) {
        console.error(`Failed to create index: ${stmt}`, err);
      }
      
    }
  }

  console.log('Database schema and indexes initialized / verified');

function seedDefaultMetrics() {
  const defaults = [
    { code: 'hrv_rmssd',    name: 'HRV RMSSD',           unit: 'ms',   data_type: 'numeric', normal_range_low: 20, normal_range_high: 100, description: 'Root Mean Square of Successive Differences' },
    { code: 'hrv_sdnn',      name: 'HRV SDNN',            unit: 'ms',   data_type: 'numeric' },
    { code: 'resting_hr',    name: 'Resting Heart Rate',  unit: 'bpm',  data_type: 'numeric', min_value: 30, max_value: 120 },
    { code: 'eda_tonic',     name: 'EDA Tonic Level',     unit: 'μS',   data_type: 'numeric' },
    { code: 'fatigue',       name: 'Perceived Fatigue',   unit: '1-10', data_type: 'integer', min_value: 1, max_value: 10 },
    { code: 'sleep_quality', name: 'Sleep Quality',       unit: '1-10', data_type: 'integer', min_value: 1, max_value: 10 },
    { code: 'mood',          name: 'Mood State',          unit: null,   data_type: 'text' },
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO health_metric_types (metric_type_id, code, name, unit, data_type, normal_range_low, normal_range_high, description, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  for (const m of defaults) {
    insert.run(uuidv4(), m.code, m.name, m.unit || null, m.data_type, m.normal_range_low || null, m.normal_range_high || null, m.description || null);
  }

  console.log(`Seeded ${defaults.length} default metric types`);
}

initDb();
seedDefaultMetrics();

app.listen(PORT, () => {
  console.log(`Backend running → http://localhost:${PORT}`);
});