const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory store for demo purposes; replace with a real DB in production
// Structure: { [telegramUserId]: { coins, perClick, upgrades } }
const users = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getOrCreateUser(telegramUserId) {
  if (!telegramUserId) {
    throw new Error('telegramUserId is required');
  }
  if (!users.has(telegramUserId)) {
    users.set(telegramUserId, {
      coins: 0,
      perClick: 1,
      upgrades: 0,
      lastUpdated: Date.now(),
    });
  }
  return users.get(telegramUserId);
}

// Simple auth middleware expecting telegramUserId from the client.
// In a real Mini App you should validate Telegram initData on the backend.
app.use('/api', (req, res, next) => {
  const telegramUserId = req.header('x-telegram-user-id') || req.body.telegramUserId || req.query.telegramUserId;
  if (!telegramUserId) {
    return res.status(400).json({ error: 'Missing telegramUserId' });
  }
  req.telegramUserId = String(telegramUserId);
  next();
});

// Get current user state
app.get('/api/state', (req, res) => {
  try {
    const user = getOrCreateUser(req.telegramUserId);
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Click endpoint: adds coins based on perClick
app.post('/api/click', (req, res) => {
  try {
    const user = getOrCreateUser(req.telegramUserId);
    user.coins += user.perClick;
    user.lastUpdated = Date.now();
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Upgrade endpoint: increases perClick cost and value
app.post('/api/upgrade', (req, res) => {
  try {
    const user = getOrCreateUser(req.telegramUserId);
    const baseCost = 10;
    const costMultiplier = 1.5;
    const cost = Math.floor(baseCost * Math.pow(costMultiplier, user.upgrades));

    if (user.coins < cost) {
      return res.status(400).json({ error: 'Not enough coins', required: cost, current: user.coins });
    }

    user.coins -= cost;
    user.perClick += 1;
    user.upgrades += 1;
    user.lastUpdated = Date.now();

    res.json({ ...user, nextUpgradeCost: Math.floor(baseCost * Math.pow(costMultiplier, user.upgrades)) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({}), 'utf8');
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

app.post('/api/save', (req, res) => {
  const { telegramId, username, data } = req.body || {};

  if (!telegramId || typeof data !== 'object') {
    return res.status(400).json({ ok: false, error: 'INVALID_PAYLOAD' });
  }

  const users = readUsers();
  users[telegramId] = {
    telegramId,
    username: username || null,
    data,
    updatedAt: new Date().toISOString()
  };
  writeUsers(users);

  res.json({ ok: true });
});

app.post('/api/load', (req, res) => {
  const { telegramId } = req.body || {};

  if (!telegramId) {
    return res.status(400).json({ ok: false, error: 'INVALID_PAYLOAD' });
  }

  const users = readUsers();
  const user = users[telegramId];

  if (!user) {
    return res.json({ ok: true, data: null });
  }

  res.json({ ok: true, data: user.data });
});

app.get('/miniapp', (req, res) => {
  res.sendFile(path.join(__dirname, 'miniapp', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

