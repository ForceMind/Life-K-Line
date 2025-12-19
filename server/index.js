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
    // Join with reports to get distinct bazi count
    const cards = await db.all(`
      SELECT c.*, COUNT(DISTINCT r.bazi_signature) as bazi_count 
      FROM cards c 
      LEFT JOIN reports r ON c.code = r.card_code 
      GROUP BY c.id 
      ORDER BY c.created_at DESC
    `);
    res.json({ cards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Void Card
app.post('/api/admin/cards/:code/void', adminAuth, async (req, res) => {
  const { code } = req.params;
  const db = getDb();
  try {
    await db.run("UPDATE cards SET status = 'used' WHERE code = ?", code);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to void card' });
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
  // Check for cache hit from middleware
  if (req.cachedReport) {
    console.log('Serving from cache');
    return res.json(req.cachedReport);
  }

  const { messages, model, baziSignature, baziData, generationType } = req.body;
  const db = getDb();
  const card = req.card;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  let finalMessages = messages;

  // --- Prompt Generation on Server ---
  if (baziData && generationType) {
    const { gender, birthDate, yearPillar, monthPillar, dayPillar, hourPillar, startAge, firstDaYun, currentAge, endAge, startYear } = baziData;
    let prompt = '';

    if (generationType === 'base') {
      prompt = `
你是一位精通八字命理和数据可视化的专家，尤其擅长盲派命理技巧。请根据以下用户的八字信息，进行深入的命理分析，并生成前5年（0-4岁）的运势数据。

**用户信息：**
- 性别：${gender === 'male' ? '男' : '女'}
- 出生日期：${birthDate}
- 八字：${yearPillar} ${monthPillar} ${dayPillar} ${hourPillar}
- 起运：${startAge}岁, 首运：${firstDaYun}

**任务要求：**
1. **盲派技巧分析**：请运用盲派技巧（如做功、象法、废兴等）逐步分析八字。
2. **一生运势概览**：分析我的一生运势，涵盖事业、财富、婚姻、健康等各方面。
3. **具体细节**：尽可能详细具体，指出关键的时间节点和可能发生的事件。
4. **重点关注**：着重分析大运能赚多少钱，以及健康和婚姻状况。
5. **诚实评价**：判断出准确的关系模型后输出最终结果，诚实一点评价，用语不用太温和，直击要害。
6. **输出格式**：请返回一个标准的 JSON 对象，包含 \`analysis\` (命理分析) 和 \`chartData\` (0-4岁的K线数据) 两个部分。不要包含任何 Markdown 标记。

**JSON 结构定义：**
{
  "analysis": {
    "bazi": ["${yearPillar}", "${monthPillar}", "${dayPillar}", "${hourPillar}"],
    "summary": "总体运势简述 (100字左右，直击要害)",
    "summaryScore": 85, // 0-100
    "personality": "性格分析 (100字左右，盲派视角)",
    "personalityScore": 80,
    "appearance": "外貌特征分析 (50字以内)",
    "appearanceScore": 75,
    "industry": "适合的事业方向 (100字左右，具体行业)",
    "industryScore": 80,
    "fengShui": "发展风水建议 (50字以内)",
    "fengShuiScore": 70,
    "wealth": "财富等级分析 (100字左右，预估大运财运)",
    "wealthScore": 85,
    "marriage": "婚姻姻缘分析 (100字左右，配偶特征与婚姻质量)",
    "marriageScore": 75,
    "health": "身体健康分析 (100字左右，易患疾病与节点)",
    "healthScore": 80,
    "family": "六亲关系分析 (50字以内)",
    "familyScore": 75,
    "totalScore": 82 // 人生总评 0-100
  },
  "chartData": [
    // 0岁到4岁的数组 (共5年)
    {
      "year": 1995,
      "age": 0,
      "ganZhi": "乙亥",
      "open": 50,
      "close": 55,
      "high": 60,
      "low": 45,
      "summary": "出生之年",
      "events": [{"title": "出生", "description": "降生"}]
    }
  ]
}
`;
    } else if (generationType === 'batch') {
      prompt = `
基于之前的八字分析（${gender === 'male' ? '男' : '女'}，八字：${yearPillar} ${monthPillar} ${dayPillar} ${hourPillar}），
请继续推演 ${currentAge}岁 到 ${endAge}岁 的运势数据。

**任务要求：**
1. **盲派流年推断**：结合大运和流年，运用盲派技巧推断每年的吉凶祸福。
2. **具体事件**：指出具体的事件（如发财、升职、结婚、生子、生病、灾祸等），不要模棱两可。
3. **诚实评价**：用语不用太温和，好就是好，坏就是坏。
4. **输出格式**：只返回一个 JSON 数组，包含 ${currentAge}岁 到 ${endAge}岁 的 K线数据。不要包含任何 Markdown 标记。

**JSON 数组结构示例：**
[
  {
    "year": ${startYear}, // 对应 ${currentAge}岁
    "age": ${currentAge},
    "ganZhi": "...",
    "open": 60,
    "close": 65,
    "high": 70,
    "low": 55,
    "summary": "...",
    "events": []
  }
  // ... 直到 ${endAge}岁
]
`;
    }

    if (prompt) {
      finalMessages = [
        { role: 'system', content: 'You are a helpful assistant that outputs JSON only.' },
        { role: 'user', content: prompt }
      ];
    }
  }

  // Log usage
  await db.run(
    'INSERT INTO card_logs (card_code, ip, user_agent, device_info, input_data) VALUES (?, ?, ?, ?, ?)',
    [card.code, ip, userAgent, userAgent, JSON.stringify(finalMessages || messages)]
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
        messages: finalMessages || messages,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`
        }
      }
    );

    const responseData = response.data;

    // Update log with output data
    await db.run(
      'UPDATE card_logs SET output_data = ? WHERE id = (SELECT id FROM card_logs WHERE card_code = ? ORDER BY id DESC LIMIT 1)',
      [JSON.stringify(responseData), card.code]
    );

    // Save to Cache (Reports table) if signature is present
    if (baziSignature) {
      await db.run(
        'INSERT INTO reports (card_code, bazi_signature, report_data) VALUES (?, ?, ?)',
        [card.code, baziSignature, JSON.stringify(responseData)]
      );
    }

    res.json(responseData);
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
