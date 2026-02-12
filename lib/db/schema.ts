export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'dinner',
    calories REAL NOT NULL DEFAULT 0,
    protein REAL NOT NULL DEFAULT 0,
    fat REAL NOT NULL DEFAULT 0,
    carbs REAL NOT NULL DEFAULT 0,
    fiber REAL NOT NULL DEFAULT 0,
    ingredients TEXT DEFAULT '[]',
    instructions TEXT,
    image_url TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    source_url TEXT,
    notion_page_id TEXT,
    rating REAL,
    frequency_limit INTEGER DEFAULT 3,
    servings INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at TEXT
  );

  CREATE TABLE IF NOT EXISTS meal_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plan_data TEXT NOT NULL DEFAULT '{}',
    daily_cal_target REAL,
    daily_protein_target REAL,
    daily_fat_target REAL,
    daily_carb_target REAL,
    daily_fiber_target REAL,
    is_selected INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at TEXT
  );

  CREATE TABLE IF NOT EXISTS shopping_lists (
    id TEXT PRIMARY KEY,
    meal_plan_id TEXT REFERENCES meal_plans(id) ON DELETE CASCADE,
    items TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY DEFAULT 1,
    macro_targets TEXT DEFAULT '{}',
    solver_settings TEXT DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    email TEXT,
    server_token TEXT,
    notion_access_token TEXT,
    notion_workspace_id TEXT,
    notion_database_id TEXT,
    last_sync_at TEXT
  );
`;
