# For you, Always. 💕

Platform hadiah digital personal — customer upload foto & voice note sendiri via Studio Editor, hasilnya berupa Gift Page cantik yang bisa dibagikan via link.

---

## Struktur Folder

```
for-you-always/
├── studio/          → Studio Editor (halaman creator)
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── studio.js          → Controller utama
│       ├── auth.js            → Validasi studioToken dari URL
│       ├── uploader.js        → Upload & manage foto
│       ├── voice-recorder.js  → Rekam & upload voice note
│       ├── autosave.js        → Autosave config ke API
│       ├── preview.js         → Live preview gift page
│       └── publisher.js       → Publish gift & tampilkan link
│
├── gift/            → Gift Page (halaman penerima)
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── gift.js            → Load config & routing
│       ├── gallery.js         → Galeri foto + lightbox
│       └── player.js          → Custom voice note player
│
├── worker/          → Backend API (Cloudflare Worker)
│   ├── worker.js              → Semua route handler
│   └── wrangler.toml          → Config Cloudflare
│
└── assets/          → Static assets bersama
    ├── logo.svg
    └── icons/
```

## Tech Stack

- **Frontend:** HTML5 + CSS3 + Vanilla JS (tanpa framework)
- **Backend:** Cloudflare Workers
- **Storage:** Cloudflare R2 (foto & audio)
- **Database:** Cloudflare KV (config gift)
- **Deploy:** Cloudflare Pages (frontend) + Workers (backend)

## Setup Development

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 2. Buat R2 Bucket
```bash
wrangler r2 bucket create for-you-always-files
```

### 3. Buat KV Namespace
```bash
wrangler kv namespace create GIFT_DATA
# Salin ID yang muncul ke wrangler.toml
```

### 4. Set Admin Secret
```bash
wrangler secret put ADMIN_SECRET
# Masukkan secret yang kuat saat diminta
```

### 5. Deploy Worker
```bash
cd worker
wrangler deploy
```

### 6. Deploy Frontend
```bash
# Via Cloudflare Pages dashboard, connect ke GitHub repo ini
# Atau via CLI:
wrangler pages deploy . --project-name for-you-always
```

## API Base URL

Production: `https://for-you-always-api.workers.dev/api`

## Cara Buat Studio untuk Customer Baru

Setelah customer konfirmasi bayar, jalankan:

```bash
curl -X POST https://for-you-always-api.workers.dev/api/admin/create-studio \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"packageType": "premium"}'
```

Response berisi `studioUrl` → kirim ke customer via WhatsApp.

---

*For you, Always. — Dibuat dengan ❤️*
