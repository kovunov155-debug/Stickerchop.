# Telegram Bot Runner in Python (No dependencies required, uses standard urllib)
# Запуск: BOT_TOKEN="ВАШ_ТОКЕН" python3 bot.py

import os
import json
import urllib.request
import urllib.parse
import time

BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
WEB_APP_URL = "https://kovunov155-debug.github.io/Sticker-/"

def call_api(method, payload):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Error calling {method}: {e}")
        return None

def send_welcome(chat_id, first_name):
    welcome_text = (
        f"👋 *Привет, {first_name or 'Друг'}!*\n\n"
        f"Добро пожаловать в *Crypto Spin & Stickers*! 🎰💎\n\n"
        f"⚡ *Что умеет этот бот:*\n"
        f"• 🎰 *Крипто-колесо*: крути и выигрывай TON, USDT, NOT и DOGS!\n"
        f"• 🏆 *Супер Джекпот*: 10 TON + 25 USDT за один спин!\n"
        f"• 🎁 *Бесплатные спины*: каждые 2 часа по таймеру и +3 за каждого друга!\n"
        f"• 🛍️ *Магазин стикеров*: 20 крутых стикеров за Telegram Stars!\n"
        f"• 💳 *Моментальный вывод*: на любой кошелек TON (Tonkeeper / Wallet)!\n\n"
        f"👇 *Жми кнопку ниже, чтобы запустить игру:*"
    )
    keyboard = {
        "inline_keyboard": [
            [
                {"text": "🎰 ИГРАТЬ В КРИПТО-СПИН 🚀", "web_app": {"url": WEB_APP_URL}}
            ],
            [
                {"text": "🛍️ Магазин стикеров", "web_app": {"url": WEB_APP_URL}},
                {"text": "👥 Позвать друга (+3 спина)", "url": f"https://t.me/share/url?url={urllib.parse.quote(WEB_APP_URL)}&text={urllib.parse.quote('🎰 Крути крипто-колесо в Telegram!')}"}
            ]
        ]
    }
    call_api("sendMessage", {
        "chat_id": chat_id,
        "text": welcome_text,
        "parse_mode": "Markdown",
        "reply_markup": keyboard
    })

def main():
    print("🚀 Python Telegram бот Crypto Spin запускается...")
    print(f"🔗 WebApp URL: {WEB_APP_URL}")
    last_update_id = 0
    while True:
        res = call_api("getUpdates", {"offset": last_update_id + 1, "timeout": 20})
        if res and res.get("ok"):
            for update in res.get("result", []):
                last_update_id = update["update_id"]
                msg = update.get("message")
                if msg and "text" in msg:
                    text = msg["text"].strip()
                    chat_id = msg["chat"]["id"]
                    first_name = msg.get("from", {}).get("first_name", "Друг")
                    print(f"[MSG] От {first_name}: {text}")
                    if text.startswith("/start") or text.startswith("/help") or "старт" in text.lower():
                        send_welcome(chat_id, first_name)
        time.sleep(0.3)

if __name__ == "__main__":
    main()
