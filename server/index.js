import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { initDb, getDb } from './db.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Mutable configuration variables
let config = {
  PORT: process.env.PORT || 3000,
  ADMIN_USER: process.env.ADMIN_USER || 'admin',
  ADMIN_PASS: process.env.ADMIN_PASS || 'admin123',
  ADMIN_PATH: process.env.ADMIN_PATH || '/admin',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
};

app.use(cors());
app.use(express.json());
app.set('trust proxy', true); // Trust proxy for IP logging

// Initialize DB
// initDb(); // Moved to startServer

// Helper to update .env file
const updateEnvFile = (newConfig) => {
  const envPath = path.join(__dirname, '../.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  Object.keys(newConfig).forEach(key => {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${newConfig[key]}`);
    } else {
      envContent += `\n${key}=${newConfig[key]}`;
    }
  });

  fs.writeFileSync(envPath, envContent.trim() + '\n');
  
  // Update runtime config
  Object.assign(config, newConfig);
};

// Admin Auth Middleware
const adminAuth = (req, res, next) => {
  const { username, password } = req.body || {};
  // Check body (for login) or headers (for API calls)
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Bearer <token>
    // Simple token: base64(username:password)
    try {
      const decoded = Buffer.from(token, 'base64').toString().split(':');
      if (decoded[0] === config.ADMIN_USER && decoded[1] === config.ADMIN_PASS) {
        return next();
      }
    } catch (e) {
      return res.status(401).json({ error: 'Invalid Token' });
    }
  }
  
  if (username === config.ADMIN_USER && password === config.ADMIN_PASS) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
};

// Middleware to verify card
const verifyCard = async (req, res, next) => {
  const { cardKey, baziSignature } = req.body;
  if (!cardKey) return res.status(400).json({ error: 'Missing card key' });

  const db = getDb();
  const card = await db.get('SELECT * FROM cards WHERE code = ?', cardKey);

  if (!card) {
    return res.status(401).json({ error: 'Invalid card key' });
  }

  if (card.status === 'used') {
    return res.status(403).json({ error: 'Card key has been used' });
  }

  if (card.status === 'active') {
    // Check expiration (e.g., 24 hours validity after activation)
    const now = new Date();
    const expiresAt = new Date(card.expires_at);
    if (now > expiresAt) {
      await db.run('UPDATE cards SET status = ? WHERE code = ?', ['used', cardKey]);
      return res.status(403).json({ error: 'Card key expired' });
    }
  }

  // --- New Logic: 3 Bazi Limit & Caching ---
  if (baziSignature) {
    // 1. Check if this Bazi is already cached for this card
    const cachedReport = await db.get(
      'SELECT * FROM reports WHERE card_code = ? AND bazi_signature = ?',
      [cardKey, baziSignature]
    );

    if (cachedReport) {
      // Cache hit! Attach to req to skip AI generation
      req.cachedReport = JSON.parse(cachedReport.report_data);
      req.card = card;
      return next();
    }

    // 2. If not cached, check how many distinct Bazi this card has used
    const usageCount = await db.get(
      'SELECT COUNT(DISTINCT bazi_signature) as count FROM reports WHERE card_code = ?',
      [cardKey]
    );

    if (usageCount.count >= 3) {
      return res.status(403).json({ error: '该卡密已绑定3个八字，无法查询新的八字。' });
    }
  }

  req.card = card;
  next();
};

// --- Admin Routes ---

// Admin Login
app.post('/api/admin/login', adminAuth, (req, res) => {
  // If middleware passes, credentials are correct
  // Return a simple token (base64 of user:pass) for client to store
  const token = Buffer.from(`${config.ADMIN_USER}:${config.ADMIN_PASS}`).toString('base64');
  res.json({ token });
});

