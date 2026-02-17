// ============================================================
// autosave.js — Autosave Studio Config ke API
// ============================================================
// Bertanggung jawab untuk:
//   1. Menerima sinyal "state berubah" dari studio.js
//   2. Menunggu 1.5 detik (debounce) sebelum menyimpan
//   3. Kirim PUT /api/studio/:token dengan seluruh state terbaru
//   4. Update indikator "✓ Tersimpan" / "⚠ Gagal menyimpan"
// ============================================================

const Autosave = (() => {

  let _debounceTimer = null;
  const DEBOUNCE_MS = 1500;

  const _setIndicator = (text, color = 'text-gray-400') => {
    const el = document.getElementById('autosave-indicator');
    if (el) {
      el.textContent = text;
      el.className = `text-xs ${color}`;
    }
  };

  // Dipanggil oleh studio.js setiap kali ada perubahan
  const trigger = (getStateCallback) => {
    _setIndicator('Menyimpan...');
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(async () => {
      await _save(getStateCallback());
    }, DEBOUNCE_MS);
  };

  const _save = async (stateData) => {
    const token = Auth.getToken();
    if (!token) return;

    try {
      // VALENTINE API COMPATIBILITY: Use /save-config?id=...
      // Original: PUT /studio/:token -> New: POST /save-config?id=:token
      const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';

      const response = await fetch(`${API_BASE_URL}/save-config?id=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateData),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        _setIndicator('✓ Tersimpan', 'text-green-400');
        // Reset ke warna normal setelah 2 detik
        setTimeout(() => _setIndicator('', 'text-gray-400'), 2000);
      } else {
        _setIndicator('⚠ Gagal menyimpan', 'text-amber-500');
        console.warn('[Autosave] Server error:', result);
      }
    } catch (err) {
      console.error('[Autosave] Error:', err);
      _setIndicator('⚠ Gagal menyimpan', 'text-amber-500');
    }
  };

  return { trigger, saveNow: _save };

})();
