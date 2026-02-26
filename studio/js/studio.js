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
  { id: 'birthday', label: 'Birthday', emoji: '🎂', defaultTheme: 'rosewood' },
  { id: 'family', label: 'Family', emoji: '🏡', defaultTheme: 'sage' },
  { id: 'graduation', label: 'Graduation', emoji: '🎓', defaultTheme: 'midnight' },
  { id: 'friendship', label: 'Friendship', emoji: '🤝', defaultTheme: 'pinky' },
];

// ── Data: Themes ─────────────────────────────────────────────
// Define available themes and mapping to their respective folders
const THEMES = [
  { id: 'rose', folder: 'gift', name: '🤎 Original', color: '#a0866c' },
  { id: 'rosewood', folder: 'gift-beige', name: '🪵 Rosewood', color: '#b07860' },
  { id: 'midnight', folder: 'gift-blanc', name: '🌃 Midnight', color: '#1a1e2e' },
  { id: 'sage', folder: 'gift-sage', name: '🌿 Mossy', color: '#2a3a22' },
  { id: 'pinky', folder: 'gift-pinky', name: '🌸 Magenta', color: '#f9a8d4' },
];

// ── Data: Ambients ──────────────────────────────────────────
const AMBIENTS = [
  { id: 'none', label: 'Tanpa Suasana', emoji: '🔇' },
  { id: 'custom', label: 'Upload Musik Mandiri', emoji: '🎵' },
  { id: 'rain', label: 'Rintik Hujan', emoji: '🌧️' },
  { id: 'cafe', label: 'Cozy Cafe', emoji: '☕' },
  { id: 'waves', label: 'Deburan Ombak', emoji: '🌊' },
  { id: 'fireplace', label: 'Api Unggun', emoji: '🔥' },
  { id: 'forest', label: 'Hutan Pagi', emoji: '🌲' },
  { id: 'nadin-ah', label: 'Nadin Amizah - Ah', emoji: '☁️' },
  { id: 'daniel', label: 'Daniel Caesar - Who Knows', emoji: '🕊️' },
  { id: 'mitski', label: 'Mitski - My Love Mine All Mine', emoji: '🌕' },
  { id: 'feast-nina', label: 'Feast - Nina', emoji: '🕰️' },
  { id: 'feast-tarot', label: 'Feast - Tarot', emoji: '🃏' },
];

