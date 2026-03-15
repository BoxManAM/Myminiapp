const coinsEl = document.getElementById('coins');
const perClickEl = document.getElementById('perClick');
const upgradeCostEl = document.getElementById('upgradeCost');
const cookieButton = document.getElementById('cookieButton');
const upgradeButton = document.getElementById('upgradeButton');
const usernameEl = document.getElementById('username');
const avatarEl = document.getElementById('avatar');
const toastEl = document.getElementById('toast');

let telegramUserId = null;
let state = {
  coins: 0,
  perClick: 1,
  upgrades: 0,
  nextUpgradeCost: 10,
};

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  toastEl.classList.add('visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toastEl.classList.remove('visible');
    toastEl.classList.add('hidden');
  }, 1600);
}

function updateUI() {
  coinsEl.textContent = state.coins;
  perClickEl.textContent = state.perClick;
  if (state.nextUpgradeCost != null) {
    upgradeCostEl.textContent = state.nextUpgradeCost;
  }
}

async function apiRequest(path, options = {}) {
  if (!telegramUserId) {
    throw new Error('telegramUserId not ready');
  }

  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-user-id': telegramUserId,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Ошибка сервера');
  }

  return data;
}

async function loadState() {
  try {
    const data = await apiRequest('/state');
    const baseCost = 10;
    const costMultiplier = 1.5;
    const nextCost = Math.floor(baseCost * Math.pow(costMultiplier, data.upgrades || 0));
    state = {
      ...state,
      ...data,
      nextUpgradeCost: nextCost,
    };
    updateUI();
  } catch (e) {
    console.error(e);
    showToast('Не удалось загрузить данные');
  }
}

async function handleClick() {
  try {
    const data = await apiRequest('/click', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const baseCost = 10;
    const costMultiplier = 1.5;
    const nextCost = Math.floor(baseCost * Math.pow(costMultiplier, data.upgrades || 0));
    state = {
      ...state,
      ...data,
      nextUpgradeCost: nextCost,
    };
    updateUI();
  } catch (e) {
    console.error(e);
    showToast('Ошибка запроса');
  }
}

async function handleUpgrade() {
  try {
    const data = await apiRequest('/upgrade', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    state = {
      ...state,
      ...data,
    };
    updateUI();
    showToast('Клик усилен!');
  } catch (e) {
    console.error(e);
    showToast(e.message || 'Не удалось прокачать');
  }
}

cookieButton.addEventListener('click', handleClick);
upgradeButton.addEventListener('click', handleUpgrade);

function initTelegram() {
  const tg = window.Telegram && window.Telegram.WebApp;

  if (!tg) {
    telegramUserId = 'test-user';
    usernameEl.textContent = 'Тестовый пользователь';
    avatarEl.textContent = 'T';
    loadState();
    return;
  }

  tg.ready();
  tg.expand();

  const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
  if (user) {
    telegramUserId = String(user.id);
    usernameEl.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
    avatarEl.textContent = (user.first_name || '?')[0].toUpperCase();
  } else {
    telegramUserId = 'anonymous';
    usernameEl.textContent = 'Игрок';
    avatarEl.textContent = 'I';
  }

  loadState();
}

document.addEventListener('DOMContentLoaded', initTelegram);

