# 🌟 Panduan Lengkap: Workflow Pemesanan Kado Premium (Standalone)

Dokumen ini menjelaskan langkah-demi-langkah (SOP) dari sisi Admin (Anda) ketika ada customer yang membeli paket Kado Premium (Standalone Version).

## 📝 FASE 1: Customer Mengisi Data di Studio
1. **Berikan Link Studio Premium:**
   Berikan link menuju `studio-premium` kepada customer.
   *(Pastikan customer tahu bahwa mereka harus mengisi data hingga selesai dan menekan tombol **Publish VIP Config**).*

2. **Customer Mengisi Data:**
   Customer akan mengunggah foto, voice note, memilih tema (misal: Rose, Beige, atau Camera), dan mengatur password (opsional).

3. **Customer Submit:**
   Setelah customer menekan "Publish", sistem akan:
   - Mengunggah file-file berat (foto, audio) ke R2 Storage Anda dan menghasilkan link CDN.
   - Mengirim sisa data (teks) ke Cloudflare Worker.
   - Worker akan merakit file `config.js` khusus untuk customer tersebut.
   - Worker akan mengirimkan notifikasi ringkasan order beserta file **`config.js`** tersebut langsung ke **Telegram** Anda.

---

## 📲 FASE 2: Admin Menerima Order di Telegram
1. **Buka Telegram:**
   Bot Telegram Anda akan mengirimkan 2 pesan berturut-turut untuk order baru:
   - **Pesan 1:** Ringkasan order (Nama penerima, tema yang dipilih, jumlah foto, ketersediaan voice note & password). Di sini Anda bisa tahu persis **folder tema** apa yang dipilih customer (misal: `camera/silver`).
   - **Pesan 2:** File dokumen bernama `config-[ID].js` lengkap dengan instruksi di *caption*.

2. **Download File:**
   Unduh file `config-[ID].js` tersebut ke laptop atau komputer Anda.

---

## 💻 FASE 3: Proses Deploy ke Web Hosting (Vercel)
Karena ini adalah versi Premium Standalone, setiap customer memiliki website/link sendiri yang 100% independen dan terpisah dari sistem utama Vercel Anda (`?to=`).

1. **Siapkan Folder Project untuk Klien:**
   Buka folder project master `for-you-always` Anda. Cari folder tema yang sesuai dengan pilihan klien.
   - Misal klien memilih tema "Rose", buka folder `gift/`
   - Misal klien memilih tema "Camera Silver", buka folder `camera/silver/`

2. **Copy Master Tema (Best Practice Opsi A - Sangat Disarankan):**
   Agar kode master Anda tidak berubah-ubah, *copy-paste* seluruh isi folder tema pilihan (misalnya folder `silver`) ke tempat/folder lain khusus klien ini, misalnya membuat folder baru: `C:\Klien_Kado\Sandi_dan_Anya\`.

3. **Masukkan `config.js` ke Folder Tersebut:**
   - Dapatkan file `config-[ID].js` yang baru saja Anda download dari Telegram.
   - Copy file tersebut ke dalam folder project klien yang baru Anda buat (atau ke dalam folder master jika Anda pakai Opsi B).
   - **RENAME (Ubah Nama)** file tersebut menjadi tepat `config.js`. 
   - *(Jika sebelumnya sudah ada file `config.js` kosong atau bawaan, hapus/timpa saja dengan yang dari Telegram).*

4. **Deploy ke Vercel:**
   Anda bisa men-deploy folder klien ini menggunakan Vercel CLI (Command Line).
   - Buka Terminal / CMD / VSCode Terminal.
   - Arahkan (`cd`) ke folder klien tersebut.
   - Ketik perintah: `vercel`
   - Ikuti prompt interaktif dari Vercel (buat project baru, isi nama project misal `kado-sandi-anya`).
   - Setelah sukses, ketik `vercel --prod` untuk mendeploy langsung ke production environment.

   > *Alternatif tanpa CLI: Anda bisa drag-and-drop folder klien tersebut ke dashboard Vercel atau Netlify Anda langsung di browser.*

5. **Set Domain Kustom (Opsional):**
   Jika customer membeli paket bundling dengan domain (Misal: `aniversary-kita.com`), Anda bisa masuk ke dashboard Vercel:
   - Pilih project klien tersebut.
   - Buka menu **Settings** -> **Domains**.
   - Tambahkan custom domain sesuai permintaan klien (Anda harus menyetel DNS di provider domainnya).

---

## 🎁 FASE 4: Penyerahan ke Customer
1. **Lakukan Final Testing:**
   Buka link Vercel yang sudah jadi di browser Anda sendiri. 
   - Apakah loading normal?
   - Apakah gembok/password muncul dan bisa dibuka dengan password yang diset customer?
   - Apakah foto dan lagu bermain dengan baik?
2. **Kirim Link ke Customer:**
   Serahkan URL website tersebut kepada customer beserta ucapan terima kasih. Beritahu mereka password-nya (jika ada).
3. **Selesai!** 🎉 Order premium telah dipenuhi.

---

### 💡 Pertanyaan Sering Ditanya (FAQ)

**Q: Apakah data kado premium ini ikut membebani API Worker dan database KV Cloudflare saya?**
A: **TIDAK SAMA SEKALI**. Mode premium ini 100% berjalan secara *Serverless/Standalone/Frontend-Only*. Semua teks, foto, dan lagu sudah di-hardcode konfigurasinya di file `config.js` di file hosting (Vercel) masing-masing. Sistem hadiah tidak perlu melakukan `fetch` ke API `/get-config` lagi saat tamu membuka kadonya. (Worker hanya digunakan di awal sekali saat proses order saja).

**Q: Bagaimana jika customer tiba-tiba ingin mengubah foto atau ada salah eja pesan setelah website-nya online?**
A: Karena ini standalone, customer **tidak bisa** mengedit URL langsung. Mereka harus menghubungi Anda dan merequest revisi manual. 
Cara revisinya:
1. Buka file `config.js` milik klien tersebut di laptop Anda dengan text editor/VSCode.
2. Ubah `caption` atau teks secara manual pada file tersebut.
3. Buka terminal di folder tersebut lalu ketik `vercel --prod`. Web mereka akan update seketika dalam beberapa detik.

**Q: Apakah fitur Premium Standalone ini mengganggu fitur kado utama (`?to=`)?**
A: Tidak. Keduanya bisa hidup harmonis. Jika sebuah template diakses dengan link `?to=xxx`, ia akan memprioritaskan mendownload data dari KV Worker (mode reguler). Jika diakses tanpa `?to=` sama sekali, barulah ia membaca logika mandiri dari `config.js` lokal (mode Premium Standalone).
