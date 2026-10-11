BINANCE PUMP DETECTOR V3 — HOSTING GRATIS (UJI COBA)

File ini berisi:
- index.html, manifest.json, sw.js: PWA untuk dibuka di HP (bukan APK).
- server.js: bot Telegram yang memantau Binance Spot USDT dan mengirim alert.
- package.json: dependensi untuk hosting Node.js.

PILIHAN HOSTING GRATIS UNTUK UJI COBA: RENDER
Dokumentasi resmi: https://render.com/docs/free
Catatan penting: layanan gratis Render tidur setelah 15 menit tanpa trafik masuk. Saat tidur, pemantauan berhenti dan alert tidak dijamin. Layanan gratis juga dapat restart. Ini cocok untuk mencoba, bukan pemantauan trading 24/7.

LANGKAH-LANGKAH:
1. Buat bot Telegram:
   - Buka Telegram, cari @BotFather, kirim /newbot.
   - Ikuti instruksi dan salin token bot.
   - Buka bot baru Anda lalu tekan Start.
   - Untuk Chat ID, buka:
     https://api.telegram.org/botTOKEN_ANDA/getUpdates
     Ganti TOKEN_ANDA dengan token asli. Cari nilai di "chat":{"id":...}.
     Jangan bagikan token atau hasil getUpdates kepada siapa pun.

2. Upload folder ini ke repository GitHub milik Anda.
   Pastikan file server.js, package.json, index.html, manifest.json, sw.js berada di folder utama repository.

3. Buka https://render.com dan daftar/login.
   - Pilih New + → Web Service.
   - Hubungkan repository GitHub Anda.
   - Runtime: Node.
   - Build Command: npm install
   - Start Command: npm start
   - Instance Type: Free.

4. Di bagian Environment Variables Render, tambahkan:
   TELEGRAM_BOT_TOKEN = token bot Anda
   TELEGRAM_CHAT_ID = Chat ID Anda
   PUMP_THRESHOLD = 1.0
   EARLY_THRESHOLD = 0.45
   MIN_QUOTE_VOLUME = 50000
   ALERT_COOLDOWN_SECONDS = 180

5. Tekan Deploy. Periksa Logs. Jika berhasil, log akan menampilkan "Terhubung. Memantau semua pair USDT."
   Buka URL layanan Render; halaman harus menampilkan pesan bahwa bot berjalan.
   Tes Telegram dengan menunggu sinyal pasar. Bot tidak mengirim pesan tes otomatis.

PENGATURAN:
- PUMP_THRESHOLD=1.0 berarti alert pump saat perubahan maksimum di jendela 1/3/5 menit mencapai 1%.
- EARLY_THRESHOLD=0.45 berarti sinyal awal saat kenaikan sekitar 30 detik mencapai 0,45% dan belum memenuhi ambang pump.
- MIN_QUOTE_VOLUME=50000 menyaring pair berdasarkan volume quote 24 jam (USDT), bukan volume per menit.
- ALERT_COOLDOWN_SECONDS=180 menghindari alert berulang terlalu sering untuk pair/jenis sinyal yang sama.

PENTING:
- Hosting gratis tidak menjamin layanan terus aktif; ketika layanan tidur/restart, alert bisa terhenti.
- Untuk alert 24/7 yang lebih andal, gunakan VPS/worker yang selalu aktif.
- Sinyal bisa salah dan bukan jaminan harga akan naik. Jangan mengandalkan alert sebagai satu-satunya dasar transaksi.
- Tidak perlu API key Binance; bot hanya membaca data pasar publik.
- Jangan pernah menaruh token bot di HTML, repository publik, atau membagikannya kepada orang lain.
