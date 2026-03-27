# Arcade Edition — Project Summary
**Owner:** Aldor (AL)  
**Period:** March 12–19, 2026  
**Stack:** Cloudflare Workers + R2, Next.js (landing page), Vanilla JS, HTML/CSS

---

## 🎯 Tentang Project

**For You, Always.** adalah platform kado digital romantis dengan dua produk:

### 1. Voices. Gift
Layanan kado digital emosional berbasis foto dan suara. Customer dapat mengunggah 12-15 foto kenangan serta merekam atau mengunggah pesan suara pribadi. Audio tersebut dapat dipadukan dengan musik latar (ambient) pilihan untuk menciptakan pengalaman yang menyentuh hati. Penerima kado akan melihat galeri foto yang sinkron dengan pesan suara pengirim.

**Tema yang tersedia (~10 tema):**
- Gift series: gift, gift-beige, gift-blanc, gift-sage, gift-pinky
- Camera series: camera/silver, camera/midnight, camera/mossy, camera/rosewood, camera/magenta

**Worker Voices Gift:** `valentine-upload.aldoramadhan16.workers.dev`

**Config Structure Voices Gift:**
```js
window.STANDALONE_CONFIG = {
  recipientName, theme, occasion, message,
  photos: [{ id, url, order, status, caption }],
  voiceNote: { url, duration, mimeType },
  ambient,           // 'none' | 'rain' | 'custom' | dll
  ambientVolume,     // 0.0 - 1.0
  customAmbientUrl,  // URL MP3 kalau ambient = 'custom'
  voiceVolume,
  polaroid_photo,
  polaroid_letter,
  password,
  _meta: { generatedAt, theme_folder, studioVersion }
}
```

### 2. Arcade Edition ⭐ (Fokus Utama)
Platform kado interaktif dengan **10 ruangan** berbasis pixel art Ghibli. Customer mengisi konten lewat **Studio Editor** sendiri (self-serve, privat), lalu publish dan kirim link ke pasangan. Penerima buka lewat password.

**Harga:** Rp 20.000  
**Domain:** `for-you-always.my.id` (landing page) + `arcade.for-you-always.my.id` (Arcade demo & clean links)
**Target customer:** 90% perempuan, romantic, non-IT, pakai HP

---

## 🏗️ Arsitektur Teknis

```
for-you-always.my.id (Next.js)
├── / → Voices Gift landing page
└── /arcade → Arcade Edition landing page

arcade.for-you-always.my.id (Vercel Routing / Cloudflare Workers)
├── / → Arcade Demo (Instant Access)
├── /admin → Admin Insight Dashboard
├── /admin/songs → Song Library Manager (BARU)
├── /generator → Studio Project Generator
├── /studio/:token → Regular Studio Editor
├── /studio-premium/:token → Premium Studio Editor
└── /:id → Arcade Player (Recipient View)

Storage: Cloudflare R2 (foto, video, audio, assets)
CDN: cdn.for-you-always.my.id
KV: ARCADE_DATA (config per customer)
Region: Singapore (ap-southeast-1)
AI: Qwen Plus via dashscope-intl.aliyuncs.com
Worker Arcade: arcade-edition.aldoramadhan16.workers.dev
Worker Voices: valentine-upload.aldoramadhan16.workers.dev
GitHub Repo: detectivecrewze/gift (ID: 1177352393)
Vercel Project Arcade: prj_PkJKrAezxOk4kgfqEMKPmAW6j2gl
Vercel Project Premium Template: fya-premium-kit
```

---

## 🎮 10 Ruangan Arcade

| Room | Deskripsi |
|------|-----------|
| **Music** | Putar lagu dengan star visualizer |
| **Journey** | Timeline hubungan dari awal (dengan hint tips jadian/nikah) |
| **Moments** | Galeri foto sinematik |
| **Quiz** | Tebak jawaban tentang penerima (up to 10 QS) |
| **Atlas** | Peta kenangan interaktif (Windows 98 Style) |
| **Catcher** | Mini-game tangkap bintang |
| **Fortune** | Kartu ramalan romantis |
| **Things I Love** | Flip card hal yang dicintai |
| **Bucket List** | Daftar impian bersama gaya journal vertical |
| **Message** | Pesan cinta penutup |

---

## ✅ Semua Pekerjaan yang Sudah Selesai

### 🔧 Setup & Infrastructure
- Install **The Agency** (68 AI skills) di Windows via Antigravity
- Setup semua agency skill prompt untuk dipakai sebagai prompter
- Cloudflare Workers deployment pipeline

