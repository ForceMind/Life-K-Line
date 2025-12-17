import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

export const initDb = async () => {
  db = await open({
    filename: './server/database.sqlite',
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
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(card_code) REFERENCES cards(code)
    );
  `);

  console.log('Database initialized');
};

export const getDb = () => db;
