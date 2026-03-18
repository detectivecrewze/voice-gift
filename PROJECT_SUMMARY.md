# Arcade Edition — Project Summary
**Owner:** Aldor (AL)  
**Period:** March 12–14, 2026  
**Stack:** Cloudflare Workers + R2, Next.js (landing page), Vanilla JS, HTML/CSS

---

## 🎯 Tentang Project

**For You, Always.** adalah platform kado digital romantis dengan dua produk:

### 1. Voices. Gift
Layanan kado digital emosional berbasis foto dan suara. Customer dapat mengunggah 12-15 foto kenangan serta merekam atau mengunggah pesan suara pribadi. Audio tersebut dapat dipadukan dengan musik latar (ambient) pilihan untuk menciptakan pengalaman yang menyentuh hati. Penerima kado akan melihat galeri foto yang sinkron dengan pesan suara pengirim.

### 2. Arcade Edition ⭐ (Fokus Utama)
Platform kado interaktif dengan **9 ruangan** berbasis pixel art Ghibli. Customer mengisi konten lewat **Studio Editor** sendiri (self-serve, privat), lalu publish dan kirim link ke pasangan. Penerima buka lewat password.

**Harga:** Rp 20.000  
**Domain:** `for-you-always.my.id` (landing page) + Arcade di Cloudflare Workers  
**Target customer:** 90% perempuan, romantic, non-IT, pakai HP

---

## 🏗️ Arsitektur Teknis

```
for-you-always.my.id (Next.js)
├── / → Voices Gift landing page
└── /arcade → Arcade Edition landing page

arcade-edition.aldoramadhan16.workers.dev (Cloudflare Workers)
├── Studio Regular → customer buat sendiri
├── Studio Premium → buat sendiri + custom domain
└── Arcade Player → penerima buka gift

Storage: Cloudflare R2 (foto, video, audio, assets)
CDN: cdn.for-you-always.my.id
Region: Singapore (ap-southeast-1)
AI: Qwen Plus via dashscope-intl.aliyuncs.com
```

---

## 🎮 9 Ruangan Arcade

| Room | Deskripsi |
|------|-----------|
| **Music** | Putar lagu dengan star visualizer |
| **Journey** | Timeline hubungan dari awal |
| **Moments** | Galeri foto sinematik |
| **Quiz** | Tebak jawaban tentang penerima |
| **Catcher** | Mini-game tangkap bintang |
| **Fortune** | Kartu ramalan romantis |
| **Things I Love** | Flip card hal yang dicintai |
| **Bucket List** | Daftar impian bersama |
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
- **Section reordering** — urutan baru: Recipient Name → Journey → Moments → Music → Quiz → Things I Love → Bucket List → Message → Password
- **Quiz MAX_QUESTIONS** — dinaikkan dari 7 → 10 pertanyaan
- **Admin dashboard** — folder `admin/` baru untuk monitoring customer
- **Premium Studio Refinement** — Centering modal sukses, penambahan langkah konfirmasi "Sudah Selesai?", dan integrasi input Vercel Domain Request.
- **Vercel Domain Validation** — Proteksi input domain agar tidak mengandung spasi, emoji, atau karakter spesial.

### 🕹️ Arcade Player
- **Things I Love room** — redesign total menjadi **flip card** system:
  - Front: gradient cream, "Tap untuk membuka ✦"
  - Back: Dancing Script font, tinggi auto
  - Persistent state via `sessionStorage`
- **Wood Sign dynamic name** — menampilkan "For [Name], Always" dengan nama di-highlight gold italic, auto-shrink font untuk nama panjang
- **Password hint redesign** — kraft/cream gradient, pin emoji, animasi slide-up
- **Bucket List redesign** — journal diary vertical: book spine, ruled lines, red margin line, Caveat font, golden circle checkmarks
- **Main menu reordering** — Row 1: Music·Journey·Moments·Quiz | Row 2: Catcher·Fortune·Things·Bucket·Message
- **Menu items margin** — turun 30px desktop, 20px mobile
- **Persistent iframe** — Things I Love tidak reload saat dibuka ulang

### 📱 Studio Mobile Optimization
- **Responsive Padding** — Padding `.section-card` dikurangi dari 64px ke 20px di mobile.
- **Vertical Header Stacking** — Header section otomatis bertumpuk ke bawah jika layar terlalu sempit.
- **Cache Busting** — Menambahkan `?v=2` pada file statis (`style.css`, `js/*.js`) di Studio Regular & Premium.

### 🌐 Landing Page (for-you-always.my.id)
- **Navbar** — tambah Voices + Arcade links, tombol "Pesan Sekarang" (kemudian dihapus)
- **Hero section** — 2 ProductCard side-by-side (Voices + Arcade)
- **Halaman `/arcade`** — landing page baru untuk Arcade Edition
- **arcade.css** — desain warm parchment `#f7f0e6`, feminine/romantic
- **Copywriting fix** — hapus semua teks "kami yang kerjakan", ganti ke "kamu buat sendiri"
- **Harga** — update XX.XXX → **Rp 20.000**
- **9 Rooms Slideshow** — section baru cinematic slideshow dengan:
  - Slide 0: Main Menu preview (video/image)
  - Slide 1-9: Tiap room dengan video MP4 + image fallback
  - Dot navigation, badge "01/09", fade transition
