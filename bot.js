// Telegram Bot Runner (Pure Node.js - No external dependencies required)
// Запуск: BOT_TOKEN="ВАШ_ТОКЕН" node bot.js
// Или вставьте ваш токен в переменную ниже:

const https = require('https');

const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const WEB_APP_URL = 'https://kovunov155-debug.github.io/Sticker-/';

if (BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  console.log('⚠️ Внимание! Укажите ваш Telegram Bot Token (полученный от @BotFather).');
  console.log('Пример: BOT_TOKEN="123456:ABC-DEF..." node bot.js\n');
}

function callTelegramApi(method, params, callback) {
  const data = JSON.stringify(params);
  const req = https.request(
    {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    },
    (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (callback) callback(parsed);
        } catch (e) {
          if (callback) callback(null);
        }
      });
    }
  );
  req.on('error', (e) => {
    console.error('API Error:', e.message);
  });
  req.write(data);
  req.end();
}

function handleStartCommand(chatId, firstName) {
  const welcomeText = 
    `👋 *Привет, ${firstName || 'Друг'}!*\n\n` +
    `Добро пожаловать в *Crypto Spin & Stickers*! 🎰💎\n\n` +
    `⚡ *Что умеет этот бот:*\n` +
    `• 🎰 *Крипто-колесо*: крути и выигрывай TON, USDT, NOT и DOGS!\n` +
    `• 🏆 *Супер Джекпот*: 10 TON + 25 USDT за один спин!\n` +
    `• 🎁 *Бесплатные спины*: каждые 2 часа по таймеру и +3 за каждого друга!\n` +
    `• 🛍️ *Магазин стикеров*: 20 крутых стикеров за Telegram Stars!\n` +
    `• 💳 *Моментальный вывод*: на любой кошелек TON (Tonkeeper / Wallet)!\n\n` +
    `👇 *Жми кнопку ниже, чтобы запустить игру:*`;

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🎰 ИГРАТЬ В КРИПТО-СПИН 🚀',
          web_app: { url: WEB_APP_URL }
        }
      ],
      [
        {
          text: '🛍️ Магазин стикеров',
          web_app: { url: WEB_APP_URL }
        },
        {
          text: '👥 Позвать друга (+3 спина)',
          url: `https://t.me/share/url?url=${encodeURIComponent(WEB_APP_URL)}&text=${encodeURIComponent('🎰 Крути крипто-колесо в Telegram и выигрывай TON и USDT!')}`
        }
      ]
    ]
  };

  callTelegramApi('sendMessage', {
    chat_id: chatId,
    text: welcomeText,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  }, (res) => {
    if (res && res.ok) {
      console.log(`[OK] Отправлено приветствие пользователю ${firstName} (${chatId})`);
    } else {
      console.error('[ERR] Ошибка отправки:', res);
    }
  });
}

// Long Polling
let lastUpdateId = 0;

function pollUpdates() {
  callTelegramApi(
    'getUpdates',
    { offset: lastUpdateId + 1, timeout: 20 },
    (res) => {
      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          lastUpdateId = update.update_id;
          if (update.message && update.message.text) {
            const text = update.message.text.trim();
            const chatId = update.message.chat.id;
            const firstName = update.message.from ? update.message.from.first_name : 'Друг';

            console.log(`[MSG] Сообщение от ${firstName}: "${text}"`);

            if (text.startsWith('/start') || text.startsWith('/help') || text.toLowerCase().includes('старт')) {
              handleStartCommand(chatId, firstName);
            }
          }
        }
      }
      setTimeout(pollUpdates, 300);
    }
  );
}

console.log('🚀 Telegram бот Crypto Spin запускается...');
console.log(`🔗 WebApp URL: ${WEB_APP_URL}`);
pollUpdates();
