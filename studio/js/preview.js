// ============================================================
// preview.js — Live Preview Sync
// ============================================================
// Bertanggung jawab untuk:
//   1. Menerima state terbaru dari studio.js
//   2. Me-render preview gift page langsung di #preview-frame
//      (bukan iframe — render DOM langsung untuk performa)
//   3. Menerapkan tema visual yang dipilih
//   4. Update real-time saat user mengetik / upload foto
// ============================================================
// DIPANGGIL OLEH: studio.js via Preview.update(state)
// ============================================================

// ============================================================
// preview.js — Live Preview Sync
// ============================================================
// Buka tab baru untuk melihat preview tema secara utuh.

const Preview = (() => {

  const update = (state) => {
    // Tidak melakukan apa-apa lagi karena tidak ada iframe inline
  };

  const openPreview = () => {
    const state = Studio.getState();

    // Proteksi Layar Blank: Wajib 1 foto
    if (!state.photos || state.photos.length === 0) {
      Studio.showToast('Oops! Tambahkan minimal 1 foto dulu untuk melihat preview. 📸');
      return;
    }

    // Force Auth Token
    const token = Auth.getToken();
    if (!token) {
      Studio.showToast('Token tidak ditemukan, harap ulangi akses studio.');
      return;
    }

    // Force save draft to server BEFORE opening preview
    Autosave.saveNow(state);

    const themeConfig = Studio.getThemeConfig(state.theme);
    const folder = themeConfig ? themeConfig.folder : 'gift';

    // Tambahkan delay 500ms agar save KV Cloudflare punya jeda propagasi aman
    Studio.showToast('Membuka Live Preview...');
    setTimeout(() => {
      // Buka URL token dengan parameter cache-busting
      const previewUrl = `../${folder}/index.html?to=${token}&preview=true&t=${Date.now()}`;
      window.open(previewUrl, '_blank');
    }, 500);
  };

  // Expose public API
  return {
    update,
    openPreview
  };

})();
