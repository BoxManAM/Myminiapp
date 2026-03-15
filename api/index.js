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
app.use(express.static(path.join(__dirname, 'public')));

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

function getOrCreateUser(telegramUserId) {
  const users = readUsers();
  if (!telegramUserId) {
    throw new Error('telegramUserId is required');
  }
  if (!users[telegramUserId]) {
    users[telegramUserId] = {
      coins: 0,
      perClick: 1,
      upgrades: 0,
      lastUpdated: Date.now(),
    };
    writeUsers(users);
  }
  return users[telegramUserId];
}

function saveUser(telegramUserId, data) {
  const users = readUsers();
  users[telegramUserId] = {
    ...data,
    lastUpdated: Date.now(),
  };
  writeUsers(users);
}

// Simple auth middleware expecting telegramUserId from the client.
// В реальном мини‑приложении нужно валидировать initData на бэкенде.
app.use('/api', (req, res, next) => {
  const telegramUserId =
    req.header('x-telegram-user-id') ||
    (req.body && req.body.telegramUserId) ||
    req.query.telegramUserId;

  if (!telegramUserId) {
    return res.status(400).json({ error: 'Missing telegramUserId' });
  }
  req.telegramUserId = String(telegramUserId);
  next();
});

// Получить состояние пользователя
app.get('/api/state', (req, res) => {
  try {
    const user = getOrCreateUser(req.telegramUserId);
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Клик по печенью
app.post('/api/click', (req, res) => {
  try {
    const user = getOrCreateUser(req.telegramUserId);
    user.coins += user.perClick;
    saveUser(req.telegramUserId, user);
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Апгрейд клика
app.post('/api/upgrade', (req, res) => {
  try {
    const user = getOrCreateUser(req.telegramUserId);
    const baseCost = 10;
    const costMultiplier = 1.5;
    const cost = Math.floor(baseCost * Math.pow(costMultiplier, user.upgrades));

    if (user.coins < cost) {
      return res
        .status(400)
        .json({ error: 'Недостаточно монет', required: cost, current: user.coins });
    }

    user.coins -= cost;
    user.perClick += 1;
    user.upgrades += 1;

    saveUser(req.telegramUserId, user);

    res.json({
      ...user,
      nextUpgradeCost: Math.floor(baseCost * Math.pow(costMultiplier, user.upgrades)),
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

