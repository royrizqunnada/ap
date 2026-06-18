// server.js — Express server bertenaga Claude (Anthropic API).
// Membaca konfigurasi dari .env secara otomatis (dotenv), menyajikan UI dari
// folder public/, dan mem-proxy permintaan chat ke Claude dengan streaming.

require("dotenv").config();

const path = require("path");
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const PORT = process.env.PORT || 3000;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  "Anda adalah asisten yang ramah dan membantu. Jawab dengan jelas dan ringkas.";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error(
    "\n[FATAL] ANTHROPIC_API_KEY belum diset.\n" +
      "Buat file .env (lihat .env.example) lalu isi:\n" +
      "  ANTHROPIC_API_KEY=sk-ant-...\n"
  );
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Healthcheck sederhana — berguna untuk PM2 / monitoring.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

// Endpoint chat: menerima { messages: [{role, content}, ...] } dan
// mengirim balasan Claude sebagai aliran teks (streaming) ke browser.
app.post("/api/chat", async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : null;

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: "Field 'messages' wajib diisi." });
  }

  // Validasi bentuk pesan agar tidak meneruskan payload sembarangan ke API.
  const cleaned = messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== ""
    )
    .map((m) => ({ role: m.role, content: m.content }));

  if (cleaned.length === 0) {
    return res.status(400).json({ error: "Tidak ada pesan valid." });
  }

  // Streaming respons sebagai text/plain agar mudah dibaca fetch() di frontend.
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: cleaned,
    });

    stream.on("text", (delta) => {
      res.write(delta);
    });

    await stream.finalMessage();
    res.end();
  } catch (err) {
    console.error("[/api/chat] error:", err?.message || err);
    // Jika belum ada byte terkirim, kirim error sebagai teks; jika sudah
    // streaming, cukup tutup koneksi.
    if (!res.headersSent) {
      res.status(500).json({ error: "Gagal menghubungi Claude." });
    } else {
      res.write("\n\n[Terjadi kesalahan saat memproses permintaan.]");
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}  (model: ${MODEL})`);
});
