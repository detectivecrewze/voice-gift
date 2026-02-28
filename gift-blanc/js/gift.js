// ============================================================
// gift.js — Gift Page Main Controller
// ============================================================
// Bertanggung jawab untuk:
//   1. Mengambil giftId dari URL
//   2. Fetch config dari GET /api/gift/:giftId
//   3. Routing ke state yang sesuai (loading/error/password/gift)
//   4. Merender konten gift (hero, voice, gallery)
//   5. Menangani password gate
// ============================================================

// Config - HARDCODED FIX: Bypass local caching/config issues
const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';

// ── Helper: Tampilkan satu state ──────────────────────────────
const showState = (stateId) => {
  ['state-loading', 'state-preloading', 'state-error', 'state-password', 'state-gift', 'state-access'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', id !== stateId);
  });
};

// ── Mock Data for Development ─────────────────────────────────
const _getMockData = (id) => {
  if (id === 'demo') {
    return {
      success: true,
      gift: {
        recipientName: 'Sayangku ❤️',
        message: 'Selamat hari jadi yang ke-1! Terima kasih sudah selalu ada di sampingku. Ini adalah sedikit kenangan yang aku kumpulin buat kamu. Love you always! ✨',
        theme: 'blanc',
        ambient: 'rain',
        voiceNote: {
          url: '/assets/The 1975 - About You (Official).mp3', // Audio default dari assets
          duration: 300 // Estimasi 5 menit
        },
        photos: [
          { id: 1, url: '../assets/1.jpg', order: 1 },
          { id: 2, url: '../assets/2.jpg', order: 2 },
          { id: 3, url: '../assets/3.jpg', order: 3 },
          { id: 4, url: '../assets/4.jpg', order: 4 },
          { id: 5, url: '../assets/5.jpg', order: 5 },
          { id: 6, url: '../assets/6.jpg', order: 6 },
          { id: 7, url: '../assets/7.jpg', order: 7 },
          { id: 8, url: '../assets/8.jpg', order: 8 },
          { id: 9, url: '../assets/9.jpg', order: 9 },
          { id: 10, url: '../assets/10.jpg', order: 10 }
        ],
        hasPassword: false
      }
    };
  }
  return null;
};

// ── Init ──────────────────────────────────────────────────────
const initGiftPage = async () => {
  showState('state-loading');

  // Ambil giftId dari URL: prioritize ?to=[id] (gaya Valentine)
  const urlParams = new URLSearchParams(window.location.search);
  const toId = urlParams.get('to');
  const queryId = urlParams.get('id');

  // Fallback ke path-based ID jika query param kosong
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  let pathId = null;
  const giftIdx = pathParts.indexOf('gift');
  if (giftIdx !== -1 && pathParts[giftIdx + 1]) {
    pathId = pathParts[giftIdx + 1];
  } else if (pathParts.length > 0) {
    // Last stand: just take the last part if not 'gift'
    pathId = pathParts[pathParts.length - 1];
  }

  let giftId = toId || queryId || pathId;

  // Bersihkan ID jika lari ke index.html
  if (giftId === 'index.html' || giftId === 'gift' || giftId === '') {
    giftId = null;
  }


  // Jika tetap kosong, tampilkan Menu Akses
  if (!giftId) {
    giftId = 'demo';
  }

  // Jika tetap null (sudah diprotect di atas, tapi be safe), baru setup access UI
  if (!giftId) {
    _setupAccessUI();
    showState('state-access');
    return;
  }

  _fetchAndRender(giftId);
};

// ── UI Menu Masuk (Jika tidak ada ID di URL) ────────────────────
const _setupAccessUI = () => {
  const input = document.getElementById('access-id-input');
  const btn = document.getElementById('btn-access-go');

  const handleGo = () => {
    const id = input.value.trim().toLowerCase();
    if (id) {
      // Update URL tanpa reload untuk UX yang lebih baik
      const newUrl = `${window.location.origin}${window.location.pathname}?to=${id}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      _fetchAndRender(id);
    }
  };

  btn?.addEventListener('click', handleGo);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleGo();
  });
};

// ── Fetch & Route Logic ───────────────────────────────────────
const _fetchAndRender = async (giftId) => {
  showState('state-loading');

  try {
    const mock = _getMockData(giftId);
    if (mock) {
      _renderGift(mock.gift);
      return;
    }

    const endpoint = `${API_BASE_URL}/get-config?id=${giftId}&t=${Date.now()}`;

    // Set timeout untuk fetch agar tidak buffering selamanya
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik

    const response = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Gift] API returned error: ${response.status}`);
      showState('state-error');
      return;
    }

    const gift = await response.json();

    if (!gift || gift.error) {
      console.error('[Gift] Config is invalid:', gift?.error);
      showState('state-error');
      return;
    }

    // CEK PASSWORD: Pastikan property password ada dan tidak kosong
    const isProtected = gift.password && String(gift.password).trim().length > 0;

    if (isProtected) {
      _setupPasswordGate(giftId, gift);
      showState('state-password');
    } else {
      _renderGift(gift);
    }

  } catch (err) {
    console.error('[Gift] Critical Error:', err);
    showState('state-error');
  }
};

// ── Setup Password Gate ───────────────────────────────────────
const _setupPasswordGate = (giftId, partialGift) => {
  const input = document.getElementById('password-input');
  const btn = document.getElementById('btn-unlock');
  const errorMsg = document.getElementById('password-error');

  if (!btn) {
    console.error('[Gift] Password UI elements missing.');
    return;
  }

  const tryUnlock = async () => {
    const password = input?.value?.trim();
    if (!password) return;

    btn.textContent = 'Membuka...';
    btn.disabled = true;

    try {
      // Re-fetch with ID — with timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik
      const response = await fetch(`${API_BASE_URL}/get-config?id=${giftId}&t=${Date.now()}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await response.json();

      if (data && data.password === password) {
        _renderGift(data);
      } else {
        // Password salah — shake animation
        if (input) {
          input.classList.add('shake');
          setTimeout(() => input.classList.remove('shake'), 400);
          input.value = '';
          input.focus();
        }
        if (errorMsg) errorMsg.classList.remove('hidden');
      }
    } catch (err) {
      console.error('[Gift] Unlock error:', err);
      if (err.name === 'AbortError') {
        if (errorMsg) {
          errorMsg.textContent = 'Koneksi timeout. Coba lagi.';
          errorMsg.classList.remove('hidden');
        }
      }
    } finally {
      btn.textContent = '❤️ Buka Hadiah';
      btn.disabled = false;
    }
  };

  btn?.addEventListener('click', tryUnlock);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
  });
};

// ── Render Gift Page ──────────────────────────────────────────
const _renderGift = (gift) => {
  const giftEl = document.getElementById('state-gift');

  // Terapkan tema ke body untuk background full-screen
  document.body.setAttribute('data-theme', gift.theme || 'rose');

  // Voice Note (Printer-Music Box)
  const voiceSection = document.getElementById('gift-voice');
  const hasVoice = !!gift.voiceNote?.url;
  const hasPhotos = !!(gift.photos && gift.photos.length > 0);

  if (hasVoice || hasPhotos) {
    if (voiceSection) {
      voiceSection.classList.remove('hidden');
      VoicePlayer.handleAfterLoad(gift, voiceSection);
    }
  } else {
    voiceSection?.classList.add('hidden');
    showState('state-gift'); // Jika benar-benar kosong
  }
};


// ── Entry Point ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initGiftPage);
