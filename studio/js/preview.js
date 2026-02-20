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
    const token = Auth.getToken();

    if (!token) {
      alert("Token tidak ditemukan.");
      return;
    }

    // Ambil konfigurasi tema untuk folder yang benar
    const themeConfig = Studio.getThemeConfig(state.theme);
    const folder = themeConfig ? themeConfig.folder : 'gift'; // fallback

    // Buka di tab baru (memastikan file tersimpan secara otomatis sebelum membuka)
    window.open(`../${folder}/index.html?to=${token}`, '_blank');
  };

  // Expose public API
  return {
    update,
    openPreview
  };

})();
