// ============================================================
// auth.js — Studio Token Validation
// ============================================================
// Bertanggung jawab untuk:
//   1. Mengambil studioToken dari URL path
//   2. Memvalidasi token ke API (GET /api/studio/:token)
//   3. Menampilkan state yang sesuai (loading / error / published / studio)
//   4. Meng-expose studioToken dan initialConfig ke module lain
// ============================================================
// DIPANGGIL OLEH: studio.js (saat init)
// ============================================================

const Auth = (() => {

  let _studioToken = null;
  let _initialConfig = null;

  // Ambil token dari URL: 
  // 1. Path-based: /studio/[token] (Produksi)
  // 2. Query-based: ?token=[token] (Dev/Fallback)
  const getTokenFromUrl = () => {
    // Cek query parameter first (lebih fleksibel untuk dev)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) return tokenParam;

    // Fallback ke path-based
    const parts = window.location.pathname.split('/');
    // Jika URL foryoualways.id/studio/xk9pq2mn3r, token ada di parts[2]
    // Cari part setelah 'studio'
    const studioIdx = parts.indexOf('studio');
    if (studioIdx !== -1 && parts[studioIdx + 1]) {
      const p = parts[studioIdx + 1];
      // Abaikan jika tokennya cuma 'index.html'
      if (p !== 'index.html') return p;
    }

    return null;
  };

  // ── Mock Data untuk Testing Tanpa Backend ────────────────
  const _getMockState = () => ({
    success: true,
    studio: {
      occasion: 'romantic',
      theme: 'rose',
      recipientName: 'Nama Kesayangan',
      message: 'Ini adalah contoh pesan untuk melihat tampilan preview di studio.',
      photos: [],
      voiceNote: { url: null, duration: null, mimeType: null },
      status: 'draft'
    }
  });

  // Tampilkan satu state, sembunyikan lainnya
  const showState = (stateId) => {
    ['state-loading', 'state-error', 'state-published', 'state-studio'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== stateId);
    });
  };

  // Inisialisasi — dipanggil saat halaman dimuat
  const init = async () => {
    showState('state-loading');

    _studioToken = getTokenFromUrl();

    // Jika dipaksa pakai mock mode via query ?mock=true
    const isMock = new URLSearchParams(window.location.search).get('mock') === 'true';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';

    // Jika tidak ada token, dan bukan mode paksa mock -> Gagal (studio.js akan handle redirect)
    if (!_studioToken && !isMock) {
      console.warn('[Auth] No studioToken found.');
      return false;
    }

    try {
      if (isMock || _studioToken === 'mock') {
        console.log('[Auth] Entering MOCK MODE');
        const data = _getMockState();
        _initialConfig = data.studio;
        showState('state-studio');
        return true;
      }

      // HARDCODED FIX: Bypass APP_CONFIG cache issues
      const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';
      console.log(`[Auth] Validating token: ${_studioToken} at ${API_BASE_URL}`);

      // VALENTINE API COMPATIBILITY: Use /get-config?id=...
      const response = await fetch(`${API_BASE_URL}/get-config?id=${_studioToken}`);

      // Jika fetch gagal (e.g. server mati saat dev), tawarkan mock mode otomatis
      if (!response.ok && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        console.warn('[Auth] Server unreachable, falling back to MOCK MODE for dev');
        _initialConfig = _getMockState().studio;
        showState('state-studio');
        return true;
      }

      const data = await response.json();

      // Valentine API returns data directly, or { error: ... }
      // If data is null/empty, it might mean token not found or new studio
      if (!data || data.error) {
        console.error('[Auth] Validation failed:', data?.error || 'Token not found');
        showState('state-error');
        return false;
      }

      // Gift sudah dipublish — tidak bisa diedit lagi
      if (data.status === 'published' && data.giftUrl) {
        const link = document.getElementById('published-gift-link');
        if (link) link.href = data.giftUrl;
        showState('state-published');
        return false;
      }

      // Sukses — simpan config untuk dipakai module lain
      _initialConfig = data;
      showState('state-studio');
      return true;

    } catch (err) {
      console.error('[Auth] Error validating token:', err);

      // Autodetect dev environment untuk mock fallback
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
        console.warn('[Auth] Fetch failed, providing Mock Data fallback for local testing.');
        _initialConfig = _getMockState().studio;
        showState('state-studio');
        return true;
      }

      showState('state-error');
      return false;
    }
  };

  // Getter — diakses oleh module lain
  const getToken = () => _studioToken;
  const getInitialConfig = () => _initialConfig;

  return { init, getToken, getInitialConfig };

})();