### 🔒 Security & Bug Fixes
- **Security patch** — Worker `/submit` menolak jika ID sudah ada kecuali `studioPassword` cocok
- **Performance fix** — `will-change: transform, opacity` di God Rays & Petals CSS
- **AI migration** — Ganti Gemini → Qwen Plus (endpoint Singapore/intl)
- **Autosave bug fix #1** — Race condition: autosave tidak cek `Music.isUploading()` sebelum save
- **Autosave bug fix #2** — Infinite retry loop di catch block dihapus
- **Things I Love publisher fix** — `things_i_love` tidak masuk ke `validatedPayload`, sudah diperbaiki

### 🎨 Studio Editor (Regular & Premium)
- **Section reordering** — urutan baru: Recipient Name → Journey → Moments → Atlas → Music → Quiz → Things I Love → Bucket List → Message → Password
- **Quiz MAX_QUESTIONS** — dinaikkan dari 7 → 10 pertanyaan
- **Admin dashboard** — folder `admin/` baru untuk monitoring customer
- **Premium Studio Refinement** — Centering modal sukses, penambahan langkah konfirmasi "Sudah Selesai?", dan integrasi input Vercel Domain Request.
- **Vercel Domain Validation** — Proteksi input domain agar tidak mengandung spasi, emoji, atau karakter spesial.
- **Barcode (QR Code) Integration** — Sistem otomatis generate QR kado aesthetic yang bisa didownload user.

### 🎵 Music Studio — Song Library (BARU — March 19)
- **Tab "Request Admin" DIHAPUS** — diganti dengan 2 tab baru
- **Tab 1: Song Library** — modal popup, list 1 kolom dengan cover art, pilih 1 lagu dari kurasi AL
- **Tab 2: Upload MP3** — upload zone + audio player preview + edit judul & artis. **TIDAK ADA cover art**
- **playlist.json** — file JSON berisi daftar lagu kurasi, dibaca dari `./playlist.json` di folder studio
- **admin/songs.html** — halaman manager untuk AL kelola Song Library: tambah lagu, upload MP3+cover, download JSON
- **localStorage persistence** — data songs.html tersimpan di browser, tidak hilang saat refresh + ada tombol Reset
- Berlaku untuk **studio regular** dan **studio premium** (file music.js identik)

### 🗺️ Atlas of Us (Room ke-10) — BARU March 19
- **Room Development** — Room berbasis peta interaktif Leaflet.js + OpenStreetMap dengan tema Windows 98 di dalam Ghibli room card
- **Font:** Press Start 2P
- **Stats bar** — Places + Km (tanpa tanggal)
- **Journey animation** — flyTo tiap pin satu per satu saat pertama buka, sessionStorage untuk skip animasi di kunjungan berikutnya
- **Info card** — slide up dari bawah peta, Win98 title bar, foto + cerita
- **Navigator** — ← PREV / NEXT → Win98 button style
- **Haversine distance** calculator untuk total km
- **Pin Management** — Fitur tambah pin lokasi via Google Maps link di Studio, koordinat auto-resolve
- **Simplified Instructions** — Panduan copy-link manual yang lebih stabil untuk user
- **Pagination Logic** — Perbaikan navigasi: Overview (0/N) ➡️ Location 1 ➡️ dst
- **File:** `arcade/rooms/atlas/index.html`

### 🕹️ Arcade Player
- **Things I Love room** — redesign total menjadi **flip card** system:
  - Front: gradient cream, "Tap untuk membuka ✦"
  - Back: Dancing Script font, tinggi auto
  - Persistent state via `sessionStorage`
- **Wood Sign dynamic name** — menampilkan "For [Name], Always" dengan nama di-highlight gold italic, auto-shrink font untuk nama panjang
- **Password hint redesign** — kraft/cream gradient, pin emoji, animasi slide-up
- **Bucket List redesign** — journal diary vertical: book spine, ruled lines, red margin line, Caveat font, golden circle checkmarks
- **Main menu reordering** — Row 1: Music·Journey·Moments·Quiz | Row 2: Atlas·Catcher·Fortune·Things·Bucket·Message
- **Menu items margin** — turun 30px desktop, 20px mobile
- **Persistent iframe** — Things I Love tidak reload saat dibuka ulang
- **Typography Overhaul** — Integrasi font `Caveat` (22px) untuk pesan personal agar lebih personal dan nyaman dibaca.

### 🌐 Branding & Routing (Update Maret 18)
- **Clean URL Routing** — Menghilangkan `.html` dari semua path. `/admin`, `/generator`, dan `/studio` kini bisa diakses langsung.
- **Root Demo Mapping** — Domain utama `arcade.for-you-always.my.id` langsung mengarah ke demo Arcade.
- **Favicon Integration** — Integrasi lengkap (ICO, PNG, SVG, Apple Touch Icon) di seluruh modul proyek.
- **Workspace Cleanup** — Menghapus file zip dan folder temporary, merapikan aset ke `/assets/favicons`.