- **Mobile responsive fix** — Safari iOS overflow fix (`overflow-x: clip`), `clamp()` padding, `isMobile` hook

### 🌟 Stargazing Room (Dibuat lalu di-revert)
- Room baru "Stargazing" — langit malam, bintang = kenangan, tap bintang → popup cerita + foto
- Studio section untuk input bintang
- Diputuskan di-revert karena hasil visual kurang memuaskan

---

## 📁 Struktur File Penting

```
/arcade
├── index.html          ← Main arcade player
├── script.js           ← Logic utama (loading, password, menu, rooms)
├── style.css           ← Semua styling arcade
├── config.js           ← Test/standalone config
└── rooms/
    ├── music/
    ├── journey/
    ├── moments/
    ├── quiz/
    ├── star-catcher/
    ├── fortune-cookie/
    ├── things-i-love/
    ├── bucket-list/
    └── message/

/studio
├── regular/
│   ├── index.html      ← Studio editor regular
│   └── js/
│       ├── studio.js
│       ├── app-manager.js
│       ├── autosave.js
│       ├── publisher.js
│       ├── uploader.js
│       ├── music.js
│       ├── quiz.js
│       ├── bucket-list.js
│       ├── things-i-love.js
│       ├── message.js
│       ├── date-picker.js
│       ├── preview.js
│       └── gemini.js (→ Qwen)
└── premium/
    └── (struktur sama dengan regular)

/landing (Next.js - for-you-always.my.id)
├── app/
│   ├── (landing)/
│   │   ├── layout.tsx   ← Navbar shared
│   │   └── page.tsx     ← Voices landing
│   └── arcade/
│       └── page.tsx     ← Arcade landing
└── styles/
    ├── landing.css
    └── arcade.css
```

---

## 🔑 Info Teknis Penting

| Key | Value |
|-----|-------|
| Worker URL | `arcade-edition.aldoramadhan16.workers.dev` |
| CDN | `cdn.for-you-always.my.id` |
| WhatsApp | `wa.me/6281381543981` |
| AI Endpoint | `dashscope-intl.aliyuncs.com` (Singapore) |
| AI Model | `qwen-plus` |
| R2 Region | `ap-southeast-1` |
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

---

## 💎 Voices Gift — Premium Standalone Mode

Fase ini bertujuan untuk membuat produk "Layanan Jasa Pembuatan Website Kado" yang benar-benar mandiri dan eksklusif.

### Fitur Baru & Perubahan:
1. **Premium Submission Flow**: Studio Premium kini mengirimkan data kado langsung ke Telegram Admin dalam bentuk ringkasan order dan file `config.js` yang siap pakai.
2. **Standalone Configuration**: Semua tema di Voices Gift (Original, Rosewood, Midnight, Mossy, Magenta) kini mendukung file `config.js`. Jika file ini ada di folder tema, website akan otomatis berjalan tanpa memerlukan koneksi ke database pusat.
3. **Vercel Domain Request**: Di akhir proses pembuatan, pelanggan wajib menentukan nama domain yang mereka inginkan (contoh: `kado-untuk-lisa.vercel.app`). Informasi ini otomatis diteruskan ke admin via Telegram & WhatsApp.
4. **AI Message Generator (Qwen)**: Integrasi dengan Qwen AI Alibaba untuk membantu pelanggan menulis pesan romantis secara otomatis sesuai *tone* yang dipilih (Romantis, Lucu, Santai, atau Tulus).
5. **Mobile UI Optimization**: Optimasi tampilan Studio untuk layar HP (padding card lebih kecil, stacking header secara vertikal, dan scaling tombol).
6. **Cache Busting (v=2)**: Implementasi sistem versi pada asset (CSS/JS) untuk memastikan pelanggan mendapatkan update terbaru secara instan.

### Workflow Operasional:
1. Pelanggan mengisi konten di `studio-premium/`.
2. Setelah klik Publish, Admin menerima chat di Telegram berisi `config.js`.
3. Admin memasukkan `config.js` ke folder tema yang dipilih (misal folder `gift-sage/`).
4. Admin men-deploy folder tersebut ke Vercel dengan domain pilihan pelanggan.
5. Selesai. Link kado bersifat permanen dan sangat cepat diakses.

---

## 🚧 Yang Masih Pending / Belum Selesai

1. **Deep bug audit** seluruh `/arcade` folder — prompt sudah dibuat, belum dijalankan.
2. **Video/GIF main menu** — placeholder di slideshow, belum ada URL video asli.
3. **Background Stargazing** — belum ada Ghibli night sky background yang cocok.
4. **Room Stargazing** — direverted, mungkin akan dibangun ulang dengan visual yang lebih baik di masa depan.
