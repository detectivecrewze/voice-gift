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
    ['state-loading', 'state-error', 'state-published', 'state-auth', 'state-studio'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== stateId);
    });
  };

  // ── Password Gate Helpers ─────────────────────────────────
  const _setupStudioAuth = (correctPass) => {
    const input = document.getElementById('studio-pass-input');
    const btn = document.getElementById('btn-unlock-studio');
    const errorMsg = document.getElementById('studio-pass-error');

    const tryUnlock = () => {
      if (input.value === correctPass) {
        sessionStorage.setItem(`auth_${_studioToken}`, 'true');
        showState('state-studio');
      } else {
        errorMsg.classList.remove('hidden');
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 400);
      }
    };

    btn?.addEventListener('click', tryUnlock);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryUnlock();
    });
  };

  // Inisialisasi — dipanggil saat halaman dimuat
  const init = async () => {
    showState('state-loading');

    _studioToken = getTokenFromUrl();
    const urlParams = new URLSearchParams(window.location.search);
    const passFromUrl = urlParams.get('pass');

    // Jika dipaksa pakai mock mode via query ?mock=true
    const isMock = urlParams.get('mock') === 'true';

    // Jika tidak ada token, dan bukan mode paksa mock -> Gagal (studio.js akan handle redirect)
    if (!_studioToken && !isMock) {
      console.warn('[Auth] No studioToken found.');
      return false;
    }

    try {
      if (isMock || _studioToken === 'mock') {
        const data = _getMockState();
        _initialConfig = data.studio;
        showState('state-studio');
        return true;
      }

      const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';
      const response = await fetch(`${API_BASE_URL}/get-config?id=${_studioToken}`);

      if (!response.ok && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        _initialConfig = _getMockState().studio;
        showState('state-studio');
        return true;
      }

      const data = await response.json();

      // Case 1: Token Found
      if (data && !data.error) {

        // Cek apakah sudah dipublish
        if (data.status === 'published' && data.giftUrl) {
          const link = document.getElementById('published-gift-link');
          if (link) link.href = data.giftUrl;
          showState('state-published');
          return false;
        }

        // 🛡️ SECURITY: Cek Password Studio
        if (data.studioPassword) {
          const isAuthed = sessionStorage.getItem(`auth_${_studioToken}`) === 'true';

          // Jika ada info password dari URL (Creation Flow), auto-auth
          if (passFromUrl === data.studioPassword) {
            sessionStorage.setItem(`auth_${_studioToken}`, 'true');
          } else if (!isAuthed) {
            _setupStudioAuth(data.studioPassword);
            showState('state-auth');
            return true; // Return true but state is auth
          }
        }

        _initialConfig = data;
        showState('state-studio');
        return true;
      }

      // Case 2: Token Not Found / New Project
      else {
        console.log('[Auth] New project detected or token not found.');

        // Jika ini project baru dengan password di URL, inisialisasi password
        _initialConfig = _getMockState().studio;
        if (passFromUrl) {
          _initialConfig.studioPassword = passFromUrl;
          sessionStorage.setItem(`auth_${_studioToken}`, 'true');
        }

        showState('state-studio');
        return true;
      }

    } catch (err) {
      console.error('[Auth] Error validating token:', err);
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
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
