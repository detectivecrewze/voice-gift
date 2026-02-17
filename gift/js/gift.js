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
  ['state-loading', 'state-error', 'state-password', 'state-gift'].forEach(id => {
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
        theme: 'rose',
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
  console.log('[Gift] Initializing...');
  showState('state-loading');

  // Ambil giftId dari URL: prioritize ?to=[id] (gaya Valentine)
  const urlParams = new URLSearchParams(window.location.search);
  const toId = urlParams.get('to');
  const queryId = urlParams.get('id');

  // Fallback ke path-based ID jika query param kosong
  const pathParts = window.location.pathname.split('/');
  let pathId = pathParts[pathParts.length - 1];

  let giftId = toId || queryId || pathId;

  // Bersihkan ID jika lari ke index.html
  if (giftId === 'index.html' || giftId === 'gift') {
    giftId = null;
  }

  console.log('[Gift] Resolved ID:', giftId);

  // Jika tetap kosong (atau 'gift'), ini state error
  if (!giftId || giftId === 'gift' || giftId === 'index.html') {
    // Cek apakah ada demo mock
    console.log('[Gift] No ID found, checking demo mock');
    const mock = _getMockData('demo');
    if (mock) {
      _renderGift(mock.gift);
      showState('state-gift');
      return;
    }
    showState('state-error');
    return;
  }

  try {
    // 1. Cek Mock Data dulu (supaya bisa test tanpa API)
    const mock = _getMockData(giftId);
    if (mock) {
      _renderGift(mock.gift);
      showState('state-gift');
      return;
    }

    // 2. Fetch dari API asli (Valentine Compat)
    console.log(`[Gift] Fetching from Cloud: ${API_BASE_URL}/get-config?id=${giftId}`);
    const response = await fetch(`${API_BASE_URL}/get-config?id=${giftId}`);

    if (!response.ok) {
      showState('state-error');
      return;
    }

    const gift = await response.json();

    // Konten kosong atau error
    if (!gift || gift.error) {
      console.error('[Gift] Data invalid or empty:', gift?.error);
      showState('state-error');
      return;
    }

    // Jika ada password, tampilkan password gate dulu
    if (gift.password) {
      _setupPasswordGate(giftId, gift);
      showState('state-password');
    } else {
      _renderGift(gift);
      showState('state-gift');
    }

  } catch (err) {
    console.error('[Gift] Error loading gift:', err);
    showState('state-error');
  }
};

// ── Setup Password Gate ───────────────────────────────────────
const _setupPasswordGate = (giftId, partialGift) => {
  const input = document.getElementById('password-input');
  const btn = document.getElementById('btn-unlock');
  const errorMsg = document.getElementById('password-error');

  const tryUnlock = async () => {
    const password = input?.value?.trim();
    if (!password) return;

    btn.textContent = 'Membuka...';
    btn.disabled = true;

    try {
      // Re-fetch with ID (Simplified for now: if password matches what's in local memory or just re-fetch)
      const response = await fetch(`${API_BASE_URL}/get-config?id=${giftId}`);
      const data = await response.json();

      if (data && data.password === password) {
        _renderGift(data);
        showState('state-gift');
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
  if (gift.voiceNote?.url) {
    if (voiceSection) {
      voiceSection.classList.remove('hidden');
      VoicePlayer.init(gift.voiceNote, voiceSection, gift.photos || []);
    }
  } else {
    voiceSection?.classList.add('hidden');
  }
};


// ── Entry Point ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initGiftPage);
