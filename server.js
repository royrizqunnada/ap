// server.js — Penyusun Masukan untuk Pimpinan
// Server kecil yang menyimpan kunci API dan meneruskan permintaan ke Anthropic.
// Otomatis membaca .env (dotenv). Menyajikan UI dari public/.

require("dotenv").config();

const path = require("path");
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const PORT = process.env.PORT || 3000;
// Dukung dua nama variabel: CLAUDE_MODEL (README lama) dan ANTHROPIC_MODEL.
const MODEL =
  process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error(
    "\n[FATAL] ANTHROPIC_API_KEY belum diset.\n" +
      "Buat file .env (lihat .env.example) lalu isi ANTHROPIC_API_KEY=sk-ant-...\n"
  );
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

// ---- Prompt sistem -------------------------------------------------------

const SISTEM_FOKUS = `Anda asisten yang membantu pejabat/dinas pemerintah menyusun masukan untuk pimpinan.
Dari PERIHAL dan BAHAN (berita/dokumen/fakta) yang diberikan, usulkan 4-6 fokus kritik/sudut pandang yang tajam, relevan, faktual, dan dapat ditindaklanjuti.
Aturan jawaban:
- HANYA daftar poin, satu poin per baris.
- Tiap poin singkat (maksimal ~14 kata), berupa sudut/isu yang perlu disoroti — bukan kalimat panjang.
- Tanpa pengantar, tanpa penutup, tanpa penomoran, tanpa tanda hubung di awal.
- Bahasa Indonesia.`;

const ARAHAN_NADA = {
  Apresiatif:
    "Nada APRESIATIF: tonjolkan dukungan, sisi positif, dan apresiasi; sampaikan catatan secara halus.",
  Seimbang:
    "Nada SEIMBANG: dukungan yang jelas disertai peringatan/catatan yang tegas dan proporsional.",
  Tegas:
    "Nada TEGAS: tonjolkan kritik, risiko, dan peringatan secara lugas namun tetap sopan dan resmi.",
};

const ARAHAN_PANJANG = {
  Singkat: "Panjang SINGKAT: padat, 3-4 poin inti saja, langsung ke pokok.",
  Sedang: "Panjang SEDANG: 4-6 poin dengan penjelasan secukupnya.",
  Lengkap: "Panjang LENGKAP: uraian lebih rinci tiap poin, tetap efisien dan tidak bertele-tele.",
};

const SISTEM_DRAF = `Anda menyusun draf MASUKAN/PENDAPAT dari seorang bawahan kepada PIMPINAN (atasan) untuk dikirim via WhatsApp, ketika pimpinan meminta pendapat atas suatu berita/kegiatan/kerja sama.

GAYA & SAPAAN:
- Bahasa Indonesia formal, hormat sesuai hierarki, memakai kata "kami".
- Buka dengan sapaan hormat kepada penerima. Turunkan sebutannya dari KEPADA, contoh: jika KEPADA mengandung "Jenderal/Kapolda" → "Mohon Izin Jenderal 🙏".
- Tutup dengan kalimat hormat, contoh: "Demikian masukan kami Jenderal. Terima kasih 🙏".
- Emoji 🙏 secukupnya, hanya di pembuka dan penutup.

FORMAT WHATSAPP:
- Gunakan *teks* untuk penekanan dan untuk label bagian.
- Tandai bagian dengan label tebal: *Analisis & Kritik:* dan *Saran:*.
- Daftar saran memakai penomoran 1., 2., 3.
- Pisahkan tiap paragraf/bagian dengan baris kosong agar enak dibaca.

STRUKTUR:
1. Sapaan pembuka.
2. Kalimat pengantar: "Menyampaikan pendapat kami terkait ..." (sebut PERIHAL/konteks).
3. Satu-dua paragraf merangkum isi bahan secara ringkas dan netral.
4. *Analisis & Kritik:* — uraikan sudut pandang berdasarkan FOKUS yang dipilih dan BAHAN; tunjukkan kekuatan dan terutama risiko/kerentanan.
5. *Saran:* — rekomendasi konkret yang bernomor.
6. Kalimat penutup hormat.

PRINSIP:
- Hanya gunakan fakta dari BAHAN. Jangan mengarang nama, angka, atau klaim baru.
- Bila relevan, posisikan institusi sebagai penjamin akurasi/kebenaran informasi, bukan penjamin produk atau pihak tertentu.
- Sesuaikan ketajaman dengan arahan NADA, dan kedalaman/jumlah uraian dengan arahan PANJANG.

Keluarkan HANYA naskah draf siap salin — tanpa komentar, tanpa tanda kutip pembungkus, tanpa penjelasan tambahan.`;