### 🌟 Stargazing Room (Dibuat lalu di-revert)
- Room baru "Stargazing" — langit malam, bintang = kenangan, tap bintang → popup cerita + foto
- Diputuskan di-revert karena hasil visual kurang memuaskan

### 🎟️ Automated Premium Bundling System (BARU — March 27)
- **Token-based Access:** Customer membeli token (misal kuota 5 kado) untuk login ke portal mandiri di `/bundle`.
- **Self-Service Dashboard:** Customer bisa membuat, menamai (slugify otomatis), dan mengamankan link kado mereka sendiri sebelum masuk ke Studio. URL otomatis dipesan dan "dikunci" agar tidak bisa direbut orang lain.
- **Premium UI & UX:** Layar konfirmasi berbasis *glassmorphism modal*, SVG *premium icon*, dan flow yang tidak langsung melempar user ke studio tanpa opsi menyalin link terlebih dahulu.
- **Admin Ledger Dashboard (`/bundle/admin`):** Dashboard rahasia (berbasis password) khusus Admin untuk melihat semua token aktif, sisa kuota, dan link studio yang sudah dibuat oleh para customer.
- **Reset & Refund Quota:** Fitur bagi admin untuk menghapus proyek kado yang salah ketik namanya oleh customer, dengan mekanisme yang secara otomatis mengembalikan kuota token tersebut (+1).
- **Worker & Routing:** Endpoint menggunakan KV `ARCADE_DATA`  (Prefix: `BNDL_`). Routing bersih melalui `vercel.json` dan endpoint admin terlindungi oleh `ADMIN_SECRET`.

---

## 📁 Struktur File Penting

```
/ (Root)
├── vercel.json                  ← Routing Config
├── arcade/
│   ├── index.html               ← Main player
│   ├── config.js                ← Demo/standalone config
│   ├── script.js
│   ├── style.css
│   ├── assets/
│   │   └── favicons/
│   └── rooms/
│       ├── atlas/               ← BARU (Room ke-10)
│       │   └── index.html
│       ├── music/
│       ├── journey/
│       ├── moments/
│       ├── quiz/
│       ├── star-catcher/
│       ├── fortune-cookie/
│       ├── things-i-love/
│       ├── bucket-list/
│       └── message/
├── studio/                      ← Editor Regular
│   ├── index.html
│   ├── playlist.json            ← BARU (Song Library data)
│   └── js/
│       ├── music.js             ← UPDATED (Song Library + Upload MP3)
│       ├── atlas.js             ← BARU
│       └── ... (file lainnya)
├── studio-premium/              ← Editor Premium
│   ├── index.html               ← UPDATED (modal sukses)
│   ├── playlist.json            ← BARU (sama dengan studio/)
│   └── js/
│       ├── music.js             ← UPDATED (sama dengan studio/)
│       ├── publisher.js         ← UPDATED (re-publish tanpa isi domain ulang)
│       └── ... (file lainnya)
├── admin/
│   ├── index.html               ← Admin dashboard
│   └── songs.html               ← (Song Library Manager)
├── bundle/                      ← BARU (Premium Bundling Portal)
│   ├── index.html               ← Customer portal login & dashboard
│   ├── admin.html               ← Admin Ledger dashboard
│   └── js/app.js                ← UI & API Logic
├── premium_kit/
│   └── config.js                ← Template config deploy manual
├── generator/
│   ├── index.html               
│   └── generator.js             ← UPDATED (Bisa generate tiket Bundle)
└── worker/
    └── worker.js                ← UPDATED (Bundle endpoints & security)
```

---

## 🔑 Info Teknis Penting

| Key | Value |
|-----|-------|
| Worker Arcade | `arcade-edition.aldoramadhan16.workers.dev` |
| Worker Voices | `valentine-upload.aldoramadhan16.workers.dev` |
| CDN | `cdn.for-you-always.my.id` |
| WhatsApp | `wa.me/6281381543981` |
| AI Endpoint | `dashscope-intl.aliyuncs.com` (Singapore) |
| AI Model | `qwen-plus` |
| R2 Region | `ap-southeast-1` |
| GitHub Repo | `detectivecrewze/gift` |
| GitHub Repo ID | `1177352393` |
| Vercel Project Arcade | `prj_PkJKrAezxOk4kgfqEMKPmAW6j2gl` |
| Vercel Project Premium | `fya-premium-kit` |
| Voices GIF | `bpahzgewtgfjwobjrpdk.supabase.co/...voices.gif` |

---

## 📋 Aturan Kerja yang Disepakati

1. **SELALU** tulis "DO NOT push to GitHub, DO NOT deploy to Cloudflare" di setiap prompt
2. Max **4 agency skills** per prompt
3. Selalu minta **planning dulu**, tunggu ACC sebelum eksekusi
4. Selalu push perubahan sebelum implement fitur baru
5. Pakai **intl endpoint** untuk semua API (Singapore region)
6. **Tidak ada emoji** di landing page — gunakan SVG icons
7. Desain harus **feminine, warm, romantic** — bukan sci-fi atau boyish

