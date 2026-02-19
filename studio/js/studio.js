// ============================================================
// studio.js — Main Controller (INIT TERAKHIR)
// ============================================================
// Bertanggung jawab untuk:
//   1. Inisialisasi semua module setelah auth berhasil
//   2. Mengelola state global studio
//   3. Render section Occasion & Tema
//   4. Bind events untuk input teks (nama, pesan, password)
//   5. Menerima update dari module lain (uploader, voice-recorder)
//   6. Trigger autosave dan preview sync
//   7. Expose fungsi utilitas (showToast, getState)
// ============================================================
// HARUS DILOAD TERAKHIR — bergantung pada semua module lain
// ============================================================

// Config global — deteksi otomatis localhost vs produksi
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

window.APP_CONFIG = {
  // HARDCODED FIX: Bypass local caching/config issues
  apiBaseUrl: 'https://valentine-upload.aldoramadhan16.workers.dev',
};

// ── Data: Occasions ──────────────────────────────────────────
const OCCASIONS = [
  { id: 'romantic', label: 'Romantic', emoji: '💕', defaultTheme: 'rose' },
  { id: 'birthday', label: 'Birthday', emoji: '🎂', defaultTheme: 'gold' },
  { id: 'family', label: 'Family', emoji: '🏡', defaultTheme: 'sage' },
  { id: 'graduation', label: 'Graduation', emoji: '🎓', defaultTheme: 'midnight' },
  { id: 'friendship', label: 'Friendship', emoji: '🤝', defaultTheme: 'lavender' },
];

// ── Data: Themes ─────────────────────────────────────────────
const THEMES = [
  { id: 'rose', name: 'Rose', color: '#fecdd3' },
  { id: 'gold', name: 'Gold', color: '#fde68a' },
  { id: 'sage', name: 'Sage', color: '#bbf7d0' },
  { id: 'midnight', name: 'Midnight', color: '#4338ca' },
  { id: 'lavender', name: 'Lavender', color: '#ddd6fe' },
];

// ── Global State ─────────────────────────────────────────────
// State ini adalah single source of truth untuk seluruh studio
const Studio = (() => {

  let _state = {
    occasion: 'romantic',
    theme: 'rose',
    recipientName: '',
    message: '',
    photos: [],
    voiceNote: { url: null, duration: null, mimeType: null },
    password: null,
    studioPassword: null,
  };

  // ── Init ─────────────────────────────────────────────────
  const init = async () => {
    // 1. Validasi token dan muat config awal
    const isValid = await Auth.init();

    if (isValid) {
      // Token valid -> Load config awal & setup editor
      const savedConfig = Auth.getInitialConfig();
      if (savedConfig) {
        _state = { ..._state, ...savedConfig };
      }

      // Init components
      const state = Studio.getState();
      Uploader.init(state.photos || []);
      VoiceRecorder.init(state.voiceNote);
      Publisher.init();
      _updateRequirementsUI();

      // Setup Preview Iframe and Events
      Preview.update(state);

      const iframe = document.getElementById('preview-frame');
      if (iframe) {
        // Tunggu iframe load sedikit agar iframe script siap menerima message
        setTimeout(() => {
          iframe.contentWindow.postMessage({ type: 'CONFIG_UPDATE', config: state }, '*');
        }, 1000);
      }

    } else {
      // Token TIDAK ditemukan -> Lari ke Generator
      const token = Auth.getToken();
      if (!token) {
        window.location.href = '../generator/index.html';
      }
    }
  };

  // ── Helper: Update karakter counter ──────────────────────
  const _updateCharCount = (elementId, count) => {
    const el = document.getElementById(elementId);
    if (el) el.textContent = count;
  };

  // ── Helper functions defined inside IIFE but outside init ──

  // ── Toast Notification ────────────────────────────────────
  const showToast = (message, duration = 3000) => {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    toast.classList.remove('hide');

    setTimeout(() => {
      toast.classList.add('hide');
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 200);
    }, duration);
  };

  // ── Callbacks dari module lain ────────────────────────────
  const onPhotosChanged = (photos) => {
    _state.photos = photos;
    _updateRequirementsUI();
    _triggerSaveAndPreview();
  };

  const onVoiceNoteChanged = (voiceNote) => {
    _state.voiceNote = voiceNote;
    _updateRequirementsUI();
    _triggerImmediateSave();
  };

  // ── Requirements UI Update ───────────────────────────────
  const _updateRequirementsUI = () => {
    const hasPhotos = _state.photos?.length > 0;
    const hasVoice = (_state.voiceNote?.url);

    const photoBadge = document.getElementById('req-photo');
    const voiceBadge = document.getElementById('req-voice');

    if (photoBadge) {
      photoBadge.classList.toggle('text-green-600', hasPhotos);
      photoBadge.classList.toggle('text-gray-400', !hasPhotos);
      photoBadge.innerHTML = hasPhotos ? '✅ Foto Siap' : '📸 Foto min. 1';
    }

    if (voiceBadge) {
      voiceBadge.classList.toggle('text-green-600', hasVoice);
      voiceBadge.classList.toggle('text-gray-400', !hasVoice);
      voiceBadge.innerHTML = hasVoice ? '✅ Suara Siap' : '🎙️ Suara min. 1';
    }
  };

  // ── Trigger autosave + preview sync ──────────────────────
  const _triggerSaveAndPreview = () => {
    Autosave.trigger(() => ({ ..._state }));
    Preview.update(_state);
  };

  const _triggerImmediateSave = () => {
    Autosave.saveNow({ ..._state });
    Preview.update(_state);
  };

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    getState: () => ({ ..._state }),
    onPhotosChanged,
    onVoiceNoteChanged,
    showToast,
  };

})();

// ── Entry Point ───────────────────────────────────────────────
// Tunggu DOM siap, lalu init Studio
document.addEventListener('DOMContentLoaded', () => {
  Studio.init();
});
