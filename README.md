# Claude Chat (VPS-ready)

Aplikasi web chat sederhana bertenaga **Claude (Anthropic API)**. Backend Node/Express
membaca `ANTHROPIC_API_KEY` dari `.env` secara otomatis (dotenv), menyajikan UI dari
`public/`, dan mem-proxy permintaan ke Claude dengan **streaming**.

## Struktur

```
.
├── public/index.html   # antarmuka chat (frontend)
├── server.js           # server Express (otomatis baca .env)
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Jalankan secara lokal

```bash
npm install
cp .env.example .env       # lalu isi ANTHROPIC_API_KEY
npm start
```

Buka http://localhost:3000

## Deploy ke VPS (manual)

```bash
git clone <URL-REPO> ap
cd ap
npm install
nano .env                  # isi ANTHROPIC_API_KEY=sk-ant-...
npm start                  # uji di http://IP-VPS:3000
```

Agar tetap hidup, gunakan PM2:

```bash
npm install -g pm2
pm2 start server.js --name claude-chat
pm2 save
pm2 startup                # ikuti instruksi yang muncul
```

## Deploy via Ploi

1. **Server → Sites → Add Site**: domain `ap.digisolve.id`, project root default.
2. **Repository**: hubungkan ke repo ini, pilih branch yang ingin di-deploy.
3. **Environment**: tambahkan `ANTHROPIC_API_KEY` (Ploi menulis `.env` untuk Anda).
4. **Deploy script**: `npm ci` lalu restart proses (lihat README di bawah / panduan Ploi).
5. **Daemon / Process**: jalankan `node server.js` (port 3000) dan reverse-proxy Nginx
   dari domain ke `127.0.0.1:3000`.

## Variabel lingkungan

| Variabel             | Wajib | Default            | Keterangan                          |
| -------------------- | ----- | ------------------ | ----------------------------------- |
| `ANTHROPIC_API_KEY`  | ✅    | —                  | Kunci dari console.anthropic.com    |
| `ANTHROPIC_MODEL`    | ❌    | `claude-opus-4-8`  | Model Claude yang dipakai           |
| `PORT`               | ❌    | `3000`             | Port server                         |
| `SYSTEM_PROMPT`      | ❌    | (lihat server.js)  | Instruksi sistem untuk asisten      |

## Catatan

- `.env` dan `node_modules/` sudah diabaikan oleh `.gitignore` — jangan commit kunci API.
- Endpoint API: `POST /api/chat` (body `{ messages: [{role, content}, ...] }`) dan
  `GET /api/health`.
