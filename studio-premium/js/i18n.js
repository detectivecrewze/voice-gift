(function () {
  'use strict';

  const COPY = {
    'Link tidak ditemukan': 'Link not found',
    'Silakan periksa kembali tautan anda.': 'Please check your link again.',
    'Beranda': 'Home',
    'Kado sudah dipublish': 'Gift has been published',
    'Konten ini sudah tidak dapat diubah lagi.': 'This content can no longer be edited.',
    'Lihat Hasil': 'View Gift',
    'Project ini dilindungi password': 'This project is password-protected',
    'Password salah.': 'Incorrect password.',
    'Buka Editor': 'Open Editor',
    'Format Kado': 'Gift Format',
    'Pilihan Tema Warna': 'Theme Color Choices',
    'Model Lensa & Frame': 'Lens & Frame Style',
    'Klik tombol di bawah untuk melihat hasil visual kado kamu secara utuh.': 'Click the button below to see the complete gift preview.',
    'Lihat Contoh Kado (Demo)': 'View Gift Example (Demo)',
    'Galeri Kenangan': 'Memory Gallery',
    '✨ Maksimal 20 Foto': '✨ Up to 20 Photos',
    'Panduan': 'Guide',
    '+ Tambah Foto': '+ Add Photos',
    'Letakkan foto anda di sini': 'Drop your photos here',
    '* Tekan dan geser Tombol Garis 2 di foto untuk mengatur urutan.': '* Press and drag the two-line handle on a photo to set its order.',
    '* Menambahkan teks (caption) di setiap foto bersifat opsional. Boleh dikosongkan.': '* Adding text (a caption) to each photo is optional. You may leave it blank.',
    'Musik Latar': 'Background Music',
    '🎶 Musik yang menemani kadomu': '🎶 Music that accompanies your gift',
    'Vol. Musik Latar': 'Background Music Volume',
    'Pilih satu lagu untuk kado kamu': 'Choose one song for your gift',
    'Pilih Lagu Ini': 'Choose This Song',
    'Studio Suara': 'Voice Studio',
    'Klik untuk merekam pesan': 'Click to record a message',
    'Atau upload file audio': 'Or upload an audio file',
    'Tidak pakai rekaman?': 'Not using a recording?',
    'Tanpa rekaman suara? Pilih berapa lama sebelum': 'Without a voice recording, choose how long before',
    'Pesan Rahasia': 'Secret Message',
    'muncul.': 'appears.',
    'Tanpa Jeda': 'No Delay',
    '10 det': '10 sec',
    '15 det': '15 sec',
    '30 det': '30 sec',
    '45 det': '45 sec',
    '60 det': '60 sec',
    'Hentikan': 'Stop',
    'Rekaman Selesai': 'Recording Complete',
    'Klik "Simpan" agar tidak hilang': 'Click "Save" so it is not lost',
    'Putar': 'Play',
    'Ulang': 'Re-record',
    '✓ Simpan Rekaman': '✓ Save Recording',
    'Vol. Suara Utama': 'Main Voice Volume',
    'Dengarkan dengan Musik Latar': 'Listen with Background Music',
    '* Rekomendasi: Vol. Suara Utama 80% & Vol. Musik Latar 25% agar pesan Anda terdengar jernih.': '* Recommended: Main Voice Volume 80% & Background Music Volume 25% for a clear message.',
    'Audio Berhasil Tersimpan! ✨': 'Audio Saved! ✨',
    'Siap Digunakan': 'Ready to Use',
    'Dengarkan': 'Listen',
    'Hapus & Rekam Ulang': 'Remove & Re-record',
    '✦ Opsional': '✦ Optional',
    '✨ Muncul setelah voice note selesai diputar': '✨ Appears after the voice note finishes playing',
    'Ini adalah fitur': 'This is an',
    'opsional': 'optional',
    '. Setelah voice note selesai diputar, sebuah foto polaroid dan pesan rahasia akan muncul khusus untuk penerima kado. Biarkan kosong jika tidak ingin menggunakan fitur ini.': '. feature. After the voice note finishes playing, a polaroid photo and secret message will appear for the gift recipient. Leave it empty to skip this feature.',
    'Foto Rahasia (1 Foto)': 'Secret Photo (1 Photo)',
    'Klik atau seret foto ke sini': 'Click or drag a photo here',
    'Foto ini tidak akan tampil di slideshow utama': 'This photo will not appear in the main slideshow',
    'Hapus & Ganti Foto': 'Remove & Replace Photo',
    'Surat Tulisan Tangan': 'Handwritten Letter',
    'Buat dengan AI': 'Create with AI',
    '0 kata': '0 words',
    '* Teks akan tampil dengan gaya tulisan tangan di polaroid': '* Text will appear in a handwritten style on the polaroid',
    'Klik tombol di bawah untuk melihat tampilan polaroid (foto rahasia + surat) secara langsung.': 'Click the button below to see the polaroid preview (secret photo + letter).',
    '📷 Lihat Preview Polaroid': '📷 View Polaroid Preview',
    'Keamanan': 'Security',
    'Pengaturan Password': 'Password Settings',
    'Hint Password': 'Password Hint',
    'Petunjuk untuk penerima': 'Hint for the recipient',
    'Opsional': 'Optional',
    'Petunjuk ini tampil di halaman kado saat meminta password.': 'This hint appears on the gift page when a password is requested.',
    'Password Kado': 'Gift Password',
    'Kunci rahasia untuk penerima kado': 'Secret key for the gift recipient',
    'Biarkan kosong jika kado ingin langsung terbuka tanpa password.': 'Leave this empty if the gift should open without a password.',
    'Password Editor': 'Editor Password',
    'Kunci masuk ke studio ini': 'Access key for this studio',
    'Digunakan untuk mengakses kembali editor ini di masa depan.': 'Used to access this editor again in the future.',
    'Jangan sampai lupa.': 'Do not forget it.',
    '📸 Foto min. 6': '📸 Minimum 6 Photos',
    '🎙️ Suara min. 1': '🎙️ Minimum 1 Voice Note',
    'LIHAT LIVE PREVIEW': 'VIEW LIVE PREVIEW',
    'PUBLIKASIKAN KADO ❤️': 'PUBLISH GIFT ❤️',
    'REQUEST DOMAIN / LINK PRIBADI (+5K)': 'REQUEST DOMAIN / PRIVATE LINK (+5K)',
    '💡 Dapatkan link kado dengan domain sendiri (contoh: nama-kamu.vercel.app) dan buat pengalaman yang terasa lebih personal ✨': '💡 Get a gift link on your own domain (for example: your-name.vercel.app) for a more personal experience ✨',
    'Selain link eksklusif, kamu juga otomatis bisa membuat gift baru dari studio editor ini 💌': 'Besides the exclusive link, you can also create a new gift from this studio editor 💌',
    'Tersimpan otomatis': 'Saved automatically',
    'Desain Terkirim!': 'Design Sent!',
    '✦ KADO VIP SEDANG DIPROSES ✦': '✦ VIP GIFT IS BEING PROCESSED ✦',
    'Terima kasih! Desain VIP Anda sedang kami hubungkan ke domain eksklusif Anda. Admin akan segera memprosesnya dan menghubungi Anda.': 'Thank you! Your VIP design is being connected to your exclusive domain. Our admin will process it and contact you soon.',
    'Kabari Admin di WhatsApp': 'Notify Admin on WhatsApp',
    'Selesai': 'Done',
    'Kado Tercipta!': 'Gift Created!',
    '✦ READY TO BE SHARED ✦': '✦ READY TO BE SHARED ✦',
    'Untuk pengalaman terbaik, sangat disarankan membuka kado ini via': 'For the best experience, we recommend opening this gift on a',
    'Komputer / Laptop': 'Computer / Laptop',
    '. Jika menggunakan iPhone, usahakan akses via browser': '. If you use an iPhone, please access it through',
    'Lanjutkan & Publish': 'Continue & Publish',
    'Batal': 'Cancel',
    'Contoh Tampilan Galeri': 'Gallery Preview',
    'Pada halaman kado nanti': 'On the gift page later',
    'Caption yang kamu tulis akan muncul dengan estetik seperti ini di dalam Memory Printer nanti.': 'Your caption will appear like this in the Memory Printer.',
    '✨ Tulis dengan AI': '✨ Write with AI',
    'Untuk Pesan Rahasia Polaroid': 'For the Polaroid Secret Message',
    'Instruksi untuk AI': 'Instructions for AI',
    'Semakin detail instruksimu, semakin personal hasilnya.': 'The more detailed your instruction, the more personal the result.',
    'Pilih Gaya Bahasa': 'Choose a Writing Style',
    'Romantis': 'Romantic',
    'Lucu / Canda': 'Funny / Playful',
    'Santai (Aku/Kamu)': 'Casual (I/You)',
    'Formal & Tulus': 'Formal & Sincere',
    'Generate Pesan': 'Generate Message',
    'AI sedang menulis...': 'AI is writing...',
    'Sebentar ya, lagi merangkai kata-kata ✨': 'Just a moment, crafting the words ✨',
    'Hasil dari AI :': 'Result from AI:',
    'Coba Lagi': 'Try Again',
    '✓ Gunakan Pesan Ini': '✓ Use This Message',
    'Rekam suara dulu ya! 🎙️': 'Record a voice note first! 🎙️',
    'Pilih musik atau rekam suara dulu ya! 🎙️': 'Choose music or record a voice note first! 🎙️',
    'Durasi tidak tersedia.': 'Duration is unavailable.',
    'Lagu dihapus. ✨': 'Song removed. ✨',
    'Pilih file gambar ya! 📸': 'Choose an image file! 📸',
    'Mengupload foto rahasia... 📸': 'Uploading secret photo... 📸',
    'Foto rahasia berhasil diupload! ✨': 'Secret photo uploaded! ✨',
    'Gagal upload foto. Coba lagi.': 'Could not upload the photo. Try again.',
    'File musik terlalu besar! Maksimal 10MB.': 'Music file is too large! Maximum 10MB.',
    'Mengupload lagu... 🎶': 'Uploading song... 🎶',
    'Lagu berhasil diupload! 🎶': 'Song uploaded! 🎶',
    'Gagal upload musik. Coba lagi.': 'Could not upload music. Try again.',
    'Playlist kosong': 'Playlist is empty',
    'Gagal merekam suara. Pastikan mikrofon berfungsi.': 'Could not record audio. Check that your microphone is working.',
    'Rekaman selesai! Klik Simpan untuk konfirmasi. 🎙️': 'Recording complete! Click Save to confirm. 🎙️',
    'Terjadi kesalahan saat merekam. Coba lagi.': 'An error occurred while recording. Try again.',
    'Batas waktu 3 menit tercapai ⏱️': 'The 3-minute limit has been reached ⏱️',
    'Menyimpan...': 'Saving...',
    'Suara berhasil disimpan! 🎙️✨': 'Voice note saved! 🎙️✨',
    'Gagal menyimpan rekaman. Coba lagi.': 'Could not save the recording. Try again.',
    'File harus berupa audio (MP3, M4A, dll.)': 'The file must be audio (MP3, M4A, etc.).',
    'File audio terlalu besar. Maks 10MB.': 'Audio file is too large. Maximum 10MB.',
    'Mengupload audio...': 'Uploading audio...',
    'Audio berhasil ditambahkan! ✅': 'Audio added! ✅',
    'Gagal mengupload audio. Coba lagi.': 'Could not upload audio. Try again.',
    'Tunggu sebentar ya, foto kamu sedang diupload ke cloud... ⏳': 'Please wait, your photos are uploading to the cloud... ⏳',
    'Token studio tidak ditemukan. Gunakan link resmi.': 'Studio token was not found. Use the official link.',
    'Nama domain Vercel wajib diisi agar kado bisa diproses! 🌐': 'A Vercel domain name is required before the gift can be processed! 🌐',
    'Mengirim Data...': 'Sending Data...',
    'Memproses...': 'Processing...',
    'Fitur download belum siap. Silakan screenshot manual.': 'Download is not ready yet. Please take a screenshot manually.',
    'Barcode berhasil didownload! 📲': 'Barcode downloaded! 📲',
    'Gagal download barcode. Coba lagi.': 'Could not download barcode. Try again.',
    'TERSALIN': 'COPIED',
    'SALIN LINK': 'COPY LINK',
    'Gagal menyalin. Silakan coba manual.': 'Could not copy. Please try manually.'
  };

  const REVERSE_COPY = {};
  for (const [id, en] of Object.entries(COPY)) {
    REVERSE_COPY[en] = id;
  }

  let locale = 'id';
  let storageKey = 'voices-premium-studio-locale-default';
  let observer;
  let isTranslating = false;
  let rafId = null;
  const pendingNodes = new Set();

  function translate(value) {
    if (typeof value !== 'string') return value;
    if (locale === 'en') return COPY[value] || value;
    return REVERSE_COPY[value] || value;
  }

  function translateNode(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script, style, textarea, input, select, option, pre, code, [contenteditable], [data-i18n-ignore], #ai-result-text')) return;
    const text = node.nodeValue;
    const leading = text.match(/^\s*/)[0];
    const trailing = text.match(/\s*$/)[0];
    const translated = translate(text.trim());
    if (translated !== text.trim()) node.nodeValue = leading + translated + trailing;
  }

  function apply(root) {
    document.documentElement.lang = locale;
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateNode(node);
    (root || document).querySelectorAll?.('[placeholder], [title], [aria-label]').forEach((element) => {
      ['placeholder', 'title', 'aria-label'].forEach((attribute) => {
        const current = element.getAttribute(attribute);
        if (current) {
          const translated = translate(current);
          if (translated !== current) element.setAttribute(attribute, translated);
        }
      });
    });
    const select = document.querySelector('#voices-premium-language select');
    const label = document.querySelector('#voices-premium-language span');
    if (select) select.value = locale;
    if (label) label.textContent = locale === 'en' ? 'Language' : 'Bahasa';
  }

  function projectKey() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || params.get('id') || window.location.pathname.split('/').filter(Boolean).pop() || 'default';
  }

  function setLocale(nextLocale) {
    locale = nextLocale === 'en' ? 'en' : 'id';
    localStorage.setItem(storageKey, locale);
    apply();
  }

  function addSelector() {
    const control = document.createElement('div');
    control.id = 'voices-premium-language';
    control.setAttribute('data-i18n-ignore', '');
    control.innerHTML = '<span>Bahasa</span><select aria-label="Pilih bahasa"><option value="id">Indonesia</option><option value="en">English</option></select>';
    const style = document.createElement('style');
    style.textContent = '#voices-premium-language{position:fixed;top:14px;right:14px;z-index:10000;display:flex;align-items:center;gap:7px;padding:7px 10px;background:rgba(255,255,255,.92);border:1px solid rgba(0,0,0,.12);border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.12);font:700 10px/1.1 Arial,sans-serif;letter-spacing:.04em;color:#27272a;backdrop-filter:blur(8px)}#voices-premium-language select{border:0;background:transparent;color:inherit;font:inherit;outline:0;cursor:pointer;padding:1px}@media (max-width: 480px){#voices-premium-language{top:10px;right:10px;padding:5px 8px}#voices-premium-language span{display:none}}';
    document.head.appendChild(style);
    document.body.appendChild(control);
    control.querySelector('select').addEventListener('change', (event) => setLocale(event.target.value));
  }

  function init() {
    storageKey = `voices-premium-studio-locale-${projectKey()}`;
    locale = localStorage.getItem(storageKey) === 'en' ? 'en' : 'id';
    addSelector();
    apply();
    observer = new MutationObserver((mutations) => {
      if (isTranslating) return;
      let hasAdded = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            pendingNodes.add(node);
            hasAdded = true;
          } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
            pendingNodes.add(node.parentElement);
            hasAdded = true;
          }
        });
      });
      if (hasAdded) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          isTranslating = true;
          try {
            pendingNodes.forEach((el) => {
              if (document.body.contains(el)) apply(el);
            });
            pendingNodes.clear();
          } finally {
            isTranslating = false;
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.VoicesPremiumI18n = { t: translate, setLocale, getLocale: () => locale, apply };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