// Get Config
app.get('/api/admin/config', adminAuth, (req, res) => {
  try {
    res.json({
      PORT: config.PORT,
      ADMIN_USER: config.ADMIN_USER,
      ADMIN_PATH: config.ADMIN_PATH,
      // Mask password
      ADMIN_PASS: '******', 
      DEEPSEEK_API_KEY: config.DEEPSEEK_API_KEY ? '******' + config.DEEPSEEK_API_KEY.slice(-4) : '',
      DEEPSEEK_BASE_URL: config.DEEPSEEK_BASE_URL,
      DEEPSEEK_MODEL: config.DEEPSEEK_MODEL
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update Config
app.post('/api/admin/config', adminAuth, (req, res) => {
  const { PORT, ADMIN_USER, ADMIN_PASS, ADMIN_PATH, DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL } = req.body;
  const newConfig = {};

  if (PORT) newConfig.PORT = PORT;
  if (ADMIN_USER) newConfig.ADMIN_USER = ADMIN_USER;
  if (ADMIN_PASS) newConfig.ADMIN_PASS = ADMIN_PASS;
  if (ADMIN_PATH) newConfig.ADMIN_PATH = ADMIN_PATH;
  if (DEEPSEEK_API_KEY) newConfig.DEEPSEEK_API_KEY = DEEPSEEK_API_KEY;
  if (DEEPSEEK_BASE_URL) newConfig.DEEPSEEK_BASE_URL = DEEPSEEK_BASE_URL;
  if (DEEPSEEK_MODEL) newConfig.DEEPSEEK_MODEL = DEEPSEEK_MODEL;

  try {
    updateEnvFile(newConfig);
    
    // If credentials changed, return new token
    let newToken = null;
    if (ADMIN_USER || ADMIN_PASS) {
      newToken = Buffer.from(`${config.ADMIN_USER}:${config.ADMIN_PASS}`).toString('base64');
    }

    // Check if restart is needed (PORT or ADMIN_PATH changed)
    const needsRestart = (PORT && PORT !== config.PORT) || (ADMIN_PATH && ADMIN_PATH !== config.ADMIN_PATH);

    res.json({ success: true, token: newToken, restartRequired: needsRestart });

    if (needsRestart) {
      // Delay restart to allow response to be sent
      setTimeout(() => {
        console.log('Restarting server due to configuration change...');
        process.exit(1); // PM2 will restart this
      }, 1000);
    }

  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Generate Cards
app.post('/api/admin/generate-cards', adminAuth, async (req, res) => {
  const { count = 1 } = req.body;
  const db = getDb();
  const cards = [];

  for (let i = 0; i < count; i++) {
    const code = 'LK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    await db.run('INSERT INTO cards (code) VALUES (?)', code);
    cards.push(code);
  }

  res.json({ cards });
});

// List Cards
app.get('/api/admin/cards', adminAuth, async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      console.error('Database instance is null');
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const cards = await db.all('SELECT * FROM cards ORDER BY created_at DESC');
    res.json({ cards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get Card Logs
app.get('/api/admin/logs/:code', adminAuth, async (req, res) => {
  const { code } = req.params;
  const db = getDb();
  const logs = await db.all('SELECT * FROM card_logs WHERE card_code = ? ORDER BY timestamp DESC', code);
  res.json({ logs });
});

// --- User Routes ---

// Verify Card (Simple check)
app.post('/api/verify-card', async (req, res) => {
  const { cardKey } = req.body;
  const db = getDb();
  const card = await db.get('SELECT * FROM cards WHERE code = ?', cardKey);

  if (!card) return res.json({ valid: false, message: '无效卡密' });
  if (card.status === 'used') return res.json({ valid: false, message: '卡密已失效' });
  
  if (card.status === 'active') {
     const now = new Date();
     const expiresAt = new Date(card.expires_at);
     if (now > expiresAt) return res.json({ valid: false, message: '卡密已过期' });
  }

  res.json({ valid: true, status: card.status });
});

// Generate Report (Proxy to AI)
app.post('/api/generate-report', verifyCard, async (req, res) => {
  const { messages, model } = req.body;
  const db = getDb();
  const card = req.card;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Log usage
  await db.run(
    'INSERT INTO card_logs (card_code, ip, user_agent, device_info, input_data) VALUES (?, ?, ?, ?, ?)',
    [card.code, ip, userAgent, userAgent, JSON.stringify(messages)]
  );

  // Update card stats
  await db.run('UPDATE cards SET use_count = use_count + 1 WHERE code = ?', card.code);

  // Activate card if unused
  if (card.status === 'unused') {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours validity
    await db.run(
      'UPDATE cards SET status = ?, activated_at = ?, expires_at = ? WHERE code = ?',
      ['active', new Date().toISOString(), expiresAt.toISOString(), card.code]
    );
  }

  try {
    const response = await axios.post(
      `${config.DEEPSEEK_BASE_URL}/chat/completions`,
      {
        model: config.DEEPSEEK_MODEL || 'deepseek-chat',
        messages,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`
        }
      }
    );

    // Update log with output data
    // We need the last inserted ID. Since we can't easily get it in async flow without result from INSERT,
    // we'll just update the latest log for this card.
    await db.run(
      'UPDATE card_logs SET output_data = ? WHERE id = (SELECT id FROM card_logs WHERE card_code = ? ORDER BY id DESC LIMIT 1)',
      [JSON.stringify(response.data), card.code]
    );

    res.json(response.data);
  } catch (error) {
    console.error('AI API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'AI Service Error' });
  }
});

// Serve Admin Dashboard
app.use(config.ADMIN_PATH, express.static(path.join(__dirname, 'public')));

// Serve Main App (Frontend)
app.use(express.static(path.join(__dirname, '../dist')));

// Handle SPA routing - return index.html for all non-API routes
// Express 5 requires regex or specific syntax for wildcards
app.get(/(.*)/, (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith(config.ADMIN_PATH)) {
    return res.status(404).json({ error: 'Not Found' });
  }
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Initialize DB and Start Server
const startServer = async () => {
  try {
    await initDb();
    
    app.listen(config.PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${config.PORT}`);
      console.log(`Admin Panel accessible at: http://0.0.0.0:${config.PORT}${config.ADMIN_PATH}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
