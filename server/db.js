import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

export const initDb = async () => {
  db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'unused', -- unused, active, used
      use_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      activated_at DATETIME,
      expires_at DATETIME
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS card_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_code TEXT,
      ip TEXT,
      user_agent TEXT,
      device_info TEXT,
      input_data TEXT,
      output_data TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(card_code) REFERENCES cards(code)
    );
  `);

  // Migration: Add columns if they don't exist (for existing databases)
  try {
    await db.exec('ALTER TABLE card_logs ADD COLUMN input_data TEXT');
  } catch (e) { /* Column likely exists */ }
  
  try {
    await db.exec('ALTER TABLE card_logs ADD COLUMN output_data TEXT');
  } catch (e) { /* Column likely exists */ }

  // Create reports table for caching
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_code TEXT,
      bazi_signature TEXT,
      report_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(card_code) REFERENCES cards(code)
    );
  `);

  console.log('Database initialized');
};

export const getDb = () => db;
