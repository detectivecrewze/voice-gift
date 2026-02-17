# Product Requirements Document (PRD)
## "For you, Always." — Personalized Digital Gift Platform

---

| Field | Detail |
|---|---|
| **Nama Produk** | For you, Always. |
| **Tipe Dokumen** | Product Requirements Document (PRD) |
| **Versi** | v1.0 |
| **Status** | Final Draft |
| **Tanggal** | February 17, 2026 |
| **Dibuat Oleh** | Product Owner |
| **Untuk** | Development Team (Claude Code) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Goals](#3-product-vision--goals)
4. [Target Users & Personas](#4-target-users--personas)
5. [Business Model](#5-business-model)
6. [Product Architecture Overview](#6-product-architecture-overview)
7. [Tech Stack & Infrastructure](#7-tech-stack--infrastructure)
8. [File & Folder Structure](#9-file--folder-structure)
9. [Feature Specifications](#9-feature-specifications)
   - [9.1 Studio Editor](#91-studio-editor)
   - [9.2 Gift Page (Tampilan Penerima)](#92-gift-page-tampilan-penerima)
   - [9.3 Backend API — Cloudflare Worker](#93-backend-api--cloudflare-worker)
10. [User Flows](#10-user-flows)
11. [Data Models](#11-data-models)
12. [API Endpoints](#12-api-endpoints)
13. [UI/UX Requirements](#13-uiux-requirements)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [MVP Scope & Phasing](#15-mvp-scope--phasing)
16. [Assumptions & Open Questions](#16-assumptions--open-questions)
17. [Glossary](#17-glossary)

---

## 1. Executive Summary

**"For you, Always."** adalah sebuah platform web berbayar (one-time payment per gift) yang memungkinkan siapa saja — tanpa keahlian teknis sama sekali — untuk membuat hadiah digital yang personal, emosional, dan berkesan.

Customer membayar sekali untuk mendapatkan akses ke **Studio Editor** pribadi mereka. Di dalam studio, mereka bisa:
- Upload foto-foto kenangan mereka sendiri
- Merekam atau mengupload pesan suara (voice note)
- Memilih tema visual sesuai occasion
- Mengatur konten halaman hadiah mereka secara mandiri

Hasilnya adalah sebuah **Gift Page** — halaman web cantik dengan link unik yang bisa dibagikan kepada orang tersayang kapan saja.

**Perbedaan dari project Valentine sebelumnya:** Project Valentine adalah produk satu kali yang dikonfigurasi secara manual oleh developer. "For you, Always." adalah **platform mandiri** di mana customer mengatur seluruh konten mereka sendiri melalui Studio Editor, tanpa keterlibatan developer sama sekali.

---

## 2. Problem Statement

### Masalah yang Ingin Diselesaikan

Memberi hadiah digital yang benar-benar personal dan berkesan masih membutuhkan keahlian teknis atau anggaran besar:

- Orang awam tidak bisa membuat halaman hadiah digital yang cantik sendiri
- Tidak ada cara mudah untuk menggabungkan **foto pribadi + pesan suara** dalam satu pengalaman yang emosional
- Jasa pembuatan custom seperti project Valentine sebelumnya tidak skalabel karena setiap customer butuh setup manual dari developer
- Platform yang sudah ada (Canva, dll.) tidak dirancang sebagai "gift experience"

### Root Cause

**Non-tech user tidak punya tools yang cukup sederhana** untuk menciptakan hadiah digital yang terasa personal dan berkualitas tinggi tanpa bantuan orang lain.

---

## 3. Product Vision & Goals

### Vision Statement

> *"Semua orang bisa memberikan momen yang tak terlupakan — cukup dengan foto dan suara mereka sendiri."*

### Product Goals

| Goals | Indikator Keberhasilan |
|---|---|
| Non-tech user bisa selesai buat gift dalam < 15 menit | 80% user berhasil tanpa bantuan di user testing |
| Customer bisa upload foto sendiri tanpa error | Photo upload success rate > 95% |
| Voice note bisa direkam langsung di HP | Berjalan di iOS Safari 15+ dan Android Chrome |
| Gift page terasa emosional dan berkesan bagi penerima | Positive qualitative feedback dari penerima |
| Tidak ada keterlibatan developer setelah customer bayar | Zero manual setup per customer |
| Gift page bisa dibagikan via link dalam 1 klik | Tombol share WhatsApp langsung dari studio |

---

## 4. Target Users & Personas

"For you, Always." menargetkan **semua kalangan** — siapapun yang ingin memberi hadiah digital bermakna kepada orang yang mereka cintai.

### Persona 1 — Pasangan / Couples

```
Siapa    : Aldi, 24 tahun, karyawan swasta
Occasion : Valentine's Day, Anniversary, Ulang Tahun Pasangan
Motivasi : Ingin memberi kejutan digital yang lebih berkesan dari chat biasa
Masalah  : Tidak kreatif secara teknis, tidak punya waktu banyak
Ekspektasi: Selesai dalam 10-15 menit, hasilnya terlihat profesional
```

### Persona 2 — Anak kepada Orang Tua

```
Siapa    : Reza, 28 tahun, bekerja di luar kota
Occasion : Hari Ibu, Hari Ayah, Ulang Tahun Orang Tua
Motivasi : Ingin kirim kenangan foto + ucapan suara karena tidak bisa hadir langsung
Masalah  : Orang tua tidak melek teknologi, butuh link yang simpel untuk dibuka
Ekspektasi: Gift page bisa dibuka dengan mudah di HP orang tua
```

### Persona 3 — Teman ke Teman

```
Siapa    : Nadia, 21 tahun, mahasiswi
Occasion : Ulang Tahun teman, Kelulusan / Wisuda
Motivasi : Ingin buat sesuatu yang jauh lebih berkesan dari sekedar story Instagram
Masalah  : Budget terbatas, tapi ingin terlihat thoughtful
Ekspektasi: Harga terjangkau, proses cepat, hasil terlihat bagus
```

### Persona 4 — Keluarga

```
Siapa    : Ibu Dewi, 44 tahun, ibu rumah tangga
Occasion : Pernikahan anak, Wisuda, Lebaran
Motivasi : Membuat kenangan keluarga dalam bentuk digital yang bisa dibuka kapan saja
Masalah  : Sangat tidak melek teknologi, mudah bingung dengan UI yang kompleks
Ekspektasi: Semua instruksi dalam Bahasa Indonesia, tombol harus sangat jelas
```

---

## 5. Business Model

### Model: One-Time Payment per Gift

Customer membayar **satu kali** untuk membuat **satu gift page**. Setelah pembayaran berhasil, mereka mendapatkan akses permanen ke Studio Editor khusus gift tersebut.

### Customer Journey (High-Level)

```
[1] Customer menemukan "For you, Always." (dari sosmed, referral, dll.)
      ↓
[2] Memilih paket / occasion yang diinginkan
      ↓
[3] Melakukan pembayaran (one-time)
      ↓
[4] Mendapat link unik ke Studio Editor mereka
    Contoh: foryoualways.id/studio/[studioToken]
      ↓
[5] Masuk Studio, mengisi konten (foto, voice note, dll.)
      ↓
[6] Klik Publish → Mendapat Gift Page URL
    Contoh: foryoualways.id/gift/[giftId]
      ↓
[7] Bagikan Gift URL ke penerima via WhatsApp / link
```

### Access Model (Post-Payment)

Setelah bayar, customer mendapat **Studio Token** — sebuah token unik yang menjadi "kunci" masuk ke studio mereka. Tidak diperlukan login/akun.

```
Studio URL  : foryoualways.id/studio/[studioToken]  ← Hanya customer yang tahu
Gift URL    : foryoualways.id/gift/[giftId]          ← Dibagikan ke penerima
```

> **⚠️ Asumsi MVP:** Sistem pembayaran (payment gateway) **TIDAK termasuk dalam scope MVP**. Untuk MVP, Product Owner akan mengirim studioToken secara manual kepada customer setelah pembayaran dikonfirmasi (via WhatsApp / DM). Integrasi payment gateway masuk ke Fase 2.

### Pricing (Contoh, ditentukan oleh Product Owner)

| Paket | Isi | Harga |
|---|---|---|
| Basic Gift | 1 gift page, max 5 foto, max 2 menit voice note | Rp 25.000 |
| Premium Gift | 1 gift page, max 15 foto, max 5 menit voice note | Rp 45.000 |

> Pricing di atas adalah **contoh placeholder**. Product Owner menentukan harga final.

---

## 6. Product Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                    │
│                                                                      │
│  ┌────────────────────────────┐   ┌──────────────────────────────┐  │
│  │      STUDIO EDITOR         │   │        GIFT PAGE             │  │
│  │  /studio/[studioToken]     │   │     /gift/[giftId]           │  │
│  │                            │   │                              │  │
│  │  Diakses oleh: CREATOR     │   │  Diakses oleh: RECIPIENT     │  │
│  │  (setelah bayar)           │   │  (siapapun yang punya link)  │  │
│  │                            │   │                              │  │
│  │  ① Upload Foto             │   │  ① Password Gate (opsional)  │  │
│  │  ② Rekam / Upload Audio    │   │  ② Hero: nama + pesan        │  │
│  │  ③ Edit Teks               │   │  ③ Voice Note Player         │  │
│  │  ④ Pilih Tema & Occasion   │   │  ④ Photo Gallery + Lightbox  │  │
│  │  ⑤ Password (opsional)     │   │                              │  │
│  │  ⑥ Live Preview            │   │                              │  │
│  │  ⑦ Publish → Dapat Link    │   │                              │  │
│  └────────────┬───────────────┘   └──────────────┬───────────────┘  │
└───────────────┼───────────────────────────────────┼──────────────────┘
                │ Fetch API / HTTP                   │
                ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                BACKEND — Cloudflare Worker                           │
│                                                                      │
│  POST  /upload               → Upload file ke R2, return URL        │
│  GET   /studio/[token]       → Validasi token, ambil config studio  │
│  PUT   /studio/[token]       → Update / autosave config studio      │
│  POST  /studio/[token]/publish → Finalize gift, return giftId       │
│  GET   /gift/[giftId]        → Ambil config gift (untuk recipient)  │
│  POST  /gift/[giftId]/unlock → Verifikasi password gift             │
│  POST  /admin/create-studio  → (Admin only) Buat studio token baru  │
│                                                                      │
└────────────┬────────────────────────────┬────────────────────────────┘
             │                            │
             ▼                            ▼
┌─────────────────────┐      ┌────────────────────────────────┐
│   Cloudflare R2     │      │       Cloudflare KV            │
│   (File Storage)    │      │       (Database)               │
│                     │      │                                │
│   Foto (.jpg/.png)  │      │  studio:[token] → StudioConfig │
│   Audio (.webm/.mp4)│      │  gift:[giftId]  → GiftConfig   │
│                     │      │                                │
└─────────────────────┘      └────────────────────────────────┘
```

---

## 7. Tech Stack & Infrastructure

### Frontend

| Layer | Teknologi | Alasan |
|---|---|---|
| Markup | HTML5 | Zero build tooling, langsung deploy |
| Styling | CSS3 + Tailwind CDN (Play CDN) | Cepat, tidak butuh npm |
| Interaktivitas | **Vanilla JavaScript ES6+** | Ringan, tidak ada overhead framework |
| Audio Recording | MediaRecorder API (native browser) | Built-in browser, gratis, tidak butuh library |
| File Upload | Fetch API + FormData | Native browser API |
| HEIC Conversion | `heic2any` via CDN | Konversi format foto iPhone secara otomatis |
| Drag & Drop Reorder | `Sortable.js` via CDN | Library ringan untuk mengatur urutan foto |
| Unique ID | `nanoid` via CDN | Generate ID unik yang URL-safe |

> **⚠️ INSTRUKSI PENTING UNTUK CLAUDE CODE:**
> - JANGAN gunakan React, Vue, Angular, Next.js, atau framework JavaScript apapun
> - JANGAN gunakan npm / package bundler (webpack, vite, dll.)
> - SEMUA dependency harus di-load via tag `<script src="...">` dari CDN
> - Seluruh codebase harus bisa dijalankan dengan membuka file HTML langsung

### Backend

| Layer | Teknologi | Alasan |
|---|---|---|
| Runtime API | Cloudflare Workers | Serverless, gratis tier generous, sudah familiar |
| File Storage | Cloudflare R2 | S3-compatible, gratis 10GB/bulan |
| Database | Cloudflare KV | Key-value store, cukup untuk config-based data |
| Konfigurasi | `wrangler.toml` | Standard Cloudflare deployment config |

### CDN Dependencies

```html
<!-- Tailwind CSS Play CDN — Styling -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Sortable.js — Drag-and-drop reorder foto -->
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>

<!-- heic2any — Konversi foto iPhone HEIC → JPEG di browser -->
<script src="https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js"></script>
```

### Deployment

| Komponen | Platform |
|---|---|
| Frontend (Studio + Gift Page) | Cloudflare Pages |
| Backend API | Cloudflare Workers |
| File Storage | Cloudflare R2 |
| Database Config | Cloudflare KV |

---

## 8. File & Folder Structure

```
for-you-always/
│
├── 📄 README.md
├── 📄 .gitignore
│
├── 📁 studio/                          ← STUDIO EDITOR (halaman creator)
│   ├── index.html                      ← Entry point studio
│   │                                      URL: /studio/[studioToken]
│   ├── style.css                       ← Styling studio (clean, fungsional)
│   └── js/
│       ├── studio.js                   ← Controller utama, init semua module
│       ├── auth.js                     ← Validasi studioToken dari URL
│       ├── uploader.js                 ← Upload foto: drag-drop, multi-upload, reorder
│       ├── voice-recorder.js           ← Rekam & upload voice note
│       ├── autosave.js                 ← Autosave config ke API setiap perubahan
│       ├── preview.js                  ← Render live preview gift page
│       └── publisher.js               ← Kumpulkan state, publish gift, tampilkan link
│
├── 📁 gift/                            ← GIFT PAGE (tampilan penerima)
│   ├── index.html                      ← Template gift page
│   │                                      URL: /gift/[giftId]
│   ├── style.css                       ← Styling gift page (emosional, per tema)
│   └── js/
│       ├── gift.js                     ← Load config, routing, init halaman
│       ├── gallery.js                  ← Render galeri foto + lightbox
│       └── player.js                   ← Custom voice note audio player
│
├── 📁 worker/                          ← BACKEND API
│   ├── worker.js                       ← Cloudflare Worker — semua route handler
│   └── wrangler.toml                   ← Cloudflare config (R2 + KV binding)
│
└── 📁 assets/                          ← Static assets bersama
    ├── logo.svg                        ← Logo "For you, Always."
    └── icons/
```

---

## 9. Feature Specifications

### 9.1 Studio Editor

Studio Editor adalah halaman inti produk ini. Ini adalah tempat customer (creator) mengisi seluruh konten gift mereka secara mandiri.

---

#### 9.1.1 Autentikasi via Studio Token

Setiap studio dilindungi oleh `studioToken` unik yang ada di URL.

**Behavior saat studio dibuka:**
```
1. Studio dimuat → ambil [studioToken] dari URL path
2. Kirim GET /studio/[studioToken] ke API
3. Jika token VALID   → muat config yang tersimpan, render studio
4. Jika token INVALID → tampilkan halaman error:
   "Link studio tidak valid atau sudah kadaluarsa.
    Hubungi For you, Always. untuk bantuan."
5. Jika gift sudah PUBLISHED → tampilkan halaman informasi:
   "Gift ini sudah dipublish dan tidak bisa diedit lagi.
    Link gift kamu: [giftUrl]"
```

---

#### 9.1.2 Autosave

Setiap perubahan yang dibuat customer di studio **tersimpan otomatis** ke API tanpa perlu tombol "Simpan".

```
User mengedit field apapun
  → Debounce 1.5 detik (tunggu user selesai mengetik)
  → PUT /studio/[studioToken] dengan seluruh state terbaru
  → Tampilkan indikator: "✓ Tersimpan" di sudut studio
  → Jika gagal: "⚠ Gagal menyimpan, coba lagi"
```

---

#### 9.1.3 Layout Studio

**Desktop (≥ 768px) — Split View:**
```
┌──────────────────────────────────────────────────────────────┐
│  ❤ For you, Always.                      ✓ Tersimpan        │
├──────────────────────────┬───────────────────────────────────┤
│                          │                                   │
│   PANEL EDITOR           │   LIVE PREVIEW                   │
│   (lebar 45%)            │   (lebar 55%, sticky)            │
│   (bisa di-scroll)       │                                   │
│                          │   ┌───────────────────────────┐  │
│   § Occasion & Tema      │   │                           │  │
│   § Nama & Pesan         │   │   Preview Gift Page       │  │
│   § Upload Foto ★        │   │   (render langsung di DOM,│  │
│   § Voice Note ★         │   │    bukan iframe)          │  │
│   § Password             │   │                           │  │
│   § ─────────────────    │   └───────────────────────────┘  │
│   § [ 🚀 Publish Gift ]  │                                   │
│                          │                                   │
└──────────────────────────┴───────────────────────────────────┘
```

**Mobile (< 768px) — Tab View:**
```
┌──────────────────────────┐
│  ❤ For you, Always.      │
├────────────┬─────────────┤
│  ✏ Edit   │  👁 Preview  │  ← Tab switcher
├────────────┴─────────────┤
│                          │
│  Konten tab yang aktif   │
│                          │
│  [ 🚀 Publish Gift ]     │
└──────────────────────────┘
```

---

#### 9.1.4 Section: Occasion & Tema

**Occasion Selector** — Pilihan tunggal (single select):

| Kode | Label | Emoji | Default Tema |
|---|---|---|---|
| `romantic` | Romantic | 💕 | Rose |
| `birthday` | Birthday | 🎂 | Gold |
| `family` | Family | 🏡 | Sage |
| `graduation` | Graduation | 🎓 | Midnight |
| `friendship` | Friendship | 🤝 | Lavender |

Memilih occasion akan:
1. Secara otomatis mengganti default tema visual
2. Mengubah placeholder teks di field nama & pesan

**Tema Visual Selector** — Pilihan tunggal (single select):

| Kode | Nama | Background | Aksen |
|---|---|---|---|
| `rose` | Rose | `#fff1f5` | `#e11d48` |
| `gold` | Gold | `#fffbeb` | `#d97706` |
| `sage` | Sage | `#f0fdf4` | `#16a34a` |
| `midnight` | Midnight | `#1e1b4b` | `#a78bfa` |
| `lavender` | Lavender | `#f5f3ff` | `#7c3aed` |

---

#### 9.1.5 Section: Nama Penerima & Pesan

| Field | Tipe | Required | Maks | Placeholder |
|---|---|---|---|---|
| Nama Penerima | Text input | **Ya** | 50 karakter | "Untuk Mama ❤️" |
| Pesan | Textarea | Tidak | 300 karakter | "Terima kasih selalu ada untukku..." |

**Behavior:**
- Mengetik langsung memperbarui live preview secara real-time
- Counter karakter muncul di bawah: `45 / 300`
- Jika melebihi batas: counter merah, karakter tidak bisa ditambah lagi

---

#### 9.1.6 Section: Upload Foto ⭐ FITUR UTAMA

> Ini adalah fitur paling kritis. UX harus dirancang agar ibu-ibu berusia 40+ pun bisa menggunakannya tanpa kebingungan.

**Tampilan kosong (belum ada foto):**
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              📸                                     │
│     Tambah foto kenangan kamu                       │
│                                                     │
│   Seret foto ke sini, atau klik tombol di bawah     │
│                                                     │
│         [ + Pilih Foto dari HP / Komputer ]         │
│                                                     │
│   Format: JPG, PNG, HEIC (foto iPhone)              │
│   Ukuran: Maks 5MB per foto • Maks 10 foto          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Tampilan setelah ada foto:**
```
┌─────────────────────────────────────────────────────┐
│  📸 Foto kamu (3 / 10)       [ + Tambah Foto ]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌────────┐  ┌────────┐  ┌────────┐                │
│  │  foto  │  │  foto  │  │  foto  │                │
│  │   ⠿   │  │   ⠿   │  │   ⠿   │  ← drag handle │
│  │   ✕   │  │   ✕   │  │   ✕   │  ← hapus        │
│  └────────┘  └────────┘  └────────┘                │
│                                                     │
│  💡 Tekan dan tahan foto untuk mengubah urutannya  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**States setiap thumbnail foto:**

| State | Visual |
|---|---|
| `uploading` | Shimmer loading animation + spinner |
| `success` | Foto tampil + ikon ✕ di pojok + drag handle |
| `error` | Background merah muda + ikon ⚠ + teks "Gagal. Coba lagi." + tombol retry |

**Alur upload foto (pseudocode lengkap):**
```
User memilih atau men-drag file(s):

UNTUK SETIAP file yang dipilih:
  ├── Cek total foto tidak melebihi 10
  │     Jika sudah 10 → skip file ini + tampilkan toast "Maks 10 foto"
  │
  ├── Cek tipe file (harus image/*)
  │     Jika bukan gambar → skip + toast "File harus berupa foto"
  │
  ├── Jika tipe file adalah image/heic ATAU nama file berakhiran .heic:
  │     → Konversi ke JPEG menggunakan library heic2any
  │     → Gunakan hasil konversi sebagai file yang akan diupload
  │
  ├── Cek ukuran file (maks 5MB = 5 * 1024 * 1024 bytes)
  │     Jika > 5MB → skip + toast "Foto terlalu besar, maks 5MB"
  │
  ├── Tambahkan thumbnail ke grid dengan state: uploading
  │     (Gunakan FileReader untuk tampilkan preview lokal sebelum upload selesai)
  │
  ├── Upload file ke POST /upload
  │     → Sukses:
  │         Simpan URL dari response ke array photos di state
  │         Update thumbnail ke state: success
  │         Trigger autosave
  │     → Gagal:
  │         Update thumbnail ke state: error
  │         Tampilkan tombol "Coba Lagi" pada thumbnail tersebut

SELESAI SEMUA FILE:
  → Sync perubahan ke live preview
```

**Drag-to-reorder:**
- Implementasi dengan `Sortable.js` pada container grid thumbnail
- Setiap perubahan urutan → update properti `order` di array `photos` di state → trigger autosave → sync preview

---

#### 9.1.7 Section: Voice Note ⭐ FITUR UTAMA

**Tampilan lengkap dengan semua state:**

```
┌──────────────────────────────────────────────────────┐
│  🎙️ Pesan Suara                                       │
│  ───────────────────────────────────────────────     │
│                                                      │
│  ── STATE: IDLE ──────────────────────────────────   │
│  │                                                │  │
│  │        [ 🔴  Mulai Rekam ]                     │  │
│  │                                                │  │
│  │   — atau —                                     │  │
│  │                                                │  │
│  │        [ 📁  Upload File Audio ]               │  │
│  │        (MP3, M4A • Maks 10MB)                  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ── STATE: REQUESTING MIC ────────────────────────   │
│  │  ⏳ Meminta izin mikrofon...                   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ── STATE: MIC DENIED ────────────────────────────   │
│  │  ⚠️ Akses mikrofon ditolak.                    │  │
│  │  Cara mengaktifkan:                            │  │
│  │  • Chrome: Klik ikon 🔒 di address bar        │  │
│  │  • Safari: Pengaturan → Safari → Mikrofon     │  │
│  │  [ Coba Lagi ]                                 │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ── STATE: RECORDING ─────────────────────────────   │
│  │  ● MEREKAM   0:23 / 3:00                       │  │
│  │  ▁▂▄▃▅▄▂▁▃▄▅▃▂▁▃▄  ← waveform bars            │  │
│  │                                                │  │
│  │        [ ⏹  Stop Rekam ]                       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ── STATE: PREVIEW ───────────────────────────────   │
│  │  Dengarkan dulu sebelum disimpan:              │  │
│  │  [▶]  ████████░░░░░░░  0:23 / 1:45            │  │
│  │                                                │  │
│  │  [ 🔄 Rekam Ulang ]   [ ✓ Gunakan Ini ]        │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ── STATE: SAVED ─────────────────────────────────   │
│  │  ✅ Pesan suara tersimpan!                     │  │
│  │  [▶]  ████████░░░░░░░  0:23 / 1:45            │  │
│  │                                                │  │
│  │  [ 🗑 Ganti Pesan Suara ]                      │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**State Machine (formal):**

```
IDLE
  ├── [Klik "Mulai Rekam"]
  │     → Panggil navigator.mediaDevices.getUserMedia({ audio: true })
  │     → Sedang meminta → state: REQUESTING_MIC
  │         → Diizinkan → state: RECORDING
  │         → Ditolak   → state: MIC_DENIED
  │
  └── [Klik "Upload File Audio"]
        → Buka file picker, filter: audio/*
        → User pilih file → validasi ukuran (max 10MB)
        → Upload ke POST /upload
        → Sukses → state: SAVED

REQUESTING_MIC
  → (Tidak ada aksi user, menunggu respons browser)

MIC_DENIED
  └── [Klik "Coba Lagi"] → state: IDLE

RECORDING
  ├── Timer berjalan naik: 0:00 → 3:00
  ├── Waveform bars beranimasi (Web Audio API AnalyserNode)
  ├── Auto-stop saat timer = 3:00 → state: PREVIEW
  └── [Klik "Stop Rekam"] → state: PREVIEW

PREVIEW
  ├── Audio player untuk dengarkan hasil rekaman
  ├── [Klik "Rekam Ulang"] → buang rekaman → state: IDLE
  └── [Klik "Gunakan Ini"]
        → Upload audio blob ke POST /upload
        → Loading: tampilkan spinner di tombol
        → Sukses → state: SAVED → trigger autosave
        → Gagal  → tampilkan error toast, tetap di PREVIEW

SAVED
  └── [Klik "Ganti Pesan Suara"] → buang rekaman → state: IDLE
```

**Code snippet kritis — deteksi format audio per browser:**
```javascript
// file: studio/js/voice-recorder.js

const getSupportedMimeType = () => {
  const candidates = [
    'audio/webm;codecs=opus',  // Chrome, Edge, Firefox (desktop)
    'audio/mp4',               // Safari iOS — WAJIB untuk iPhone
    'audio/ogg;codecs=opus',   // Firefox fallback
    'audio/webm',              // Chrome fallback
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) ?? '';
};

const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = getSupportedMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
  const chunks = [];

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
    stream.getTracks().forEach(t => t.stop()); // Matikan mikrofon
    // Simpan blob ke state untuk preview & upload
  };

  recorder.start(200); // Kumpulkan data setiap 200ms
  return recorder;
};
```

---

#### 9.1.8 Section: Password Protection

- Toggle switch: "Lindungi gift dengan password"
- Jika aktif: field input password muncul (tipe `text`, bukan `password` — sengaja agar user awam bisa lihat apa yang mereka ketik)
- Label di bawah: `💡 Beritahu penerima password-nya ya!`

---

#### 9.1.9 Tombol Publish

**Validasi sebelum publish:**

| Kondisi | Aksi |
|---|---|
| `recipientName` kosong | Scroll ke field nama, highlight dengan border merah, tampilkan pesan error |
| Tidak ada foto DAN tidak ada voice note | Tampilkan toast: "Tambahkan minimal 1 foto atau 1 pesan suara dulu ya!" |
| Semua valid | Lanjut proses publish |

**Proses publish:**
```
[1] Tampilkan loading overlay: "Sedang menyiapkan gift kamu... ✨"
[2] POST /studio/[studioToken]/publish
[3] Sukses → Tandai gift sebagai published di KV
           → Tampilkan Modal Sukses
[4] Gagal  → Tampilkan toast error + tombol "Coba Lagi"
```

**Modal Sukses:**
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   🎉  Gift Kamu Siap Dikirim!                        │
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │  foryoualways.id/gift/ab3x9kpq              │  │
│   └──────────────────────────────────────────────┘  │
│                                                      │
│   [ 📋  Copy Link ]                                  │
│   [ 💬  Kirim via WhatsApp ]                         │
│   [ 👁   Lihat Gift Kamu ]                           │
│                                                      │
│   ─────────────────────────────────────────────     │
│   ⚠️  Simpan link ini ya!                            │
│   Gift tidak bisa diedit setelah dipublish.          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**WhatsApp Share Link:**
```
https://wa.me/?text=Hei%2C+ada+sesuatu+untukmu+%F0%9F%92%9D%0A%0Aforyoualways.id%2Fgift%2Fab3x9kpq
```

---

### 9.2 Gift Page (Tampilan Penerima)

Gift Page adalah halaman yang diterima oleh penerima hadiah. Harus terasa **emosional, cantik, dan tidak ada hambatan teknis** untuk dibuka.

---

#### 9.2.1 Init & Routing

```javascript
// gift/js/gift.js

const giftId = window.location.pathname.split('/')[2];

if (!giftId) { renderNotFound(); return; }

const response = await fetch(`/api/gift/${giftId}`);
const data = await response.json();

if (!data.success) { renderNotFound(); return; }

if (data.gift.hasPassword) {
  renderPasswordGate(giftId);
} else {
  renderGiftPage(data.gift);
}
```

---

#### 9.2.2 Password Gate

```
┌────────────────────────────────────┐
│                                    │
│   🔒                               │
│                                    │
│   Ada hadiah yang menunggumu       │
│                                    │
│   ┌────────────────────────────┐  │
│   │  Masukkan password...      │  │
│   └────────────────────────────┘  │
│                                    │
│   [ ❤️  Buka Hadiah ]              │
│                                    │
│   Tidak tahu passwordnya?          │
│   Tanya pengirimnya 😊             │
│                                    │
└────────────────────────────────────┘
```

Behavior:
- Enter key di field password → trigger submit
- Password salah → shake animation + teks error merah: "Password salah, coba lagi."
- Password benar → fade transition ke konten gift

---

#### 9.2.3 Struktur HTML Gift Page

```html
<body data-theme="rose">  <!-- Nilai dari giftConfig.theme -->

  <!-- HERO -->
  <section class="hero fade-in-up" style="--delay: 0.1s">
    <h1 class="recipient-name">{{ recipientName }}</h1>
    <p class="message">{{ message }}</p>
  </section>

  <!-- VOICE NOTE (hanya tampil jika voiceNote.url ada) -->
  <section class="voice-section fade-in-up" style="--delay: 0.3s">
    <div class="player-card">
      <p class="player-label">🎙️ Ada pesan suara untukmu</p>
      <div class="player-ui">
        <button class="play-pause-btn" aria-label="Play / Pause">▶</button>
        <div class="progress-container">
          <div class="progress-bar"></div>
        </div>
        <span class="time-display">0:00 / 0:00</span>
      </div>
    </div>
  </section>

  <!-- PHOTO GALLERY (hanya tampil jika photos.length > 0) -->
  <section class="gallery-section fade-in-up" style="--delay: 0.5s">
    <div class="photo-grid">
      <!-- Di-render oleh gallery.js -->
    </div>
  </section>

  <!-- LIGHTBOX -->
  <div class="lightbox hidden" role="dialog" aria-modal="true">
    <button class="lightbox-close" aria-label="Tutup">✕</button>
    <button class="lightbox-prev" aria-label="Sebelumnya">‹</button>
    <img class="lightbox-img" src="" alt="">
    <button class="lightbox-next" aria-label="Berikutnya">›</button>
    <span class="lightbox-counter">1 / 6</span>
  </div>

</body>
```

---

#### 9.2.4 Voice Note Player (Custom)

**Tidak menggunakan elemen `<audio controls>` default browser** karena tampilannya tidak konsisten antar browser dan tidak sesuai estetika produk. Buat custom player sepenuhnya dengan JavaScript.

```javascript
// gift/js/player.js

class VoiceNotePlayer {
  constructor(audioUrl, containerEl) {
    this.audio = new Audio(audioUrl);
    this.container = containerEl;
    this.bindEvents();
  }

  bindEvents() {
    this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('ended', () => this.onEnded());
    this.container.querySelector('.play-pause-btn')
      .addEventListener('click', () => this.togglePlayPause());
    this.container.querySelector('.progress-container')
      .addEventListener('click', (e) => this.seek(e));
  }

  togglePlayPause() { /* ... */ }
  updateProgress() { /* update progress bar width & time display */ }
  seek(e) { /* calculate click position → set audio.currentTime */ }
  formatTime(seconds) { /* return "m:ss" string */ }
}
```

**States player:**

| State | Tampilan Tombol | Progress |
|---|---|---|
| Loading | Spinner | Kosong |
| Ready (belum play) | ▶ Play | 0:00 |
| Playing | ⏸ Pause | Bergerak |
| Paused | ▶ Play | Diam |
| Ended | 🔁 Ulang | 100% |

---

#### 9.2.5 Photo Gallery & Lightbox

**Grid:**
- Mobile (< 640px): 1 kolom, foto full-width
- Tablet (640px+): 2 kolom
- Desktop (1024px+): 3 kolom
- Semua `<img>` gunakan `loading="lazy"` dan `decoding="async"`

**Lightbox:**
- Muncul saat foto di-tap/klik
- Background hitam semi-transparan
- Tombol close (✕) di kanan atas
- Tombol panah kiri/kanan untuk navigasi
- Swipe gesture (touch events) untuk navigasi
- Klik luar area foto → tutup lightbox
- Indikator posisi di bawah: "2 / 6"

---

#### 9.2.6 Entrance Animations

```css
/* Semua section gift page masuk dengan animasi fade + slide up */
.fade-in-up {
  opacity: 0;
  transform: translateY(32px);
  animation: fadeSlideIn 0.7s ease forwards;
  animation-delay: var(--delay, 0s);
}

@keyframes fadeSlideIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

### 9.3 Backend API — Cloudflare Worker

File: `worker/worker.js`

---

#### Setup `wrangler.toml`

```toml
name = "for-you-always-api"
main = "worker/worker.js"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "for-you-always-files"

[[kv_namespaces]]
binding = "GIFT_DATA"
id = "GANTI_DENGAN_KV_NAMESPACE_ID_ASLI"
```

---

#### Struktur Utama Worker

```javascript
// worker/worker.js

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace('/api', ''); // Normalisasi path

    try {
      // Route: Upload file
      if (path === '/upload' && request.method === 'POST')
        return handleUpload(request, env);

      // Route: Ambil studio config
      if (path.match(/^\/studio\/[^/]+$/) && request.method === 'GET')
        return handleGetStudio(path, env);

      // Route: Update (autosave) studio config
      if (path.match(/^\/studio\/[^/]+$/) && request.method === 'PUT')
        return handleUpdateStudio(request, path, env);

      // Route: Publish gift
      if (path.match(/^\/studio\/[^/]+\/publish$/) && request.method === 'POST')
        return handlePublishGift(request, path, env);

      // Route: Ambil gift config (untuk recipient)
      if (path.match(/^\/gift\/[^/]+$/) && request.method === 'GET')
        return handleGetGift(path, env);

      // Route: Unlock gift dengan password
      if (path.match(/^\/gift\/[^/]+\/unlock$/) && request.method === 'POST')
        return handleUnlockGift(request, path, env);

      // Route: Admin — buat studio baru (dilindungi admin secret)
      if (path === '/admin/create-studio' && request.method === 'POST')
        return handleAdminCreateStudio(request, env);

      return json({ success: false, error: 'Route tidak ditemukan.' }, 404);

    } catch (err) {
      console.error('Worker error:', err);
      return json({ success: false, error: 'Internal server error.' }, 500);
    }
  }
};

// Helper: Return JSON response dengan CORS headers
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
```

---

#### Admin Endpoint: Buat Studio Baru

Digunakan oleh Product Owner setelah customer melakukan pembayaran, untuk men-generate studioToken baru.

```
POST /admin/create-studio
Header: Authorization: Bearer [ADMIN_SECRET]
Body: { "packageType": "premium" }

Response: { "success": true, "studioToken": "xk9pq2mn", "studioUrl": "https://foryoualways.id/studio/xk9pq2mn" }
```

**Logic di Worker:**
```javascript
const handleAdminCreateStudio = async (request, env) => {
  // Cek Authorization header
  const adminSecret = env.ADMIN_SECRET; // Disimpan sebagai Worker Secret
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${adminSecret}`) {
    return json({ success: false, error: 'Unauthorized.' }, 401);
  }

  const { packageType } = await request.json();
  const studioToken = generateNanoid(10); // 10 karakter
  const giftId = generateNanoid(8);       // 8 karakter, sudah disiapkan

  const studioConfig = {
    studioToken,
    giftId,
    packageType,            // "basic" | "premium"
    createdAt: new Date().toISOString(),
    status: 'draft',        // "draft" | "published"
    recipientName: '',
    message: '',
    photos: [],
    voiceNote: { url: null, duration: null, mimeType: null },
    occasion: 'romantic',
    theme: 'rose',
    password: null,
  };

  await env.GIFT_DATA.put(`studio:${studioToken}`, JSON.stringify(studioConfig));

  return json({
    success: true,
    studioToken,
    studioUrl: `https://foryoualways.id/studio/${studioToken}`,
  }, 201);
};
```

---

## 10. User Flows

### Flow A: Product Owner Menerima Pesanan (Manual MVP)

```
[1] Customer menghubungi via DM / WhatsApp
[2] Product Owner konfirmasi pembayaran
[3] Product Owner kirim request ke:
    POST /admin/create-studio
    Authorization: Bearer [ADMIN_SECRET]
[4] Mendapat studioToken + studioUrl
[5] Product Owner kirim studioUrl ke customer
    "Link studio kamu: foryoualways.id/studio/xk9pq2mn
     Jaga baik-baik ya, jangan kasih ke orang lain! 💕"
```

---

### Flow B: Customer Membuat Gift

```
[1] Customer buka link studio dari Product Owner
    → foryoualways.id/studio/xk9pq2mn
[2] Studio dimuat, progress tersimpan sebelumnya muncul (jika ada)
[3] Customer mengisi:
    a. Pilih occasion (Romantic / Birthday / dll.)
    b. Pilih tema visual
    c. Isi nama penerima
    d. Tulis pesan (opsional)
    e. Upload foto:
       - Klik tombol "Pilih Foto" atau drag-drop
       - Pilih 1-10 foto dari HP / komputer
       - Tunggu upload selesai (tiap foto ada progress)
       - Atur urutan dengan drag jika mau
    f. Rekam atau upload voice note (opsional)
    g. Set password (opsional)
[4] Setiap perubahan tersimpan otomatis (autosave)
[5] Customer klik [🚀 Publish Gift]
[6] Muncul modal sukses + gift URL
[7] Customer copy link / share via WhatsApp ke penerima
```

---

### Flow C: Penerima Membuka Gift

```
[1] Penerima menerima link via WhatsApp
    → foryoualways.id/gift/ab3x9kpq
[2] Buka link di browser HP
[3] Jika ada password → input password → klik "Buka Hadiah"
[4] Halaman gift muncul dengan animasi
[5] Membaca nama & pesan
[6] Klik ▶ untuk mendengarkan voice note
[7] Scroll ke bawah untuk melihat foto-foto
[8] Tap foto untuk melihat full-screen (lightbox)
```

---

## 11. Data Models

### StudioConfig (disimpan di KV dengan key `studio:[studioToken]`)

```typescript
interface StudioConfig {
  // === IDENTITAS ===
  studioToken: string;       // "xk9pq2mn" — 10 char, kunci akses studio
  giftId: string;            // "ab3x9kpq" — 8 char, ID gift page publik
  packageType: 'basic' | 'premium';
  createdAt: string;         // ISO 8601

  // === STATUS ===
  status: 'draft' | 'published';
  // Jika "published": studio tidak bisa diedit lagi

  // === KONTEN ===
  recipientName: string;     // Maks 50 karakter
  message: string;           // Maks 300 karakter, boleh kosong

  photos: Array<{
    id: string;              // "photo_[timestamp]_[random]"
    url: string;             // Public R2 URL
    order: number;           // Urutan tampil (0, 1, 2, ...)
  }>;                        // Max 10 item (basic) atau 15 item (premium)

  voiceNote: {
    url: string | null;      // Public R2 URL, atau null
    duration: number | null; // Detik
    mimeType: string | null; // "audio/webm" | "audio/mp4"
  };

  // === PREFERENSI ===
  occasion: 'romantic' | 'birthday' | 'family' | 'graduation' | 'friendship';
  theme: 'rose' | 'gold' | 'sage' | 'midnight' | 'lavender';

  // === KEAMANAN ===
  password: string | null;   // MVP: plaintext. Fase 2: bcrypt hash.
}
```

---

### Contoh Nilai Nyata

```json
{
  "studioToken": "xk9pq2mn3r",
  "giftId": "ab3x9kpq",
  "packageType": "premium",
  "createdAt": "2026-02-17T10:00:00.000Z",
  "status": "published",
  "recipientName": "Untuk Mama ❤️",
  "message": "Terima kasih sudah selalu ada, Ma. Selamat ulang tahun!",
  "photos": [
    { "id": "photo_1739123456_abc", "url": "https://pub-xxx.r2.dev/abc.jpg", "order": 0 },
    { "id": "photo_1739123457_def", "url": "https://pub-xxx.r2.dev/def.jpg", "order": 1 }
  ],
  "voiceNote": {
    "url": "https://pub-xxx.r2.dev/voice_xyz.webm",
    "duration": 83,
    "mimeType": "audio/webm"
  },
  "occasion": "birthday",
  "theme": "sage",
  "password": null
}
```

---

## 12. API Endpoints

**Base URL:** `https://for-you-always-api.workers.dev/api`

---

| Method | Path | Deskripsi | Auth |
|---|---|---|---|
| `POST` | `/upload` | Upload file foto atau audio ke R2 | Studio token di header |
| `GET` | `/studio/[token]` | Ambil config studio | Tidak perlu (token = auth) |
| `PUT` | `/studio/[token]` | Update / autosave config | Tidak perlu (token = auth) |
| `POST` | `/studio/[token]/publish` | Publish gift | Tidak perlu (token = auth) |
| `GET` | `/gift/[giftId]` | Ambil config gift untuk recipient | Publik |
| `POST` | `/gift/[giftId]/unlock` | Verifikasi password | Publik |
| `POST` | `/admin/create-studio` | Buat studio baru | Admin Bearer token |

---

### `POST /upload`

```
Request:
  Content-Type: multipart/form-data
  X-Studio-Token: [studioToken]   ← validasi kepemilikan
  Body:
    file: File (binary)
    type: "photo" | "audio"

Response 200:
  { "success": true, "url": "https://pub-xxx.r2.dev/1739123456-abc.jpg" }

Response 400:
  { "success": false, "error": "File terlalu besar. Maks 5MB untuk foto." }

Response 401:
  { "success": false, "error": "Studio token tidak valid." }
```

**Validasi di Worker:**
- Validasi `studioToken` dari header (`GET studio:token` di KV, status harus `draft`)
- `type === "photo"`: harus `image/*`, maks 5MB
- `type === "audio"`: harus `audio/*`, maks 10MB
- Nama file R2: `[timestamp]-[random6char].[ext]`

---

### `GET /studio/[token]`

```
Response 200:
  { "success": true, "studio": { ...StudioConfig... } }

Response 404:
  { "success": false, "error": "Studio tidak ditemukan." }

Response 403:
  { "success": false, "error": "Gift ini sudah dipublish dan tidak bisa diedit.", "giftUrl": "..." }
```

---

### `PUT /studio/[token]`

```
Request Body (partial update, kirim seluruh field yang berubah):
  {
    "recipientName": "Untuk Mama",
    "message": "Selamat ulang tahun!",
    "photos": [...],
    "voiceNote": {...},
    "occasion": "birthday",
    "theme": "sage",
    "password": null
  }

Response 200:
  { "success": true }

Response 403:
  { "success": false, "error": "Gift ini sudah dipublish." }
```

---

### `POST /studio/[token]/publish`

```
Response 201:
  {
    "success": true,
    "giftId": "ab3x9kpq",
    "giftUrl": "https://foryoualways.id/gift/ab3x9kpq"
  }

Response 400:
  { "success": false, "error": "recipientName wajib diisi sebelum publish." }

Response 409:
  { "success": false, "error": "Gift sudah dipublish sebelumnya.", "giftUrl": "..." }
```

**Logic:** Update `status` menjadi `"published"` di KV. Copy data ke key `gift:[giftId]` agar bisa diakses publik tanpa token.

---

### `GET /gift/[giftId]`

```
Response 200:
  {
    "success": true,
    "gift": {
      "recipientName": "Untuk Mama ❤️",
      "message": "Selamat ulang tahun!",
      "photos": [...],
      "voiceNote": {...},
      "occasion": "birthday",
      "theme": "sage",
      "hasPassword": false     ← JANGAN kirim password asli
    }
  }

Response 404:
  { "success": false, "error": "Gift tidak ditemukan." }
```

---

### `POST /gift/[giftId]/unlock`

```
Request Body:
  { "password": "sayang123" }

Response 200:
  { "success": true, "gift": { ...full gift data... } }

Response 401:
  { "success": false, "error": "Password salah." }
```

---

## 13. UI/UX Requirements

### Prinsip Desain

| Prinsip | Implementasi Konkret |
|---|---|
| **Zero Jargon** | Tidak ada kata teknis. "Upload" → "Pilih Foto". "Token" → tidak ditampilkan ke user. |
| **Mobile-First** | Design dari layar 375px lebar ke atas. Semua tombol min. 44px tinggi. |
| **Forgiving** | Konfirmasi sebelum hapus foto. Error message selalu disertai solusi. |
| **Instant Feedback** | Setiap interaksi user menghasilkan respons visual dalam < 200ms. |
| **Bahasa Indonesia** | Semua teks UI dalam Bahasa Indonesia. Termasuk pesan error dan panduan. |

### Typography

```html
<!-- Load di <head> semua halaman -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
```

| Elemen | Font | Ukuran |
|---|---|---|
| Nama penerima (gift page) | Cormorant Garamond Italic | 2.5rem–4rem |
| Pesan (gift page) | Cormorant Garamond | 1.1rem |
| Label & tombol (studio) | DM Sans 600 | 0.875rem |
| Body teks (studio) | DM Sans 400 | 0.875rem–1rem |

### CSS Variables (Tema)

```css
[data-theme="rose"] {
  --bg: #fff1f5; --surface: #ffffff;
  --primary: #e11d48; --accent: #fb7185;
  --text: #1c1917; --text-muted: #9c6b78; --border: #fecdd3;
}
[data-theme="gold"] {
  --bg: #fffbeb; --surface: #ffffff;
  --primary: #d97706; --accent: #fbbf24;
  --text: #1c1917; --text-muted: #92400e; --border: #fde68a;
}
[data-theme="sage"] {
  --bg: #f0fdf4; --surface: #ffffff;
  --primary: #16a34a; --accent: #4ade80;
  --text: #14532d; --text-muted: #6b7280; --border: #bbf7d0;
}
[data-theme="midnight"] {
  --bg: #1e1b4b; --surface: #2e2b5b;
  --primary: #a78bfa; --accent: #c4b5fd;
  --text: #f5f3ff; --text-muted: #a5b4fc; --border: #4338ca;
}
[data-theme="lavender"] {
  --bg: #f5f3ff; --surface: #ffffff;
  --primary: #7c3aed; --accent: #a78bfa;
  --text: #1e1b4b; --text-muted: #6d5fa6; --border: #ddd6fe;
}
```

---

## 14. Non-Functional Requirements

### Performance

| Metrik | Target |
|---|---|
| Studio Editor initial load | < 3 detik di koneksi 4G |
| Gift page LCP (foto pertama muncul) | < 2 detik |
| Upload foto 3MB | < 5 detik di koneksi 4G |
| API response time | < 500ms (P95) |

**Teknik optimasi wajib:**
- Semua foto di gift page: `loading="lazy"` dan `decoding="async"`
- Kompresi foto di client sebelum upload (Canvas API): resize sisi terpanjang ke maks 2000px
- Autosave menggunakan debounce 1500ms (tidak kirim setiap keystroke)

### Browser Support

| Browser | Versi Min | Studio | Gift Page |
|---|---|---|---|
| Chrome Android | 90+ | ✅ | ✅ |
| **Safari iOS** | **15+** | ✅ | ✅ |
| Chrome Desktop | 90+ | ✅ | ✅ |
| Firefox Desktop | 90+ | ✅ | ✅ |
| Samsung Internet | 14+ | ✅ | ✅ |

> **⚠️ Safari iOS adalah prioritas utama.** Mayoritas pengguna Indonesia menggunakan iPhone. Pastikan semua fitur — terutama MediaRecorder dan file upload — berjalan sempurna di Safari iOS.

### Security

| Ancaman | Mitigasi (MVP) |
|---|---|
| Akses studio orang lain | studioToken 10 karakter (cukup entropi untuk MVP) |
| Upload file berbahaya | Validasi MIME type di server-side Worker, bukan hanya client-side |
| Abuse upload storage | Rate limit: maks 20 upload per IP per jam |
| Akses admin tidak sah | ADMIN_SECRET disimpan sebagai Cloudflare Worker Secret (env var terenkripsi) |
| Gift tanpa autentikasi | Gift URL publik by design — keamanan melalui obscurity (ID pendek tapi random) |

---

## 15. MVP Scope & Phasing

### ✅ Termasuk MVP (Phase 1)

Semua fitur yang disebutkan di Section 9 di atas.

### ❌ Tidak Termasuk MVP

- Sistem pembayaran otomatis (payment gateway)
- Sistem login / akun customer
- Kemampuan edit gift setelah published
- Notifikasi (email / WhatsApp) ke Product Owner saat gift dibuka
- Analytics (berapa kali gift dibuka)
- Admin dashboard berbasis web
- Lebih dari 5 pilihan tema

---

### Checklist Pengerjaan Phase 1

**🔵 Minggu 1-2 — Backend Foundation**
- [ ] `wrangler init for-you-always-api`
- [ ] Konfigurasi `wrangler.toml` dengan binding R2 dan KV
- [ ] Implementasi `handleUpload` (validasi + simpan ke R2)
- [ ] Implementasi `handleAdminCreateStudio` (generate token, simpan ke KV)
- [ ] Implementasi `handleGetStudio` (validasi token, return config)
- [ ] Implementasi `handleUpdateStudio` (autosave, cek status draft)
- [ ] Implementasi `handlePublishGift` (set status published, copy ke gift key)
- [ ] Implementasi `handleGetGift` (return config tanpa password)
- [ ] Implementasi `handleUnlockGift` (verifikasi password)
- [ ] CORS headers di semua response
- [ ] Rate limiting untuk upload
- [ ] Set `ADMIN_SECRET` sebagai Worker Secret via wrangler
- [ ] Deploy ke Cloudflare Workers
- [ ] Test semua endpoint (curl / Postman / hoppscotch.io)

**🟢 Minggu 3-4 — Studio Editor**
- [ ] `studio/index.html` — layout dasar, load semua dependency CDN
- [ ] `studio/js/auth.js` — ambil token dari URL, validasi ke API, handle error states
- [ ] Layout split-view desktop + tab-view mobile
- [ ] Section Occasion Selector (5 pilihan)
- [ ] Section Tema Visual Selector (5 pilihan)
- [ ] Section Nama & Pesan (dengan karakter counter)
- [ ] `studio/js/uploader.js` — Photo Upload Zone:
  - [ ] Drag-and-drop area
  - [ ] Klik untuk pilih file (input type file, accept="image/*,.heic")
  - [ ] Multi-file select
  - [ ] HEIC detection dan konversi dengan heic2any
  - [ ] Validasi tipe dan ukuran file
  - [ ] Upload progress per foto (state machine: uploading → success / error)
  - [ ] Tampil thumbnail setelah upload
  - [ ] Tombol hapus per foto
  - [ ] Drag-to-reorder dengan Sortable.js
- [ ] `studio/js/voice-recorder.js` — Voice Note:
  - [ ] State machine lengkap (IDLE → REQUESTING → RECORDING → PREVIEW → SAVED)
  - [ ] MediaRecorder dengan deteksi format per browser
  - [ ] Timer countdown (0:00 → 3:00)
  - [ ] Waveform bars animasi (Web Audio API AnalyserNode)
  - [ ] Audio player di state PREVIEW
  - [ ] Upload blob setelah konfirmasi
  - [ ] Mode upload file audio alternatif
  - [ ] Panduan aktivasi mikrofon saat ditolak
- [ ] Section Password Toggle
- [ ] `studio/js/autosave.js` — debounce 1.5s, indikator "✓ Tersimpan"
- [ ] `studio/js/preview.js` — live preview sync
- [ ] `studio/js/publisher.js` — validasi, publish, modal sukses + share WhatsApp

**🟡 Minggu 5 — Gift Page**
- [ ] `gift/index.html` — template dasar
- [ ] `gift/js/gift.js` — extract giftId dari URL, fetch config, routing
- [ ] Password gate UI (form, error handling, shake animation)
- [ ] Hero section: nama + pesan + entrance animation
- [ ] `gift/js/player.js` — custom voice note player (play/pause, progress bar, seek, time)
- [ ] `gift/js/gallery.js` — render grid foto + lazy loading
- [ ] Lightbox: open, close, navigasi, swipe touch, counter
- [ ] Implementasi 5 tema via CSS variables + `data-theme` attribute
- [ ] Entrance animations (fade + slide up, staggered)
- [ ] Full mobile responsiveness (test di 375px, 390px, 414px)

**🔴 Minggu 6 — Polish, Testing & Deploy**
- [ ] Test end-to-end di iPhone (Safari iOS 15+)
- [ ] Test end-to-end di Android Chrome
- [ ] Test upload foto HEIC dari iPhone Camera Roll
- [ ] Implementasi kompresi foto di client (Canvas API, resize maks 2000px)
- [ ] Error handling user-friendly di semua kondisi edge case
- [ ] Loading skeleton/shimmer di semua state loading
- [ ] Deploy frontend ke Cloudflare Pages
- [ ] Setup custom domain
- [ ] Soft launch + test dengan pengguna nyata

---

### Phase 2 — Roadmap Pasca-MVP

| Fitur | Prioritas | Keterangan |
|---|---|---|
| Integrasi payment gateway | 🔴 Tinggi | Otomatisasi alur pembelian (Midtrans / Xendit) |
| Sistem akun customer | 🔴 Tinggi | Login → lihat semua gift yang pernah dibuat |
| Edit gift setelah publish | 🟡 Sedang | Butuh auth + versioning |
| Notifikasi saat gift dibuka | 🟡 Sedang | Via Telegram bot atau email |
| Admin dashboard web | 🟡 Sedang | Ganti manual API call untuk buat studio |
| Analytics gift | 🟢 Rendah | Jumlah buka, negara, device |
| Template tambahan | 🟢 Rendah | Lebaran, Natal, Pernikahan |

---

## 16. Assumptions & Open Questions

### Asumsi yang Berlaku untuk MVP

| # | Asumsi | Konsekuensi |
|---|---|---|
| A1 | Pembayaran dikonfirmasi secara manual oleh Product Owner | Butuh waktu manual untuk setup setiap order |
| A2 | Product Owner mengirim studioToken ke customer via WhatsApp/DM | Tidak skalabel untuk volume besar |
| A3 | Gift tidak bisa diedit setelah publish | Customer harus yakin sebelum klik Publish |
| A4 | Gift tidak pernah expire / dihapus | Storage R2 terus bertambah seiring waktu |
| A5 | Password disimpan plaintext di KV | Upgrade ke hash di Phase 2 |
| A6 | Semua file R2 bersifat publik | Siapapun yang tahu URL bisa akses file |
| A7 | Domain: foryoualways.id (placeholder) | Konfirmasi ketersediaan domain |

### Open Questions

| # | Pertanyaan | Dibutuhkan Untuk |
|---|---|---|
| Q1 | Berapa harga per gift? (Basic vs Premium) | Komunikasi ke customer |
| Q2 | Domain final apa yang akan digunakan? | Setup Cloudflare Pages |
| Q3 | Apakah ada limit waktu untuk edit sebelum publish? (misal: 7 hari) | Konfigurasi di Worker |
| Q4 | Bagaimana jika customer kehilangan link studio mereka? | SOP support customer |
| Q5 | Platform pembayaran mana yang akan digunakan di Phase 2? | Midtrans? Xendit? Stripe? |

---

## 17. Glossary

| Term | Definisi |
|---|---|
| **For you, Always.** | Nama brand / produk |
| **Studio Editor** | Halaman web tempat creator mengisi konten gift mereka |
| **Gift Page** | Halaman publik yang dibuka oleh penerima hadiah |
| **Creator** | Customer yang membeli dan membuat gift |
| **Recipient** | Orang yang menerima dan membuka Gift Page |
| **studioToken** | Token unik 10 karakter — "kunci" masuk ke Studio Editor. Hanya creator yang tahu. |
| **giftId** | ID unik 8 karakter untuk Gift Page publik. Dibagikan ke recipient. |
| **Studio URL** | `foryoualways.id/studio/[studioToken]` — URL Studio Editor creator |
| **Gift URL** | `foryoualways.id/gift/[giftId]` — URL Gift Page yang dibagikan ke recipient |
| **Voice Note** | Pesan audio yang direkam creator di browser, diputar oleh recipient |
| **Occasion** | Tema acara: Romantic, Birthday, Family, Graduation, Friendship |
| **Theme** | Tema visual gift page: Rose, Gold, Sage, Midnight, Lavender |
| **Autosave** | Fitur menyimpan perubahan otomatis tanpa tombol "Simpan" |
| **ADMIN_SECRET** | Password rahasia untuk endpoint `/admin/create-studio`, disimpan sebagai Worker Secret |
| **Cloudflare R2** | Object storage untuk file foto dan audio |
| **Cloudflare KV** | Key-value store untuk config studio dan gift |
| **Worker** | Cloudflare Workers — serverless backend API |
| **wrangler.toml** | File konfigurasi untuk deploy Cloudflare Worker |
| **MediaRecorder API** | Web API native browser untuk merekam audio, tanpa library tambahan |
| **HEIC** | Format foto default kamera iPhone — perlu dikonversi ke JPEG sebelum upload |
| **CORS** | Header HTTP yang harus diset di Worker agar frontend bisa memanggil API |
| **Debounce** | Teknik menunda eksekusi fungsi hingga user berhenti mengetik — dipakai di autosave |
| **Lightbox** | Overlay fullscreen untuk melihat foto dalam ukuran besar |

---

*Dokumen ini adalah living document. Update sesuai keputusan product.*

**Version History:**

| Versi | Tanggal | Perubahan |
|---|---|---|
| v1.0 | Feb 17, 2026 | Initial release — Platform baru "For you, Always.", target semua kalangan, model one-time payment per gift, akses via studioToken, fitur wajib: upload foto + voice note + password protection |