---

## 💎 Voices Gift — Premium Standalone Mode

Fase ini bertujuan untuk membuat produk "Layanan Jasa Pembuatan Website Kado" yang benar-benar mandiri dan eksklusif.

### Fitur Baru & Perubahan:
1. **Premium Submission Flow**: Studio Premium kini mengirimkan data kado langsung ke Telegram Admin dalam bentuk ringkasan order dan file `config.js` yang siap pakai.
2. **Standalone Configuration**: Semua tema di Voices Gift (Original, Rosewood, Midnight, Mossy, Magenta) kini mendukung file `config.js`. Jika file ini ada di folder tema, website akan otomatis berjalan tanpa memerlukan koneksi ke database pusat.
3. **Vercel Domain Request**: Di akhir proses pembuatan, pelanggan wajib menentukan nama domain yang mereka inginkan (contoh: `kado-untuk-lisa.vercel.app`). Informasi ini otomatis diteruskan ke admin via Telegram & WhatsApp.
4. **AI Message Generator (Qwen)**: Integrasi dengan Qwen AI Alibaba untuk membantu pelanggan menulis pesan romantis secara otomatis sesuai *tone* yang dipilih (Romantis, Lucu, Santai, atau Tulus).

### Workflow Operasional (Deploy Manual):
1. Pelanggan mengisi konten di `studio-premium/`.
2. Setelah klik Publish, Admin menerima chat di Telegram berisi `config.js`.
3. Admin memasukkan `config.js` ke folder tema yang dipilih (misal folder `camera/magenta/`).
4. Admin men-deploy folder tersebut ke Vercel dengan domain pilihan pelanggan.
5. Selesai. Link kado bersifat permanen dan sangat cepat diakses.

### Catatan Penting — Auto Deploy:
Auto-deploy via Vercel API sudah dicoba selama ~3 jam tapi tidak feasible di free tier karena Vercel tidak support inject file + gitSource bersamaan. **Keputusan final: tetap deploy manual.** Re-publish oleh customer tidak perlu isi domain lagi (domain tersimpan di KV).

### Bug Fix — customAmbientUrl Berhasil Diperbaiki:
Bug yang menyebabkan lagu kustom hilang saat proses publish di Premium Studio telah diperbaiki. `publisher.js` kini menyertakan `customAmbientUrl` ke dalam payload metadata secara otomatis.

---

## 🎵 Voices Gift Studio — Music Update (NEXT SESSION)

### Background
Voices Gift studio saat ini punya section musik dengan ambient sounds (rain, nature, dll) yang ingin dihapus seluruhnya.

### Yang Diminta AL
Hapus section ambient sepenuhnya. Ganti dengan **2 tab** persis seperti Arcade:
1. **Song Library** — pilih dari kurasi AL (modal popup, cover art, list 1 kolom)
2. **Upload Musik** — upload MP3. **TANPA cover art** (beda dari Arcade!)

### File Yang Perlu Diubah
- `studio.js` di Voices Gift studio (handle section musik/ambient)
- `index.html` Voices Gift studio (UI section musik)
- `publisher.js` Voices Gift (fix bug customAmbientUrl tidak tersimpan)

### Ambient-data.js Issue
Ketika folder tema di-deploy standalone, terjadi ReferenceError karena `shared/ambient-data.js` tidak ada. Fix:
```js
// Taruh di paling atas player.js setiap tema
if (typeof AMBIENT_SOUNDS === 'undefined') {
  window.AMBIENT_SOUNDS = {};
}
```
Dan copy `ambient-data.js` ke dalam tiap folder tema standalone.

---

## 🚧 Yang Masih Pending / Belum Selesai

1. **Deep bug audit** seluruh `/arcade` folder — prompt sudah dibuat, belum dijalankan.
2. **Video/GIF main menu** — placeholder di slideshow, belum ada URL video asli.
3. **Song Library upload** — playlist.json sudah ada tapi MP3 + cover art belum diupload ke R2 oleh AL.
4. **Atlas studio input** — customer belum bisa isi pin via studio (hanya bisa via config manual).
5. **Voices Gift studio music** ← **PRIORITAS NEXT SESSION** — hapus ambient, tambah Song Library + Upload MP3
6. **Voices Gift ambient-data.js** — perlu dicopy ke tiap folder tema standalone
7. **Voices Gift publisher bug** — [FIXED] `customAmbientUrl` kini aman tersimpan.
8. **Studio Premium sync** — beberapa perubahan studio regular belum di-sync ke premium
9. **Marketing Deployment** — Strategi sudah siap (`marketing-strategy.md`), tinggal eksekusi.

🚀 **Last Updated: March 27, 2026**