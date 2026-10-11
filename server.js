const WebSocket = require("ws");
const http = require("http");
const PORT = Number(process.env.PORT || 3000);
http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("Binance Pump Detector Telegram bot is running.\\n");
}).listen(PORT, "0.0.0.0", () => console.log(`Health server listening on ${PORT}`));

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PUMP_THRESHOLD = Number(process.env.PUMP_THRESHOLD || 1.0);
const EARLY_THRESHOLD = Number(process.env.EARLY_THRESHOLD || 0.45);
const MIN_QUOTE_VOLUME = Number(process.env.MIN_QUOTE_VOLUME || 50000);
const COOLDOWN_MS = Number(process.env.ALERT_COOLDOWN_SECONDS || 180) * 1000;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("Isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID di environment/.env terlebih dahulu.");
  process.exit(1);
}

const history = new Map();
const lastAlert = new Map();
let socket;
let reconnectTimer;

function getChange(samples, seconds, now, currentPrice) {
  const arr = samples || [];
  let chosen = null;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (now - arr[i].time >= seconds * 1000) { chosen = arr[i]; break; }
  }
  return chosen && chosen.price > 0 ? (currentPrice / chosen.price - 1) * 100 : null;
}

async function telegram(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      disable_web_page_preview: true
    })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body}`);
  }
}

function fmt(n) {
  if (n == null) return "belum tersedia";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function maybeAlert(symbol, price, volume, changes, early, now) {
  if (volume < MIN_QUOTE_VOLUME) return;
  const key = `${symbol}:${early ? "EARLY" : "PUMP"}`;
  if (now - (lastAlert.get(key) || 0) < COOLDOWN_MS) return;

  const maxChange = Math.max(...changes.filter(v => v != null));
  const pump = maxChange >= PUMP_THRESHOLD;
  if (!pump && !early) return;

  const type = pump ? "🚀 PUMP TERDETEKSI" : "⚡ SINYAL AWAL";
  const message =
    `${type}\n` +
    `Pair: ${symbol}\n` +
    `Harga: ${price}\n` +
    `Perubahan 1 menit: ${fmt(changes[0])}\n` +
    `Perubahan 3 menit: ${fmt(changes[1])}\n` +
    `Perubahan 5 menit: ${fmt(changes[2])}\n` +
    `Volume 24 jam: ${Math.round(volume).toLocaleString("en-US")} USDT\n` +
    `Buka: https://www.binance.com/en/trade/${symbol}?type=spot\n\n` +
    `Catatan: sinyal momentum, bukan jaminan harga akan terus naik.`;
  lastAlert.set(key, now);
  telegram(message).then(() => console.log(`${new Date().toISOString()} sent ${type} ${symbol}`))
    .catch(err => console.error("Gagal mengirim Telegram:", err.message));
}

function connect() {
  console.log("Menghubungkan ke Binance Spot ticker...");
  socket = new WebSocket("wss://stream.binance.com:9443/ws/!ticker@arr");
  socket.on("open", () => console.log("Terhubung. Memantau semua pair USDT."));
  socket.on("message", raw => {
    let tickers;
    try { tickers = JSON.parse(raw.toString()); } catch { return; }
    const now = Date.now();
    for (const t of tickers) {
      if (!t.s || !t.s.endsWith("USDT")) continue;
      const price = Number(t.c), volume = Number(t.q || 0);
      if (!Number.isFinite(price) || price <= 0) continue;
      let samples = history.get(t.s) || [];
      samples.push({ time: now, price });
      samples = samples.filter(x => now - x.time <= 6 * 60 * 1000);
      history.set(t.s, samples);

      const c1 = getChange(samples, 60, now, price);
      const c3 = getChange(samples, 180, now, price);
      const c5 = getChange(samples, 300, now, price);
      const c30 = getChange(samples, 30, now, price);
      const changes = [c1, c3, c5];
      // Early signal: price rises quickly over ~30 sec, but is not yet a full pump.
      const early = c30 != null && c30 >= EARLY_THRESHOLD &&
        (Math.max(...changes.filter(v => v != null), -Infinity) < PUMP_THRESHOLD);
      maybeAlert(t.s, price, volume, changes, early, now);
    }
  });
  socket.on("error", err => console.error("WebSocket:", err.message));
  socket.on("close", () => {
    console.log("Koneksi Binance terputus; mencoba kembali dalam 5 detik.");
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 5000);
  });
}

console.log(`Setelan: pump ${PUMP_THRESHOLD}%, awal ${EARLY_THRESHOLD}%, volume minimum ${MIN_QUOTE_VOLUME} USDT, cooldown ${COOLDOWN_MS/1000}s`);
connect();