function ambilTeks(message) {
  const blok = message.content.find((b) => b.type === "text");
  return blok ? blok.text : "";
}

function pesanError(err) {
  const msg = err?.message || "";
  if (err?.status === 401) return "Kunci API tidak valid. Periksa ANTHROPIC_API_KEY.";
  if (err?.status === 404) return `Model "${MODEL}" tidak tersedia di akun Anda.`;
  if (/credit/i.test(msg)) return "Saldo kredit API habis. Isi ulang di console.anthropic.com.";
  return "Gagal menghubungi Claude. Coba lagi.";
}

// ---- Endpoint: analisis bahan -> usulkan fokus ---------------------------

app.post("/api/fokus", async (req, res) => {
  const perihal = String(req.body?.perihal || "").trim();
  const bahan = String(req.body?.bahan || "").trim();

  if (!bahan) {
    return res.status(400).json({ error: "Kolom 'Konteks & bahan' wajib diisi." });
  }

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SISTEM_FOKUS,
      messages: [
        {
          role: "user",
          content: `PERIHAL: ${perihal || "(tidak disebutkan)"}\n\nBAHAN:\n${bahan}`,
        },
      ],
    });

    const fokus = ambilTeks(message)
      .split("\n")
      .map((s) => s.replace(/^[\s\-*•\d.)]+/, "").trim())
      .filter((s) => s.length > 0);

    res.json({ fokus });
  } catch (err) {
    console.error("[/api/fokus] error:", err?.status, err?.message || err);
    res.status(500).json({ error: pesanError(err) });
  }
});

// ---- Endpoint: susun draf (streaming) ------------------------------------

app.post("/api/draf", async (req, res) => {
  const perihal = String(req.body?.perihal || "").trim();
  const bahan = String(req.body?.bahan || "").trim();
  const dari = String(req.body?.dari || "").trim();
  const kepada = String(req.body?.kepada || "").trim();
  const ketegasan = String(req.body?.ketegasan || "Seimbang").trim();
  const panjang = String(req.body?.panjang || "Sedang").trim();
  const fokus = Array.isArray(req.body?.fokus)
    ? req.body.fokus.map((f) => String(f).trim()).filter(Boolean)
    : [];

  if (!bahan) {
    return res.status(400).json({ error: "Kolom 'Konteks & bahan' wajib diisi." });
  }

  const arahanNada = ARAHAN_NADA[ketegasan] || ARAHAN_NADA.Seimbang;
  const arahanPanjang = ARAHAN_PANJANG[panjang] || ARAHAN_PANJANG.Sedang;
  const daftarFokus = fokus.length
    ? fokus.map((f) => `- ${f}`).join("\n")
    : "(tentukan sendiri fokus paling relevan dari bahan)";

  const prompt = [
    `PERIHAL: ${perihal || "(tidak disebutkan)"}`,
    `DARI: ${dari || "(tidak disebutkan)"}`,
    `KEPADA: ${kepada || "(tidak disebutkan)"}`,
    arahanNada,
    arahanPanjang,
    ``,
    `FOKUS KRITIK YANG DIPILIH:`,
    daftarFokus,
    ``,
    `BAHAN:`,
    bahan,
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 4000,
      system: SISTEM_DRAF,
      messages: [{ role: "user", content: prompt }],
    });

    stream.on("text", (delta) => res.write(delta));
    await stream.finalMessage();
    res.end();
  } catch (err) {
    console.error("[/api/draf] error:", err?.status, err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ error: pesanError(err) });
    } else {
      res.write("\n\n[Terjadi kesalahan saat menyusun draf.]");
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Penyusun Masukan berjalan di http://localhost:${PORT}  (model: ${MODEL})`);
});
