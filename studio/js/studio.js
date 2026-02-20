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

// ── Data: Themes ─────────────────────────────────────────────// Define available themes and their mapping
const THEMES = [
  { id: 'rose', folder: 'gift', name: '🤎 Original', color: '#a0866c' },
  { id: 'pinky', folder: 'gift-pinky', name: '🌸 Magenta', color: '#f9a8d4' },
  { id: 'beige', folder: 'gift-beige', name: '🪵 Beige', color: '#c29571' },
  { id: 'sage', folder: 'gift-sage', name: '🌿 Sage', color: '#9aa98e' },
];

// ── Data: Ambients ──────────────────────────────────────────
const AMBIENTS = [
  { id: 'none', label: 'Tanpa Suasana', emoji: '🔇' },
  { id: 'rain', label: 'Rintik Hujan', emoji: '🌧️' },
  { id: 'cafe', label: 'Cozy Cafe', emoji: '☕' },
  { id: 'waves', label: 'Deburan Ombak', emoji: '🌊' },
  { id: 'fireplace', label: 'Api Unggun', emoji: '🔥' },
  { id: 'forest', label: 'Hutan Pagi', emoji: '🌲' },
  { id: 'nadin-ah', label: 'Nadin Amizah - Ah', emoji: '☁️' },
  { id: 'daniel', label: 'Daniel Caesar - Who Knows', emoji: '🕊️' },
  { id: 'mitski', label: 'Mitski - My Love Mine All Mine', emoji: '🌕' },
];

// ── Global State ─────────────────────────────────────────────
// State ini adalah single source of truth untuk seluruh studio
const Studio = (() => {

  let _state = {
    occasion: 'romantic',
    theme: 'rose', // Default new gifts to original theme
    recipientName: '',
    message: '',
    photos: [],
    voiceNote: { url: null, duration: null, mimeType: null },
    ambient: 'none',
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
      _renderThemes(state.theme || 'rose');
      _renderAmbients(state.ambient || 'none');
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

  const onThemeSelected = (themeId) => {
    if (_state.theme === themeId) return; // No change

    _state.theme = themeId;
    _renderThemes(themeId); // Update UI
    _triggerImmediateSave(); // Save and sync to preview
  };

  const onAmbientSelected = (ambientId) => {
    if (_state.ambient === ambientId) return;

    _state.ambient = ambientId;
    _renderAmbients(ambientId);
    _triggerImmediateSave();
  };

  // ── Render UI ──────────────────────────────────────────────
  const _renderThemes = (activeThemeId) => {
    const container = document.getElementById('theme-selector');
    if (!container) return;

    container.innerHTML = THEMES.map(t => {
      const isActive = t.id === activeThemeId;
      return `
        <button 
          onclick="Studio.onThemeSelected('${t.id}')"
          class="flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isActive ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-black text-gray-500 hover:text-black'}"
        >
          <span class="w-3 h-3 rounded-full border border-black/10 shadow-sm" style="background-color: ${t.color}"></span>
          <span class="text-[9px] uppercase tracking-widest font-bold">${t.name}</span>
        </button>
      `;
    }).join('');
  };

  const _renderAmbients = (activeAmbientId) => {
    const container = document.getElementById('ambient-selector');
    if (!container) return;

    container.innerHTML = AMBIENTS.map(a => {
      const isActive = a.id === activeAmbientId;
      return `
        <button 
          onclick="Studio.onAmbientSelected('${a.id}')"
          class="flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isActive ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-black text-gray-500 hover:text-black'}"
        >
          <span class="text-xs">${a.emoji}</span>
          <span class="text-[9px] uppercase tracking-widest font-bold">${a.label}</span>
        </button>
      `;
    }).join('');
  };

  // ── Requirements UI Update ───────────────────────────────
  const _updateRequirementsUI = () => {
    const photoCount = _state.photos?.length || 0;
    const hasEnoughPhotos = photoCount >= 6;
    const hasVoice = (_state.voiceNote?.url);

    const photoBadge = document.getElementById('req-photo');
    const voiceBadge = document.getElementById('req-voice');

    if (photoBadge) {
      photoBadge.classList.toggle('text-green-600', hasEnoughPhotos);
      photoBadge.classList.toggle('text-gray-600', !hasEnoughPhotos);
      photoBadge.innerHTML = hasEnoughPhotos ? '✅ Foto Siap' : `📸 Foto min. 6 (${photoCount}/6)`;
    }

    if (voiceBadge) {
      voiceBadge.classList.toggle('text-green-600', hasVoice);
      voiceBadge.classList.toggle('text-gray-600', !hasVoice);
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
    onThemeSelected,
    onAmbientSelected,
    getThemeConfig: (themeId) => THEMES.find(t => t.id === themeId) || THEMES[0], // Helper for preview/publisher
    showToast,
  };

})();

// ── Entry Point ───────────────────────────────────────────────
// Tunggu DOM siap, lalu init Studio
document.addEventListener('DOMContentLoaded', () => {
  Studio.init();
});
