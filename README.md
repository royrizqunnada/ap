# Penyusun Masukan untuk Pimpinan

Alat bantu berbasis web untuk menyusun masukan/pendapat dinas ketika diminta oleh
pimpinan. Tempel bahan/berita, biarkan AI (model **Claude**) mengusulkan fokus kritik,
lalu salin draf yang sudah berformat **WhatsApp**.

Agar kunci API tetap aman, alat dipecah menjadi:

- `public/index.html` — halaman depan (tampilan + interaksi)
- `server.js` — server kecil yang menyimpan kunci API dan meneruskan permintaan ke Anthropic

## Cara kerja

1. Isi **Perihal** dan **Konteks & bahan** (fakta yang Anda ketahui).
2. Klik **Analisis bahan → usulkan fokus** — AI mengusulkan beberapa fokus kritik.
3. Centang/lepas fokus, atau tambah sendiri. Isi **Dari**/**Kepada** dan **Tingkat ketegasan**.
4. Klik **Susun draf masukan** — draf berformat WhatsApp muncul, lalu klik **Salin**.

## Jalankan secara lokal

```bash
npm install
cp .env.example .env      # lalu isi ANTHROPIC_API_KEY
npm start
```

Buka http://localhost:3000

## Variabel lingkungan

| Variabel             | Wajib | Default            | Keterangan                                   |
| -------------------- | ----- | ------------------ | -------------------------------------------- |
| `ANTHROPIC_API_KEY`  | ✅    | —                  | Kunci dari console.anthropic.com             |
| `CLAUDE_MODEL`       | ❌    | `claude-opus-4-8`  | Model Claude (alias `ANTHROPIC_MODEL` juga didukung) |
| `PORT`               | ❌    | `3000`             | Port server                                  |

## Deploy ke VPS (Ploi)

1. **Repository**: hubungkan repo ini, branch `main`.
2. **Deploy script**:
   ```bash
   cd /home/ploi/ap.digisolve.id
   git pull origin main
   npm ci
   sudo supervisorctl restart all
   ```
3. **Environment** (`.env`): isi `ANTHROPIC_API_KEY`, dan `PORT` (mis. `3001` bila 3000 dipakai situs lain).
4. **Daemon**: `node server.js` (Directory `/home/ploi/ap.digisolve.id`, user `ploi`).
5. **Nginx**: reverse-proxy domain ke `127.0.0.1:<PORT>` (`proxy_buffering off`).

## Catatan

- Kunci API hanya tersimpan di server, tidak pernah terlihat oleh pengguna halaman.
- Draf hanya disusun dari bahan yang ditempel. **Tetap periksa isi sebelum dikirim** —
  tanggung jawab atas naskah ada pada pengguna.
- Endpoint: `POST /api/fokus`, `POST /api/draf` (streaming), `GET /api/health`.