// ── Ambient Sound URLs (same as gift page) ──────────────────
const AMBIENT_SOUNDS = {
  rain: 'https://dl.dropboxusercontent.com/scl/fi/zwol73h41qnavbduc0qgh/rain.mp3?rlkey=7d82wac3ebncezhbe2vl09alf&st=cu5gupob',
  cafe: 'https://dl.dropboxusercontent.com/scl/fi/awuth8dg03qy0ij2czddi/cafe.mp3?rlkey=5dzngx7pmnsx6utce484e65go&st=lzluvv25',
  waves: 'https://dl.dropboxusercontent.com/scl/fi/9z17yg7u3l6wc2wv9lbp0/waves.mp3?rlkey=kwle5uf8h2vyodgt257t0lnwo&st=g1a3bxx5',
  fireplace: 'https://dl.dropboxusercontent.com/scl/fi/orte59auc36wxng69iy3n/fireplace.mp3?rlkey=xohuvr0p6p1816hvp34kf387q&st=fgatk8qq',
  forest: 'https://dl.dropboxusercontent.com/scl/fi/cy1k2ru7ddi1wm96uohqv/forest.mp3?rlkey=uvsqjyjxbwhk33cmaps931bqu&st=h2b6zlzk',
  'nadin-ah': 'https://dl.dropboxusercontent.com/scl/fi/itmvna64forw61thvwb19/AH-Nadin-Amizah.mp3?rlkey=lmzmxrhjgq9qrabe3sewox21q&st=0s3baidy',
  daniel: 'https://dl.dropboxusercontent.com/scl/fi/nqpvliyw9r780t3wk4636/Daniel-Caesar-Who-Knows.mp3?rlkey=vnfwwhsmuwdyt2lrgwuhjyf9u&st=fgjxdbio',
  mitski: 'https://dl.dropboxusercontent.com/scl/fi/71ib9m69dm2ed9squj191/Mitski-My-Love-Mine-All-Mine.mp3?rlkey=i43d8ng7tbndbuflm1yw3j3r9&st=dad3r4yp',
  'feast-nina': 'https://dl.dropboxusercontent.com/scl/fi/2e0bd1yvyn9jq9vsonl9v/Feast-Nina-Official-Lyric-Video.mp3?rlkey=zc9ua50cujcdhv2dz8ibfz8bt&st=9xu4ozt0&dl=1',
  'feast-tarot': 'https://dl.dropboxusercontent.com/scl/fi/8eypewha6kurv9ffjx559/Tarot-.Feast-_-Lirik-Lagu.mp3?rlkey=jvp17k7g7mtahx0osdxstem9q&st=pe2sk4yb&dl=1'
};

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
    customAmbientUrl: null,
    customUploadCount: 0,
    password: null,
    studioPassword: null,
  };

  // ── Ambient Preview State ───────────────────────────────────
  let _previewAudio = null;
  let _previewCtx = null;
  let _previewGain = null;
  let _previewSource = null;
  let _currentPreviewId = null;

  // ── Ambient Preview Functions ───────────────────────────────
  const stopAmbientPreview = () => {
    if (_previewGain) {
      _previewGain.gain.setTargetAtTime(0, _previewCtx.currentTime, 0.2);
    }
    setTimeout(() => {
      if (_previewAudio) {
        _previewAudio.pause();
        _previewAudio.currentTime = 0;
        _previewAudio = null;
      }
      _currentPreviewId = null;
      // Re-render to update icons
      _renderAmbients(_state.ambient);
    }, 300);
  };

  const playAmbientPreview = (ambientId) => {
    // If already playing this, stop it
    if (_currentPreviewId === ambientId && _previewAudio) {
      stopAmbientPreview();
      return;
    }

    // Stop any existing preview
    if (_previewAudio) {
      stopAmbientPreview();
    }

    // Check if valid sound (Custom or Preset)
    let soundUrl = AMBIENT_SOUNDS[ambientId];
    if (ambientId === 'custom') {
      soundUrl = _state.customAmbientUrl;
    }

    if (!soundUrl) {
      if (ambientId === 'custom') {
        showToast('Pilih file musik dulu ya!');
      }
      return;
    }

    // Initialize AudioContext if needed
    if (!_previewCtx) {
      _previewCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_previewCtx.state === 'suspended') {
      _previewCtx.resume();
    }

    // Create audio element
    _previewAudio = new Audio(soundUrl);
    _previewAudio.crossOrigin = 'anonymous';

    // Check if it's a song (should not loop)
    const isSong = ['nadin-ah', 'daniel', 'mitski', 'feast-nina', 'feast-tarot', 'custom'].includes(ambientId);
    _previewAudio.loop = !isSong;

    // Setup Web Audio nodes
    _previewSource = _previewCtx.createMediaElementSource(_previewAudio);
    _previewGain = _previewCtx.createGain();
    _previewGain.gain.setValueAtTime(0, _previewCtx.currentTime);

    _previewSource.connect(_previewGain);
    _previewGain.connect(_previewCtx.destination);

    // Play with fade in
    _previewAudio.play().then(() => {
      _previewGain.gain.setTargetAtTime(0.085, _previewCtx.currentTime, 0.3);
      _currentPreviewId = ambientId;
      // Re-render to update icons
      _renderAmbients(_state.ambient);
    }).catch(err => {
      console.warn('[Studio] Preview play failed:', err);
    });

    // Auto-stop after 15 seconds for songs
    if (isSong) {
      setTimeout(() => {
        if (_currentPreviewId === ambientId) {
          stopAmbientPreview();
        }
      }, 15000);
    }
  };

  const toggleAmbientPreview = (ambientId) => {
    if (_currentPreviewId === ambientId) {
      stopAmbientPreview();
    } else {
      playAmbientPreview(ambientId);
    }
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
      _initInputs();

      // Setup Preview Iframe and Events
      Preview.update(state);
      _initMusicUpload();

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

  // ── Helper: Init Password Inputs ───────────────────────
  const _initInputs = () => {
    const inputs = {
      'input-gift-password': 'password',
      'input-studio-password': 'studioPassword'
    };

    Object.entries(inputs).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (!el) return;

      // Set initial value
      el.value = _state[key] || '';

      // Bind events
      el.addEventListener('input', (e) => {
        _state[key] = e.target.value;
        _triggerSaveAndPreview();
      });
    });
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
    // Handling for Custom Music Re-upload
    if (ambientId === 'custom' && _state.customAmbientUrl) {
      // If already active, ask if they want to CHANGE it
      if (_state.ambient === 'custom') {
        const confirmChange = confirm('Ganti lagu yang sudah ada dengan file baru?');
        if (confirmChange) {
          document.getElementById('file-input-music')?.click();
        }
        return;
      }
      // If not active, but already has a URL, just select it (don't ask)
    }

    if (ambientId === 'custom' && !_state.customAmbientUrl) {
      document.getElementById('file-input-music')?.click();
      return; // Wait for upload before selecting
    }

    if (_state.ambient === ambientId) return;

    _state.ambient = ambientId;
    _renderAmbients(ambientId);
    _triggerImmediateSave();
  };

  const onRemoveCustomMusic = (e) => {
    if (e) e.stopPropagation();
    const confirmRemove = confirm('Hapus lagu custom ini?');
    if (confirmRemove) {
      _state.customAmbientUrl = null;
      if (_state.ambient === 'custom') {
        _state.ambient = 'none';
      }
      stopAmbientPreview();
      _renderAmbients(_state.ambient);
      _triggerImmediateSave();

      const remaining = 2 - _state.customUploadCount;
      alert(`Lagu dihapus. Kamu sudah menggunakan ${_state.customUploadCount} dari 2 kesempatan upload lagu sendiri.`);
      showToast('Lagu berhasil dihapus. ✨');
    }
  };

  // ── Music Upload Logic ─────────────────────────────────────
  const _initMusicUpload = () => {
    const input = document.getElementById('file-input-music');
    if (!input) return;

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // VALIDASI QUOTA: Maks 2x
      if (_state.customUploadCount >= 2) {
        alert('Maaf, kamu sudah mencapai batas maksimal 2x upload lagu sendiri untuk kado ini.');
        input.value = '';
        return;
      }

      // VALIDASI: Max 7MB
      const MAX_SIZE = 7 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        alert('File musik terlalu besar (Maks 6MB). Silakan pilih file yang lebih kecil ya!');
        input.value = '';
        return;
      }

      // Mulai Upload
      showToast('Sedang mengupload musik... 🎶');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'audio'); // Same endpoint as voice

      try {
        const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';
        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload gagal');
        const result = await response.json();

        if (result.success) {
          _state.customAmbientUrl = result.url;
          _state.ambient = 'custom';
          _state.customUploadCount = (_state.customUploadCount || 0) + 1;
          _renderAmbients('custom');
          _triggerImmediateSave();
          showToast('Musik berhasil terpasang! ✨');
        } else {
          throw new Error(result.error || 'Server error');
        }
      } catch (err) {
        console.error('[Studio] Music upload error:', err);
        showToast('Gagal upload musik. Coba lagi.');
      } finally {
        input.value = '';
      }
    });
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
      const isPlaying = _currentPreviewId === a.id;
      const hasSound = (a.id !== 'none' && AMBIENT_SOUNDS[a.id]) || (a.id === 'custom' && _state.customAmbientUrl);

      return `
        <div class="inline-flex items-center gap-2 mb-2">
          ${hasSound ? `
            <button 
              onclick="event.stopPropagation(); Studio.toggleAmbientPreview('${a.id}')"
              class="w-7 h-7 min-w-[28px] rounded-full border transition-all flex items-center justify-center text-[9px] ${isPlaying ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-black text-gray-400 hover:text-black'}"
              title="${isPlaying ? 'Hentikan Preview' : 'Dengarkan Preview'}"
            >
              ${isPlaying ? '⏸' : '▶'}
            </button>
          ` : `<div class="w-7"></div>`}
          
          <button 
            onclick="Studio.onAmbientSelected('${a.id}')"
            class="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-left group ${isActive ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-black text-gray-500 hover:text-black'}"
          >
            <span class="text-xs">${a.emoji}</span>
            <span class="text-[9px] uppercase tracking-widest font-bold whitespace-nowrap">${a.label}</span>
            ${a.id === 'custom' && _state.customAmbientUrl ? `
              <span 
                onclick="event.stopPropagation(); Studio.onRemoveCustomMusic(event)"
                class="ml-1 w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-[8px] transition-all"
                title="Hapus Lagu"
              >✕</span>
            ` : ''}
          </button>
        </div>
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
    onRemoveCustomMusic,
    toggleAmbientPreview,
    getThemeConfig: (themeId) => {
      // Robust lookup: try direct ID match, then handle legacy IDs
      const legacyMap = {
        'beige': 'rosewood',
        'blanc': 'midnight',
        'original': 'rose'
      };
      const actualId = legacyMap[themeId] || themeId;
      return THEMES.find(t => t.id === actualId) || THEMES[0];
    },
    showToast,
  };

})();

// ── Entry Point ───────────────────────────────────────────────
// Tunggu DOM siap, lalu init Studio
document.addEventListener('DOMContentLoaded', () => {
  Studio.init();
});
