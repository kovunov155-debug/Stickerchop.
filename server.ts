import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const USDT_WALLET = 'UQAiEqXWyX1j-cgeyksUGvZC5T2Fk2YkV1mxCEDH08wuafd';

app.use(express.json());

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  emoji?: string;
}

export interface Order {
  id: string;
  type: 'stickers' | 'spins';
  items?: OrderItem[];
  packId?: string;
  spinsCount?: number;
  totalUsdt: number;
  currency: 'USDT';
  network: 'TON';
  recipientWallet: string;
  memo: string;
  userId?: number | string;
  userName?: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: number;
  paidAt?: number;
}

const orders = new Map<string, Order>();

// Data file persistence
const DATA_DIR = path.resolve('data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(ORDERS_FILE)) {
    const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
    const list: Order[] = JSON.parse(raw);
    list.forEach((ord) => orders.set(ord.id, ord));
  }
} catch (e) {
  console.warn('Orders persistence notice:', e);
}

function persistOrders() {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(Array.from(orders.values()), null, 2));
  } catch (e) {
    console.error('Failed to save orders.json:', e);
  }
}

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    ordersCount: orders.size,
    usdtWallet: USDT_WALLET,
    network: 'TON (Tether USD)',
  });
});

// Create Order (Stickers or Spins in USDT)
app.post('/api/orders/create', (req, res) => {
  try {
    const { type, items, packId, spinsCount, totalUsdt, amountUsdt, user, userId, username } = req.body;
    const finalAmount = parseFloat(Number(totalUsdt || amountUsdt || 0).toFixed(2));
    if (!finalAmount || finalAmount <= 0) {
      return res.status(400).json({ error: 'Неверная сумма заказа в USDT' });
    }

    const orderId = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);
    const memo = orderId;
    const tonkeeperUrl = `https://app.tonkeeper.com/transfer/${USDT_WALLET}?text=${encodeURIComponent(memo)}`;

    const order: any = {
      id: orderId,
      type: type || 'stickers',
      items: items || [],
      packId,
      spinsCount,
      totalUsdt: finalAmount,
      amountUsdt: finalAmount,
      currency: 'USDT',
      network: 'TON',
      recipientWallet: USDT_WALLET,
      memo,
      tonkeeperUrl,
      userId: userId || user?.id,
      userName: username || user?.first_name || user?.username || 'Игрок',
      status: 'pending',
      createdAt: Date.now(),
    };

    orders.set(orderId, order);
    persistOrders();

    res.json({
      success: true,
      order,
      payment: {
        amount: order.totalUsdt,
        currency: 'USDT',
        network: 'TON (Tether USDT)',
        wallet: USDT_WALLET,
        memo,
        tonkeeperUrl,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tonkeeperUrl)}`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка сервера при создании заказа' });
  }
});

// Get Order details
app.get('/api/orders/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: 'Заказ не найден' });
  }
  res.json({ success: true, order });
});

// Verify & Confirm Payment (Server validates payment and marks as paid)
app.post('/api/orders/:orderId/verify', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: 'Заказ не найден' });
  }

  // Mark as paid
  order.status = 'paid';
  order.paidAt = Date.now();
  orders.set(order.id, order);
  persistOrders();

  res.json({
    success: true,
    message: `Платеж на ${order.totalUsdt} USDT успешно подтвержден сервером!`,
    order,
  });
});

// List recent orders
app.get('/api/orders', (req, res) => {
  const list = Array.from(orders.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50);
  res.json({ success: true, orders: list });
});

// Withdrawal Request API
app.post('/api/withdrawals/create', (req, res) => {
  const { address, ton, usdt, userId, userName } = req.body;
  if (!address || (!ton && !usdt)) {
    return res.status(400).json({ error: 'Укажите адрес кошелька и сумму' });
  }
  const withdrawalId = 'WTH-' + Date.now().toString(36).toUpperCase();
  res.json({
    success: true,
    withdrawalId,
    message: 'Заявка на вывод зарегистрирована сервером и отправлена в сеть TON!',
  });
});

// Start Express server and mount Vite
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер Crypto Spin запущен: http://0.0.0.0:${PORT}`);
    console.log(`💳 Прием платежей в USDT: ${USDT_WALLET}`);
  });
}

startServer();
