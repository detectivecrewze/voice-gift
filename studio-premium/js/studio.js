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
window.APP_CONFIG = window.APP_CONFIG || {
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

// ── Data: Camera Themes ───────────────────────────────────────
const CAMERA_THEMES = [
  { id: 'cam-silver', folder: 'camera/silver', name: '🪙 Silver', color: '#8a9aaa', preview: 'camera/silver/index.html' },
  { id: 'cam-midnight', folder: 'camera/midnight', name: '🌃 Midnight', color: '#1a1e2e', preview: 'camera/midnight/index.html' },
  { id: 'cam-mossy', folder: 'camera/mossy', name: '🌿 Mossy', color: '#2a3a22', preview: 'camera/mossy/index.html' },
  { id: 'cam-rosewood', folder: 'camera/rosewood', name: '🪵 Rosewood', color: '#b07860', preview: 'camera/rosewood/index.html' },
  { id: 'cam-magenta', folder: 'camera/magenta', name: '🌸 Magenta', color: '#f9a8d4', preview: 'camera/magenta/index.html' },
];

// ── Data: Ambients & Sounds are now provided by shared/ambient-data.js ──


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
    voiceVolume: 1.0,      // Default 100%
    ambientVolume: 0.1,    // Default 10% (background)
    password: null,
    studioPassword: null,
    polaroid_photo: null,
    polaroid_letter: '',
    requestDomain: '',
  };

  // ── Music State ──────────────────────────────────────────
  let _musicUploading = false;
  let _musicMode = 'library'; // 'library' | 'upload'
  
  // Library State
  let _libMusicTitle = '';
  let _libMusicArtist = '';
  let _libMusicCoverUrl = null;
  let _libMusicUrl = null;
  
  // Upload State
  let _uplMusicTitle = '';
  let _uplMusicUrl = null;

  // ── Music Preview State ───────────────────────────────────
  let _previewAudio = null;
  let _currentPreviewId = null;
  let _kurasiData = [];
  let _kurasiFetched = false;
  const KURASI_URL = './playlist.json';
  const MAX_MUSIC_SIZE = 10 * 1024 * 1024; // 10MB

  // ── Music Preview Functions ───────────────────────────────
  const stopMusicPreview = () => {
    if (_previewAudio) {
      _previewAudio.pause();
      _previewAudio.currentTime = 0;
      _previewAudio = null;
    }
    _currentPreviewId = null;
    _renderMusicTrack();
  };

  const playMusicPreview = (url, id) => {
    if (_currentPreviewId === id && _previewAudio) {
      stopMusicPreview();
      return;
    }
    if (_previewAudio) { _previewAudio.pause(); _previewAudio = null; }
    _previewAudio = new Audio(url);
    _previewAudio.volume = 0.5;
    _currentPreviewId = id;
    _previewAudio.play().catch(() => {});
    _previewAudio.addEventListener('ended', () => { _currentPreviewId = null; _renderMusicTrack(); });
    _renderMusicTrack();
  };

  let _kurasiFetchPromise = null;

  const fetchKurasiData = () => {
    if (_kurasiFetchPromise) return _kurasiFetchPromise;
    _kurasiFetchPromise = (async () => {
      try {
        const res = await fetch(KURASI_URL + '?t=' + Date.now());
        if (res.ok) _kurasiData = await res.json();
      } catch (e) {
        console.warn('[Studio] Gagal fetch kurasi:', e);
        _kurasiData = [];
      }
      _kurasiFetched = true;
    })();
    return _kurasiFetchPromise;
  };

  // ── Combined Mixer (Voice + Ambient) ───────────────────────
  const CombinedMixer = (() => {
    let _ctx = null;
    let _voiceAudio = null;
    let _ambientAudio = null;
    let _voiceGain = null;
    let _ambientGain = null;
    let _isPlaying = false;

    const stop = () => {
      if (!_isPlaying) return;

      const now = _ctx.currentTime;
      if (_voiceGain) _voiceGain.gain.setTargetAtTime(0, now, 0.1);
      if (_ambientGain) _ambientGain.gain.setTargetAtTime(0, now, 0.2);

      setTimeout(() => {
        if (_voiceAudio) { _voiceAudio.pause(); _voiceAudio = null; }
        if (_ambientAudio) { _ambientAudio.pause(); _ambientAudio = null; }
        _isPlaying = false;

        // Update UI state - Back to normal
        const buttons = [
          { id: 'btn-combined-preview', html: '<span class="text-xs group-hover:scale-110 transition-transform">🎧</span> <span class="text-[9px] uppercase tracking-widest font-bold text-gray-600">Dengarkan dengan Musik Latar</span>' },
          { id: 'btn-combined-preview-saved', html: '<span class="text-xs group-hover:scale-110 transition-transform">🎧</span> <span class="text-[9px] uppercase tracking-widest font-bold text-gray-600">Dengarkan dengan Musik Latar</span>' }
        ];

        buttons.forEach(b => {
          const el = document.getElementById(b.id);
          if (el) {
            el.classList.remove('btn-combined-active');
            el.innerHTML = b.html;
          }
        });
      }, 300);
    };

    const play = async () => {
      if (_isPlaying) { stop(); return; }

      const voiceUrl = VoiceRecorder.getActiveAudioUrl();
      let ambientUrl = (typeof AMBIENT_SOUNDS !== 'undefined') ? AMBIENT_SOUNDS[_state.ambient] : null;
      if (_state.ambient === 'custom') ambientUrl = _state.customAmbientUrl;

      // Skenario 1: Gak ada suara
      if (!voiceUrl) {
        showToast('Rekam suara dulu ya! 🎙️');
        return;
      }

      // Skenario 2: Gak ada suara & gak ada musik sama sekali
      if (!voiceUrl && !ambientUrl) {
        showToast('Pilih musik atau rekam suara dulu ya! 🎙️');
        return;
      }

      // Init AudioContext
      if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (_ctx.state === 'suspended') await _ctx.resume();

      // Setup Voice
      if (voiceUrl) {
        _voiceAudio = new Audio();
        _voiceAudio.crossOrigin = 'anonymous';
        _voiceAudio.src = voiceUrl;
        const voiceSource = _ctx.createMediaElementSource(_voiceAudio);
        _voiceGain = _ctx.createGain();
        _voiceGain.gain.setValueAtTime(0, _ctx.currentTime);
        voiceSource.connect(_voiceGain);
        _voiceGain.connect(_ctx.destination);
      }

      // Setup Ambient
      if (ambientUrl) {
        _ambientAudio = new Audio();
        _ambientAudio.crossOrigin = 'anonymous';
        _ambientAudio.src = ambientUrl;
        const ambientEntry = (typeof AMBIENTS !== 'undefined' ? AMBIENTS : []).find(a => a.id === _state.ambient);
        _ambientAudio.loop = ambientEntry ? !!ambientEntry.loop : !['nadin-ah', 'daniel', 'mitski', 'feast-nina', 'feast-tarot', 'custom'].includes(_state.ambient);
        const ambientSource = _ctx.createMediaElementSource(_ambientAudio);
        _ambientGain = _ctx.createGain();
        _ambientGain.gain.setValueAtTime(0, _ctx.currentTime);
        ambientSource.connect(_ambientGain);
        _ambientGain.connect(_ctx.destination);
      }

      // Start Both
      _isPlaying = true;

      const buttons = [
        document.getElementById('btn-combined-preview'),
        document.getElementById('btn-combined-preview-saved')
      ];

      buttons.forEach(btn => {
        if (btn) {
          btn.classList.add('btn-combined-active');
          btn.innerHTML = `
            <span class="text-xs animate-spin-slow">⏸</span>
            <span class="text-[9px] uppercase tracking-widest font-bold">Stop..</span>
          `;
        }
      });

      if (_ambientAudio) {
        _ambientAudio.play().then(() => {
          const now = _ctx.currentTime;
          if (_ambientGain) _ambientGain.gain.setTargetAtTime(_state.ambientVolume, now, 0.5);
        }).catch(e => console.warn('[CombinedMixer] Ambient play failed:', e));
      }

      if (_voiceAudio) {
        _voiceAudio.play().then(() => {
          const now = _ctx.currentTime;
          _voiceGain.gain.setTargetAtTime(_state.voiceVolume, now, 0.1);
        }).catch(e => {
          console.error('[CombinedMixer] Voice play failed:', e);
          if (!_ambientAudio) _handlePlayError();
        });
      }
    };

    const _handlePlayError = () => {
      _isPlaying = false;
      const buttons = [
        { id: 'btn-combined-preview', html: '<span class="text-xs group-hover:scale-110 transition-transform">🎧</span> <span class="text-[9px] uppercase tracking-widest font-bold text-gray-600">Dengarkan dengan Musik Latar</span>' },
        { id: 'btn-combined-preview-saved', html: '<span class="text-xs group-hover:scale-110 transition-transform">🎧</span> <span class="text-[9px] uppercase tracking-widest font-bold text-gray-600">Dengarkan dengan Musik Latar</span>' }
      ];

      buttons.forEach(b => {
        const el = document.getElementById(b.id);
        if (el) {
          el.classList.remove('btn-combined-active');
          el.innerHTML = b.html;
        }
      });
    };

    const updateLiveVolume = (type, val) => {
      if (!_isPlaying || !_ctx) return;
      const now = _ctx.currentTime;
      if (type === 'voice' && _voiceGain) {
        _voiceGain.gain.setTargetAtTime(val, now, 0.1);
      } else if (type === 'ambient' && _ambientGain) {
        _ambientGain.gain.setTargetAtTime(val, now, 0.1);
      }
    };

    return { play, stop, updateLiveVolume };
  })();

  // ── Legacy Ambient Converter ───────────────────────────────
  const _convertLegacyAmbient = () => {
    const aid = _state.ambient;
    if (!aid || aid === 'none' || aid === 'custom') return;
    if (typeof AMBIENT_SOUNDS !== 'undefined' && AMBIENT_SOUNDS[aid]) {
      _state.customAmbientUrl = AMBIENT_SOUNDS[aid];
      _state.ambient = 'custom';
      _musicMode = 'upload';
      _uplMusicTitle = (typeof AMBIENTS !== 'undefined' ? AMBIENTS : []).find(a => a.id === aid)?.label || aid;
      _uplMusicArtist = 'Legacy Sound';
      console.log('[Studio] Legacy ambient converted:', aid, '->', _state.customAmbientUrl);
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
        if (savedConfig.musicMode !== undefined) _musicMode = savedConfig.musicMode;
        if (savedConfig.libMusicTitle !== undefined) _libMusicTitle = savedConfig.libMusicTitle;
        if (savedConfig.libMusicArtist !== undefined) _libMusicArtist = savedConfig.libMusicArtist;
        if (savedConfig.libMusicCoverUrl !== undefined) _libMusicCoverUrl = savedConfig.libMusicCoverUrl;
        if (savedConfig.libMusicUrl !== undefined) _libMusicUrl = savedConfig.libMusicUrl;
        if (savedConfig.uplMusicTitle !== undefined) _uplMusicTitle = savedConfig.uplMusicTitle;
        if (savedConfig.uplMusicUrl !== undefined) _uplMusicUrl = savedConfig.uplMusicUrl;

        // Backward compatibility for old drafts
        if (savedConfig.musicTitle !== undefined && !savedConfig.libMusicTitle && !savedConfig.uplMusicTitle) {
          if (savedConfig.musicMode === 'upload') {
            _uplMusicTitle = savedConfig.musicTitle;
            _uplMusicUrl = savedConfig.customAmbientUrl;
          } else {
            _libMusicTitle = savedConfig.musicTitle;
            _libMusicArtist = savedConfig.musicArtist || '';
            _libMusicCoverUrl = savedConfig.musicCoverUrl || null;
            _libMusicUrl = savedConfig.customAmbientUrl;
          }
        }
      }

      // Init components
      const state = Studio.getState();
      Uploader.init(state.photos || []);
      VoiceRecorder.init(state.voiceNote);
      Publisher.init();
      _renderThemes(state.theme || 'rose');
      _convertLegacyAmbient();
      fetchKurasiData();
      _renderMusicTrack();
      // If the saved theme is a camera theme, auto-switch to camera tab
      if (state.theme && CAMERA_THEMES.some(t => t.id === state.theme)) {
        switchThemeTab('camera');
      }
      _updateRequirementsUI();
      _initInputs();

      // Setup Preview Iframe and Events
      Preview.update(state);
      // Music upload is now handled inside _renderMusicTrack binding
      _initVolumeControls();
      _initPolaroidSection();

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
      'input-studio-password': 'studioPassword',
      'input-request-domain': 'requestDomain'
    };

    Object.entries(inputs).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (!el) return;

      // Set initial value
      el.value = _state[key] || '';

      // Bind events
      el.addEventListener('input', (e) => {
        let val = e.target.value;

        // Custom handling for domain request: no spaces, no emojis, only alphanumeric/hyphen
        if (id === 'input-request-domain') {
          val = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
          e.target.value = val;
        }

        _state[key] = val;
        _triggerSaveAndPreview();
      });
    });
  };

  // ── Helper: Init Volume Sliders ────────────────────────
  const _initVolumeControls = () => {
    const controls = [
      { sliderId: 'slider-voice-vol', labelId: 'label-voice-vol', key: 'voiceVolume', type: 'voice' },
      { sliderId: 'slider-ambient-vol', labelId: 'label-ambient-vol', key: 'ambientVolume', type: 'ambient' },
      { sliderId: 'slider-voice-vol-saved', labelId: 'label-voice-vol-saved', key: 'voiceVolume', type: 'voice' },
      { sliderId: 'slider-ambient-vol-saved', labelId: 'label-ambient-vol-saved', key: 'ambientVolume', type: 'ambient' }
    ];

    controls.forEach(c => {
      const slider = document.getElementById(c.sliderId);
      const label = document.getElementById(c.labelId);
      if (!slider) return;

      // Set initial
      slider.value = _state[c.key];
      if (label) label.textContent = `${Math.round(slider.value * 100)}%`;

      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        _state[c.key] = val;
        if (label) label.textContent = `${Math.round(val * 100)}%`;

        // Sync siblings (because we have dual UI for preview/saved state)
        controls.filter(other => other.key === c.key && other.sliderId !== c.sliderId).forEach(sibling => {
          const s = document.getElementById(sibling.sliderId);
          const l = document.getElementById(sibling.labelId);
          if (s) s.value = val;
          if (l) l.textContent = `${Math.round(val * 100)}%`;
        });

        CombinedMixer.updateLiveVolume(c.type, val);
        _triggerSaveAndPreview();
      });
    });

    document.getElementById('btn-combined-preview')?.addEventListener('click', CombinedMixer.play);
    document.getElementById('btn-combined-preview-saved')?.addEventListener('click', CombinedMixer.play);
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

  const onPolaroidPhotoUploaded = (url) => {
    _state.polaroid_photo = url;
    _triggerSaveAndPreview();
  };

  const onPolaroidLetterChanged = (text) => {
    _state.polaroid_letter = text;
    _triggerSaveAndPreview();
  };

  const onPolaroidPhotoRemoved = () => {
    _state.polaroid_photo = null;
    _triggerSaveAndPreview();
  };

  const onThemeSelected = (themeId) => {
    if (_state.theme === themeId) return; // No change

    _state.theme = themeId;
    _renderThemes(themeId); // Update UI
    _triggerImmediateSave(); // Save and sync to preview
  };

  // ── Music Selection Functions ──────────────────────────────
  const onMusicSelected = (audioUrl, title, artist, coverUrl) => {
    _state.ambient = 'custom';
    _state.customAmbientUrl = audioUrl;
    stopMusicPreview();
    _renderMusicTrack();
    _triggerImmediateSave();
    showToast(`"${title || 'Lagu'}" dipilih! 🎶`);
  };

  const onMusicRemoved = () => {
    if (!confirm('Hapus lagu ini?')) return;
    _state.ambient = 'none';
    _state.customAmbientUrl = null;
    stopMusicPreview();
    _renderMusicTrack();
    _triggerImmediateSave();
    showToast('Lagu dihapus. ✨');
  };

  // ── Polaroid Section Logic ────────────────────────────────
  const _initPolaroidSection = () => {
    // Restore saved state ke UI
    const letterEl = document.getElementById('polaroid-letter-input');
    const previewWrap = document.getElementById('polaroid-photo-preview-wrap');
    const previewImg = document.getElementById('polaroid-photo-preview');
    const emptyZone = document.getElementById('polaroid-photo-zone-empty');
    const removeBtn = document.getElementById('btn-remove-polaroid-photo');
    const charCount = document.getElementById('polaroid-letter-count');

    // Restore letter
    if (letterEl && _state.polaroid_letter) {
      letterEl.value = _state.polaroid_letter;
      if (charCount) charCount.textContent = `${_state.polaroid_letter.length} / 800`;
    }

    // Restore photo preview
    if (_state.polaroid_photo && previewImg && previewWrap && emptyZone) {
      previewImg.src = _state.polaroid_photo;
      previewWrap.classList.remove('hidden');
      emptyZone.classList.add('hidden');
    }

    // Letter input handler
    if (letterEl) {
      letterEl.addEventListener('input', (e) => {
        const text = e.target.value.slice(0, 800);
        e.target.value = text;
        if (charCount) charCount.textContent = `${text.length} / 800`;
        Studio.onPolaroidLetterChanged(text);
      });
    }

    // Remove photo handler
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        _state.polaroid_photo = null;
        if (previewImg) previewImg.src = '';
        if (previewWrap) previewWrap.classList.add('hidden');
        if (emptyZone) emptyZone.classList.remove('hidden');
        Studio.onPolaroidPhotoRemoved();
      });
    }

    // File input handler
    const fileInput = document.getElementById('file-input-polaroid');
    const zone = document.getElementById('polaroid-photo-dropzone');

    const handleFile = async (file) => {
      if (!file || !file.type.startsWith('image/')) {
        showToast('Pilih file gambar ya! 📸');
        return;
      }

      showToast('Mengupload foto rahasia... 📸');

      // Gunakan fungsi upload reusable dari Uploader
      const url = await Uploader.uploadSinglePhoto(file);
      if (url) {
        _state.polaroid_photo = url;
        if (previewImg) previewImg.src = url;
        if (previewWrap) previewWrap.classList.remove('hidden');
        if (emptyZone) emptyZone.classList.add('hidden');
        Studio.onPolaroidPhotoUploaded(url);
        showToast('Foto rahasia berhasil diupload! ✨');
      } else {
        showToast('Gagal upload foto. Coba lagi.');
      }
    };

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
        fileInput.value = '';
      });
    }

    if (zone) {
      zone.addEventListener('click', () => fileInput?.click());
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('border-black'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('border-black'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('border-black');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      });
    }
  };

  // ── Music Upload Handler ─────────────────────────────────────
  const _handleMusicUpload = async (file) => {
    if (!file) return;
    if (file.size > MAX_MUSIC_SIZE) {
      showToast('File musik terlalu besar! Maksimal 10MB.');
      return;
    }
    showToast('Mengupload lagu... 🎶');
    _musicUploading = true;
    _renderMusicTrack();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'audio');

    try {
      const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl || 'https://valentine-upload.aldoramadhan16.workers.dev';
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload gagal');
      const result = await response.json();
      if (result.success) {
        _musicUploading = false;
        _uplMusicUrl = result.url;
        _uplMusicTitle = file.name.replace(/\.[^/.]+$/, '');
        _musicMode = 'upload';
        _renderMusicTrack();
        _triggerImmediateSave();
        showToast('Lagu berhasil diupload! 🎶');
      } else {
        throw new Error(result.error || 'Server error');
      }
    } catch (err) {
      console.error('[Studio] Music upload error:', err);
      _musicUploading = false;
      _renderMusicTrack();
      showToast('Gagal upload musik. Coba lagi.');
    }
  };

  // Music variables hoisted to top of file

  // ── Hint Modal Logic ────────────────────────────────────────
  const openHintModal = () => {
    const modal = document.getElementById('modal-hint');
    if (modal) {
      modal.classList.remove('hidden');
    }
  };

  const closeHintModal = () => {
    const modal = document.getElementById('modal-hint');
    if (modal) {
      modal.classList.add('hidden');
    }
  };

  // ── (Old ambient tab switching removed — now handled by _renderMusicTrack) ──

  // ── Tab Switching ──────────────────────────────────────────
  const _activeTab = { current: 'musicbox' };

  const switchThemeTab = (tabId) => {
    _activeTab.current = tabId;
    const panels = ['musicbox', 'camera'];
    const indicator = document.getElementById('tab-active-indicator');

    panels.forEach(id => {
      const panel = document.getElementById(`tab-panel-${id}`);
      const btn = document.getElementById(`tab-btn-${id}`);
      if (!panel || !btn) return;
      const isActive = id === tabId;
      panel.classList.toggle('hidden', !isActive);

      if (isActive) {
        btn.classList.add('text-black');
        btn.classList.remove('text-gray-400');
      } else {
        btn.classList.remove('text-black');
        btn.classList.add('text-gray-400');
      }
    });

    if (indicator) {
      if (tabId === 'camera') {
        indicator.style.transform = 'translateX(100%)';
      } else {
        indicator.style.transform = 'translateX(0)';
      }
    }

    // Auto-select silver when switching to camera if no camera theme is active
    if (tabId === 'camera') {
      const isCameraTheme = CAMERA_THEMES.some(t => t.id === _state.theme);
      if (!isCameraTheme) {
        onThemeSelected('cam-silver');
      }
    }
  };

  // ── Render UI ──────────────────────────────────────────────
  const _renderThemes = (activeThemeId) => {
    const mbContainer = document.getElementById('theme-selector-musicbox');
    const camContainer = document.getElementById('theme-selector-camera');

    const renderThemeBtn = (t) => {
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
    };

    if (mbContainer) mbContainer.innerHTML = (THEMES || []).map(renderThemeBtn).join('');
    if (camContainer) camContainer.innerHTML = (CAMERA_THEMES || []).map(renderThemeBtn).join('');
  };

  // ── Render Music Track (New Song Library + Upload MP3 UI) ──
  const _renderMusicTrack = () => {
    // Sync active state based on mode
    if (_musicMode === 'library') {
      _state.customAmbientUrl = _libMusicUrl;
      _state.ambient = _libMusicUrl ? 'custom' : 'none';
    } else {
      _state.customAmbientUrl = _uplMusicUrl;
      _state.ambient = _uplMusicUrl ? 'custom' : 'none';
    }

    const container = document.getElementById('music-track-container');
    if (!container) return;

    const hasLibAudio = !!_libMusicUrl;
    const hasUplAudio = !!_uplMusicUrl;
    const isLibraryMode = _musicMode === 'library';
    const isPlaying = _currentPreviewId === 'current' && _previewAudio;

    container.innerHTML = `
      <div style="padding:24px;background:#fff;border:1px solid #f3f4f6;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <h3 style="font-size:10px;font-weight:700;color:#d4a373;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:16px;">Lagu</h3>

        <!-- Tab Bar -->
        <div style="display:flex;background:#f9fafb;border-radius:8px;padding:4px;margin-bottom:20px;max-width:320px;">
          <button id="music-tab-library" style="flex:1;padding:6px 8px;font-size:8px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;border:none;cursor:pointer;border-radius:6px;transition:all 0.2s;${isLibraryMode ? 'background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.06);color:#000;' : 'background:transparent;color:#9ca3af;'}">Song Library</button>
          <button id="music-tab-upload" style="flex:1;padding:6px 8px;font-size:8px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;border:none;cursor:pointer;border-radius:6px;transition:all 0.2s;${!isLibraryMode ? 'background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.06);color:#000;' : 'background:transparent;color:#9ca3af;'}">Upload MP3</button>
        </div>

        <!-- SONG LIBRARY MODE -->
        <div id="mode-library" style="${isLibraryMode ? '' : 'display:none;'}">
          ${(isLibraryMode && hasLibAudio && _libMusicTitle) ? `
          <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#fdf9f4;border:1px solid rgba(212,163,115,0.2);border-radius:12px;margin-bottom:12px;">
            <div style="width:48px;height:48px;border-radius:8px;overflow:hidden;background:#f3f4f6;flex-shrink:0;">
              ${_libMusicCoverUrl ? `<img src="${_libMusicCoverUrl}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#d1d5db;font-size:18px;">🎵</div>'}
            </div>
            <div style="display:flex;align-items:center;justify-content:center;">
              <button id="btn-play-library-song" style="width:28px;height:28px;border-radius:50%;background:#1a1a1a;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;flex-shrink:0;">
                <span style="color:#fff;font-size:8px;margin-left:${_currentPreviewId === 'library' ? '0' : '2px'};">${_currentPreviewId === 'library' ? '⏸' : '▶'}</span>
              </button>
            </div>
            <div style="flex:1;min-width:0;">
              <p style="font-size:11px;font-weight:700;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${_libMusicTitle}</p>
              <p style="font-size:9px;color:#9ca3af;margin-top:2px;">${_libMusicArtist || ''}</p>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;">
              <button id="btn-change-library" style="font-size:8px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#d4a373;background:none;border:none;cursor:pointer;">Ganti</button>
              <button id="btn-clear-library" style="font-size:8px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;color:#d1d5db;background:none;border:none;cursor:pointer;">✕</button>
            </div>
          </div>
          ` : `
          <div style="text-align:center;padding:24px;border:2px dashed #f3f4f6;border-radius:12px;background:rgba(249,250,251,0.5);margin-bottom:12px;">
            <p style="font-size:9px;text-transform:uppercase;letter-spacing:0.2em;color:#9ca3af;font-weight:700;margin-bottom:12px;">Belum ada lagu dipilih</p>
            <button id="btn-open-library" style="font-size:8px;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;background:#000;color:#fff;padding:8px 20px;border:none;border-radius:8px;cursor:pointer;">Pilih dari Song Library</button>
          </div>
          `}
        </div>

        <!-- UPLOAD MP3 MODE -->
        <div id="mode-upload" style="${!isLibraryMode ? '' : 'display:none;'}">
          ${_musicUploading ? `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 0;text-align:center;">
            <div style="width:32px;height:32px;border:2px solid #f3f4f6;border-top-color:#d4a373;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:12px;"></div>
            <p style="font-size:8px;text-transform:uppercase;letter-spacing:0.15em;color:#d4a373;font-weight:700;">Mengupload lagu...</p>
          </div>
          ` : (!isLibraryMode && hasUplAudio) ? `
          <!-- Audio Player -->
          <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:#fdf9f4;border-radius:12px;margin-bottom:12px;border:1px solid rgba(212,163,115,0.2);">
            <button id="btn-play-preview" style="width:28px;height:28px;border-radius:50%;background:#1a1a1a;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;flex-shrink:0;">
              <span style="color:#fff;font-size:8px;margin-left:${isPlaying ? '0' : '2px'};">${isPlaying ? '⏸' : '▶'}</span>
            </button>
            <div style="flex:1;height:4px;background:#e5e7eb;border-radius:9999px;overflow:hidden;">
              <div id="audio-progress" style="height:100%;background:#d4a373;border-radius:9999px;width:0%;transition:width 0.1s;"></div>
            </div>
            <span id="audio-duration" style="font-size:9px;color:#9ca3af;font-family:monospace;flex-shrink:0;">--:--</span>
            <button id="btn-remove-uploaded" style="font-size:10px;color:#ef4444;background:none;border:none;cursor:pointer;flex-shrink:0;margin-left:4px;" title="Hapus File Audio">✕</button>
            <audio id="audio-player" style="display:none;" src="${_state.customAmbientUrl || ''}"></audio>
          </div>

          <!-- Re-upload -->
          <div style="text-align:center;margin-top:16px;">
            <button id="btn-reupload" style="font-size:8px;text-transform:uppercase;letter-spacing:0.15em;color:#9ca3af;font-weight:700;background:none;border:none;cursor:pointer;text-decoration:underline;text-underline-offset:2px;">Ganti file MP3</button>
            <input type="file" accept="audio/*,.mp3,.m4a,.wav" id="input-audio-upload" style="display:none;">
          </div>
          ` : `
          <!-- Empty Upload State -->
          <div id="audio-dropzone" style="border:2px dashed #f3f4f6;border-radius:12px;padding:32px 0;text-align:center;cursor:pointer;background:rgba(249,250,251,0.5);margin-bottom:8px;transition:all 0.2s;">
            <div style="width:40px;height:40px;border-radius:50%;background:#fff;border:1px solid #f3f4f6;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
              <svg style="width:16px;height:16px;color:#9ca3af;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
            <p style="font-size:9px;text-transform:uppercase;letter-spacing:0.2em;color:#6b7280;font-weight:700;">Klik untuk upload MP3</p>
            <p style="font-size:8px;color:#d1d5db;margin-top:4px;">Maks 10MB</p>
          </div>
          <input type="file" accept="audio/*,.mp3,.m4a,.wav" id="input-audio-upload" style="display:none;">
          `}

          <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #f3f4f6;display:${!_musicUploading ? 'block' : 'none'};">
            <button type="button" onclick="event.stopPropagation(); window.openHintModal && window.openHintModal();" style="background:none;border:none;font-size:10px;color:#9ca3af;text-decoration:underline;cursor:pointer;">Penting: Aturan Upload</button>
          </div>
        </div>
      </div>
    `;

    // Bind Events
    document.getElementById('music-tab-library')?.addEventListener('click', () => { if (_musicMode === 'library') return; _musicMode = 'library'; _renderMusicTrack(); _triggerImmediateSave(); });
    document.getElementById('music-tab-upload')?.addEventListener('click', () => { if (_musicMode === 'upload') return; _musicMode = 'upload'; _renderMusicTrack(); _triggerImmediateSave(); });
    document.getElementById('btn-open-library')?.addEventListener('click', () => openLibraryModal());
    document.getElementById('btn-change-library')?.addEventListener('click', () => openLibraryModal());
    document.getElementById('btn-play-library-song')?.addEventListener('click', () => {
      if (_libMusicUrl) playMusicPreview(_libMusicUrl, 'library');
    });
    document.getElementById('btn-clear-library')?.addEventListener('click', () => {
      _libMusicUrl = null; _libMusicTitle = ''; _libMusicArtist = ''; _libMusicCoverUrl = null;
      stopMusicPreview(); _renderMusicTrack(); _triggerImmediateSave();
    });
    const dropzone = document.getElementById('audio-dropzone');
    const audioInput = document.getElementById('input-audio-upload');
    dropzone?.addEventListener('click', () => audioInput?.click());
    document.getElementById('btn-reupload')?.addEventListener('click', () => audioInput?.click());
    audioInput?.addEventListener('change', (e) => { const f = e.target.files[0]; if (f) _handleMusicUpload(f); if (audioInput) audioInput.value = ''; });
    document.getElementById('btn-remove-uploaded')?.addEventListener('click', () => {
      if (!confirm('Hapus lagu yang sudah diupload?')) return;
      _uplMusicUrl = null; _uplMusicTitle = '';
      stopMusicPreview(); _renderMusicTrack(); _triggerImmediateSave();
    });
    // Title inputs removed
    const player = document.getElementById('audio-player');
    const plyBtn = document.getElementById('btn-play-preview');
    const progressBar = document.getElementById('audio-progress');
    const durationEl = document.getElementById('audio-duration');
    if (player && plyBtn) {
      player.addEventListener('loadedmetadata', () => { const m = Math.floor(player.duration / 60); const s = Math.floor(player.duration % 60).toString().padStart(2, '0'); if (durationEl) durationEl.textContent = `${m}:${s}`; });
      player.addEventListener('timeupdate', () => { if (player.duration && progressBar) progressBar.style.width = (player.currentTime / player.duration * 100) + '%'; });
      player.addEventListener('ended', () => {
        plyBtn.innerHTML = '<span style="color:#fff;font-size:8px;margin-left:2px;">▶</span>';
      });
      plyBtn.addEventListener('click', () => {
        if (!player.src) return;
        if (player.paused) {
          player.play();
          plyBtn.innerHTML = '<span style="color:#fff;font-size:8px;margin-left:0;">⏸</span>';
        } else {
          player.pause();
          plyBtn.innerHTML = '<span style="color:#fff;font-size:8px;margin-left:2px;">▶</span>';
        }
      });
    }
  };

  // ── Song Library Modal ────────────────────────────────────
  const openLibraryModal = () => {
    const modal = document.getElementById('music-library-modal');
    if (!modal) return;
    modal.classList.remove('hidden'); modal.style.display = 'flex';
    let selectedSong = null;
    const closeModal = () => { modal.classList.add('hidden'); modal.style.display = 'none'; };
    document.getElementById('library-modal-close')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    const confirmBtn = document.getElementById('library-confirm-btn');
    confirmBtn?.addEventListener('click', () => {
      if (!selectedSong) return;
      _musicMode = 'library'; _libMusicTitle = selectedSong.title; _libMusicArtist = selectedSong.artist; _libMusicCoverUrl = selectedSong.coverUrl || null;
      _libMusicUrl = selectedSong.audioUrl || null;
      closeModal(); _renderMusicTrack(); _triggerImmediateSave();
      showToast(`"${selectedSong.title}" dipilih! 🎶`);
    });
    const renderSongs = (songs) => {
      const list = document.getElementById('library-songs-list');
      if (!songs || songs.length === 0) { list.innerHTML = '<div style="text-align:center;padding:40px 0;font-size:9px;color:#9ca3af;">Playlist kosong</div>'; return; }
      list.innerHTML = songs.map((song, i) => `
        <div class="library-song-item" data-idx="${i}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;border-bottom:1px solid #fafafa;transition:background 0.15s;">
          <div style="width:44px;height:44px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#f3f4f6;">
            ${song.coverUrl ? `<img src="${song.coverUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<div style=\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#d1d5db;font-size:16px;\'>🎵</div>'">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#d1d5db;font-size:16px;">🎵</div>'}
          </div>
          <div style="flex:1;min-width:0;">
            <p style="font-size:11px;font-weight:700;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${song.title}</p>
            <p style="font-size:9px;color:#9ca3af;margin-top:2px;">${song.artist}</p>
          </div>
          <div class="song-check" style="width:20px;height:20px;border-radius:50%;border:2px solid #e5e7eb;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;">
            <span class="check-icon" style="font-size:8px;color:#fff;display:none;">✓</span>
          </div>
        </div>
      `).join('');
      list.querySelectorAll('.library-song-item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.dataset.idx); selectedSong = songs[idx];
          list.querySelectorAll('.library-song-item').forEach(el => {
            el.style.background = ''; const chk = el.querySelector('.song-check'); if (chk) { chk.style.background = ''; chk.style.borderColor = '#e5e7eb'; }
            const icon = el.querySelector('.check-icon'); if (icon) icon.style.display = 'none';
          });
          item.style.background = '#fdf9f4'; const chk = item.querySelector('.song-check');
          if (chk) { chk.style.background = '#d4a373'; chk.style.borderColor = '#d4a373'; }
          const icon = item.querySelector('.check-icon'); if (icon) icon.style.display = 'inline';
          if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.style.opacity = '1'; }
        });
      });
    };
    fetchKurasiData().then(() => renderSongs(_kurasiData));
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
    const s = { ..._state, musicMode: _musicMode, libMusicTitle: _libMusicTitle, libMusicArtist: _libMusicArtist, libMusicCoverUrl: _libMusicCoverUrl, libMusicUrl: _libMusicUrl, uplMusicTitle: _uplMusicTitle, uplMusicUrl: _uplMusicUrl };
    Autosave.trigger(() => s);
    Preview.update(s);
  };

  const _triggerImmediateSave = () => {
    const s = { ..._state, musicMode: _musicMode, libMusicTitle: _libMusicTitle, libMusicArtist: _libMusicArtist, libMusicCoverUrl: _libMusicCoverUrl, libMusicUrl: _libMusicUrl, uplMusicTitle: _uplMusicTitle, uplMusicUrl: _uplMusicUrl };
    Autosave.saveNow(s);
    Preview.update(s);
  };

  // ── Section Toggle (Collapsible Accordion) ────────────────────
  const toggleSection = (sectionId) => {
    const body = document.getElementById(`section-body-${sectionId}`);
    const btn = document.getElementById(`toggle-btn-${sectionId}`);
    if (!body || !btn) return;
    const isCollapsed = body.classList.toggle('collapsed');
    btn.classList.toggle('collapsed', isCollapsed);
  };

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    getState: () => ({ ..._state }),
    onPhotosChanged,
    onVoiceNoteChanged,
    onPolaroidPhotoUploaded,
    onPolaroidLetterChanged,
    onPolaroidPhotoRemoved,
    onThemeSelected,
    onMusicSelected,
    onMusicRemoved,
    openHintModal,
    closeHintModal,
    switchThemeTab,
    toggleSection,
    getThemeConfig: (themeId) => {
      // Robust lookup: try direct ID match, then handle legacy IDs
      const legacyMap = {
        'beige': 'rosewood',
        'blanc': 'midnight',
        'original': 'rose'
      };
      const actualId = legacyMap[themeId] || themeId;
      // Search music box themes first, then camera themes
      return THEMES.find(t => t.id === actualId)
        || CAMERA_THEMES.find(t => t.id === actualId)
        || THEMES[0];
    },
    showToast,
  };

})();

// ── Entry Point ───────────────────────────────────────────────
// Tunggu DOM siap, lalu init Studio
document.addEventListener('DOMContentLoaded', () => {
  Studio.init();
});