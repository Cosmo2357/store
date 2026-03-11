import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "db.sqlite");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS plugins (
      id          TEXT PRIMARY KEY,
      label       TEXT NOT NULL,
      description TEXT NOT NULL,
      price       TEXT NOT NULL,
      href        TEXT NOT NULL,
      purchased   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS visit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      page       TEXT NOT NULL,
      visited_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Upsert plugin definitions so label/description stay in sync with code
  const upsert = db.prepare(`
    INSERT INTO plugins (id, label, description, price, href)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      label       = excluded.label,
      description = excluded.description,
      price       = excluded.price,
      href        = excluded.href
  `);

  const plugins = [
    ["ai-assistant",  "AI Assistant",  "Auto-reply & content generation powered by GPT-4",  "$49/mo", "/dashboard/ai-assistant"],
    ["space-shooter", "Space Shooter", "Arcade-style space shooting game — destroy the invaders!", "$9/mo", "/dashboard/space-shooter"],
    ["tetris",        "Tetris",        "Classic block-stacking puzzle game",                "$9/mo", "/dashboard/tetris"],
    ["platformer",    "Platformer",    "Super Mario-style platform game — run, jump, collect coins!", "$9/mo", "/dashboard/platformer"],
  ];

  for (const p of plugins) {
    upsert.run(...p);
  }

  // Remove deprecated plugins
  db.prepare("DELETE FROM plugins WHERE id IN ('analytics', 'export')").run();
}
