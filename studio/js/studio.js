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
  };

  // ── Ambient Preview State ───────────────────────────────────
  let _previewAudio = null;
  let _previewCtx = null;
  let _previewGain = null;
  let _previewSource = null;
  let _currentPreviewId = null;

  // ── Ambient Preview Functions ───────────────────────────────
  const stopAmbientPreview = () => {
    if (_previewGain && _previewCtx) {
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
      let ambientUrl = AMBIENT_SOUNDS[_state.ambient];
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
    _previewAudio = new Audio();
    _previewAudio.crossOrigin = 'anonymous';
    _previewAudio.src = soundUrl;

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
      // If the saved theme is a camera theme, auto-switch to camera tab
      if (state.theme && CAMERA_THEMES.some(t => t.id === state.theme)) {
        switchThemeTab('camera');
      } else {
        // Pastikan section polaroid tersembunyi jika theme bukan camera
        const secretSection = document.getElementById('section-pesan-rahasia');
        if (secretSection) secretSection.classList.add('hidden');
      }
      _updateRequirementsUI();
      _initInputs();

      // Setup Preview Iframe and Events
      Preview.update(state);
      _initMusicUpload();
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

      const remaining = 5 - _state.customUploadCount;
      alert(`Lagu dihapus. Kamu sudah menggunakan ${_state.customUploadCount} dari 5 kesempatan upload lagu sendiri.`);
      showToast('Lagu berhasil dihapus. ✨');
    }
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

  // ── Music Upload Logic ─────────────────────────────────────
  const _initMusicUpload = () => {
    const input = document.getElementById('file-input-music');
    if (!input) return;

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // VALIDASI QUOTA: Maks 5x (Hidden limit, UI says 2x)
      if (_state.customUploadCount >= 5) {
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

    // Show/hide Pesan Rahasia section based on tab
    const secretSection = document.getElementById('section-pesan-rahasia');
    if (secretSection) {
      secretSection.classList.toggle('hidden', tabId !== 'camera');
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

  const _renderAmbients = (activeAmbientId) => {
    const container = document.getElementById('ambient-selector');
    if (!container) return;

    const data = (typeof AMBIENTS !== 'undefined' ? AMBIENTS : []);
    if (data.length === 0) {
      container.innerHTML = '<p class="text-[9px] text-gray-400">Memuat data...</p>';
      return;
    }

    container.innerHTML = data.map(a => {
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
    onPolaroidPhotoUploaded,
    onPolaroidLetterChanged,
    onPolaroidPhotoRemoved,
    onThemeSelected,
    onAmbientSelected,
    onRemoveCustomMusic,
    toggleAmbientPreview,
    openHintModal,
    closeHintModal,
    switchThemeTab,
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