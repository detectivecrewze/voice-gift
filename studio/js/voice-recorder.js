// ============================================================
// voice-recorder.js — Voice Note Recording & Upload
// ============================================================
// Bertanggung jawab untuk:
//   1. State machine: IDLE → REQUESTING → RECORDING → PREVIEW → SAVED
//   2. MediaRecorder API dengan deteksi format per browser
//   3. Timer countdown (0:00 → 3:00)
//   4. Waveform visualizer via Web Audio API AnalyserNode
//   5. Audio player di state PREVIEW dan SAVED
//   6. Upload audio blob ke API POST /api/upload
//   7. Fallback: upload file audio (MP3, M4A)
//   8. Panduan saat mikrofon ditolak
// ============================================================
// DIPANGGIL OLEH: studio.js
// ============================================================

const VoiceRecorder = (() => {

  // ── Config ───────────────────────────────────────────────
  const MAX_DURATION_SECONDS = 180; // 3 menit

  // ── State ────────────────────────────────────────────────
  let _state = 'idle'; // idle | requesting | denied | recording | preview | saved
  let _mediaRecorder = null;
  let _audioChunks = [];
  let _audioBlob = null;
  let _audioUrl = null;       // URL blob lokal untuk preview
  let _savedUrl = null;       // URL R2 setelah upload sukses
  let _savedDuration = null;
  let _savedMimeType = null;
  let _timerInterval = null;
  let _timerSeconds = 0;
  let _analyserNode = null;
  let _waveformInterval = null;
  let _audioContext = null;
  let _stream = null;

  // ── Deteksi format audio yang didukung browser ────────────
  const _getSupportedMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',  // Chrome, Edge, Firefox desktop
      'audio/mp4',               // Safari iOS — WAJIB untuk iPhone
      'audio/ogg;codecs=opus',   // Firefox fallback
      'audio/webm',              // Chrome fallback
    ];
    return candidates.find(type => {
      try { return MediaRecorder.isTypeSupported(type); }
      catch { return false; }
    }) || '';
  };

  // ── Transisi state ────────────────────────────────────────
  const _setState = (newState) => {
    _state = newState;
    // Sembunyikan semua state panels
    ['idle', 'requesting', 'denied', 'recording', 'preview', 'saved'].forEach(s => {
      const el = document.getElementById(`voice-state-${s}`);
      if (el) el.classList.toggle('hidden', s !== newState);
    });
  };

  // ── Init ─────────────────────────────────────────────────
  const init = (savedVoiceNote = null) => {
    _bindEvents();

    // Jika ada voice note yang sudah tersimpan sebelumnya
    if (savedVoiceNote?.url) {
      _savedUrl = savedVoiceNote.url;
      _savedDuration = savedVoiceNote.duration;
      _savedMimeType = savedVoiceNote.mimeType;
      _setState('saved');
      _initSavedPlayer();
    } else {
      _setState('idle');
    }
  };

  // ── Bind Events ──────────────────────────────────────────
  const _bindEvents = () => {
    // Tombol mulai rekam
    document.getElementById('btn-start-record')
      ?.addEventListener('click', _startRecording);

    // Tombol stop rekam
    document.getElementById('btn-stop-record')
      ?.addEventListener('click', _stopRecording);

    // Tombol rekam ulang (dari state preview)
    document.getElementById('btn-rerecord')
      ?.addEventListener('click', _resetToIdle);

    // Tombol "Gunakan Ini" (konfirmasi dari preview)
    document.getElementById('btn-confirm-recording')
      ?.addEventListener('click', _uploadRecording);

    // Tombol delete (dari state saved atau preview)
    document.getElementById('btn-delete-voice')
      ?.addEventListener('click', _resetToIdle);

    // Tombol retry mikrofon
    document.getElementById('btn-retry-mic')
      ?.addEventListener('click', () => _setState('idle'));

    // Upload file audio
    document.getElementById('btn-upload-audio')
      ?.addEventListener('click', () => {
        document.getElementById('file-input-audio')?.click();
      });

    document.getElementById('file-input-audio')
      ?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) _handleAudioFileUpload(file);
        e.target.value = '';
      });
  };

  // ── Start Recording ───────────────────────────────────────
  const _startRecording = async () => {
    _setState('requesting');

    try {
      _stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('[VoiceRecorder] Mic access denied:', err);
      _setState('denied');
      return;
    }

    // Setup Web Audio API untuk waveform visualizer
    _audioContext = new (window.AudioContext || window.webkitAudioContext)();
    _analyserNode = _audioContext.createAnalyser();
    _analyserNode.fftSize = 64;
    const source = _audioContext.createMediaStreamSource(_stream);
    source.connect(_analyserNode);

    // Setup MediaRecorder
    const mimeType = _getSupportedMimeType();
    try {
      _mediaRecorder = new MediaRecorder(_stream, mimeType ? { mimeType } : {});
    } catch {
      _mediaRecorder = new MediaRecorder(_stream);
    }

    _audioChunks = [];
    _mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) _audioChunks.push(e.data);
    };
    _mediaRecorder.onstop = () => {
      _stream?.getTracks().forEach(t => t.stop()); // Matikan mikrofon SETELAH stop selesai
      _stream = null;

      const type = _mediaRecorder.mimeType || mimeType || 'audio/webm';
      _audioBlob = new Blob(_audioChunks, { type });

      // Verifikasi blob memiliki ukuran
      if (_audioBlob.size === 0) {
        console.error('[VoiceRecorder] Audio blob is empty!');
        Studio.showToast('Gagal merekam suara. Pastikan mikrofon berfungsi.');
        _resetToIdle();
        return;
      }

      _audioUrl = URL.createObjectURL(_audioBlob);
      _savedMimeType = type;
      _savedDuration = _timerSeconds;
      _setState('preview');
      _initPreviewPlayer();

      // Beri haptic feedback singkat jika didukung
      if ('vibrate' in navigator) navigator.vibrate(50);
    };

    _mediaRecorder.onerror = (err) => {
      console.error('[VoiceRecorder] MediaRecorder error:', err);
      Studio.showToast('Terjadi kesalahan saat merekam. Coba lagi.');
      _resetToIdle();
    };

    _mediaRecorder.start(200); // Kumpulkan data setiap 200ms
    _setState('recording');
    _startTimer();
    _startWaveform();

    // Tambahkan class pulsing ke tombol atau indikator jika perlu
    const recordDot = document.querySelector('#voice-state-recording .w-2');
    if (recordDot) recordDot.classList.add('animate-pulse-dot');
  };

  // ── Stop Recording ────────────────────────────────────────
  const _stopRecording = () => {
    _stopTimer();
    _stopWaveform();
    if (_mediaRecorder?.state !== 'inactive') {
      _mediaRecorder.stop();
    }

    if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
  };

  // ── Timer ─────────────────────────────────────────────────
  const _startTimer = () => {
    _timerSeconds = 0;
    _updateTimerDisplay();
    _timerInterval = setInterval(() => {
      _timerSeconds++;
      _updateTimerDisplay();
      if (_timerSeconds >= MAX_DURATION_SECONDS) {
        _stopRecording(); // Auto-stop saat batas waktu
        Studio.showToast('Batas waktu 3 menit tercapai ⏱️');
      }
    }, 1000);
  };

  const _stopTimer = () => {
    clearInterval(_timerInterval);
    _timerInterval = null;
  };

  const _updateTimerDisplay = () => {
    const el = document.getElementById('record-timer');
    if (el) el.textContent = `${_formatTime(_timerSeconds)} / ${_formatTime(MAX_DURATION_SECONDS)}`;
  };

  const _formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Waveform Visualizer ───────────────────────────────────
  const _startWaveform = () => {
    const container = document.getElementById('waveform-bars');
    if (!container || !_analyserNode) return;

    // Buat 20 bar
    container.innerHTML = Array(20).fill('<div class="waveform-bar" style="height: 4px;"></div>').join('');
    const bars = container.querySelectorAll('.waveform-bar');
    const dataArray = new Uint8Array(_analyserNode.frequencyBinCount);

    _waveformInterval = setInterval(() => {
      if (_state !== 'recording') return;
      _analyserNode.getByteFrequencyData(dataArray);
      bars.forEach((bar, i) => {
        // Ambil rata-rata dari beberapa bin frekuensi untuk tampilan yang lebih stabil
        const value = dataArray[i * 1] || 0;
        const height = Math.max(4, Math.min(48, (value / 180) * 48)); // Sensitivitas sedikit dinaikkan
        bar.style.height = `${height}px`;
      });
    }, 60);
  };

  const _stopWaveform = () => {
    clearInterval(_waveformInterval);
    _waveformInterval = null;
  };

  // ── Preview Player ────────────────────────────────────────
  const _initPreviewPlayer = () => {
    const audio = new Audio(_audioUrl);
    const playBtn = document.getElementById('btn-preview-play');
    const progressFill = document.getElementById('preview-progress-fill');
    const timeEl = document.getElementById('preview-time');

    if (playBtn) {
      playBtn.textContent = '▶';
      playBtn.onclick = () => {
        if (audio.paused) {
          audio.play();
          playBtn.textContent = '⏸';
        } else {
          audio.pause();
          playBtn.textContent = '▶';
        }
      };
    }

    audio.ontimeupdate = () => {
      if (timeEl) timeEl.textContent = _formatTime(Math.floor(audio.currentTime));
      if (progressFill && audio.duration && isFinite(audio.duration)) {
        progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
      }
    };

    audio.onended = () => {
      if (playBtn) playBtn.textContent = '▶';
      audio.currentTime = 0;
    };
  };

  // ── Saved Player ──────────────────────────────────────────
  const _initSavedPlayer = () => {
    const audio = new Audio(_savedUrl);
    const playBtn = document.getElementById('btn-saved-play');
    const progressFill = document.getElementById('saved-progress-fill');
    const timeEl = document.getElementById('saved-time');

    if (playBtn) {
      playBtn.textContent = '▶';
      playBtn.onclick = () => {
        if (audio.paused) {
          audio.play();
          playBtn.textContent = '⏸';
        } else {
          audio.pause();
          playBtn.textContent = '▶';
        }
      };
    }

    audio.ontimeupdate = () => {
      if (timeEl) timeEl.textContent = _formatTime(Math.floor(audio.currentTime));
      if (progressFill && audio.duration && isFinite(audio.duration)) {
        progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
      }
    };

    audio.onended = () => {
      if (playBtn) playBtn.textContent = '▶';
      audio.currentTime = 0;
    };
  };

  // ── Upload Recording ke API ───────────────────────────────
  const _uploadRecording = async () => {
    const btn = document.getElementById('btn-confirm-recording');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Menyimpan...';
    }

    try {
      const formData = new FormData();
      // Gunakan ekstensi yang tepat berdasarkan mimeType
      const isMp4 = _savedMimeType?.includes('mp4');
      const ext = isMp4 ? 'm4a' : 'webm';
      formData.append('file', _audioBlob, `voice_${Date.now()}.${ext}`);
      formData.append('type', 'audio');

      // HARDCODED FIX: Bypass APP_CONFIG cache issues
      const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';
      console.log(`[VoiceRecorder] FORCED URL: ${API_BASE_URL}/upload`);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      }).catch(err => {
        console.error('[VoiceRecorder] Network error:', err);
        throw new Error('Koneksi ke server gagal. Pastikan API menyala.');
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[VoiceRecorder] Server error:', response.status, errorText);
        throw new Error(`Server error (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      _savedUrl = result.url;
      _setState('saved');
      _initSavedPlayer();

      // Beri tahu studio.js
      Studio.onVoiceNoteChanged({
        url: _savedUrl,
        duration: _savedDuration,
        mimeType: _savedMimeType,
      });

      Studio.showToast('Suara berhasil disimpan! 🎙️✨');

    } catch (err) {
      console.error('[VoiceRecorder] Upload error:', err);
      Studio.showToast('Gagal menyimpan rekaman. Coba lagi.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '✓ Simpan Rekaman';
      }
    }
  };

  // ── Handle Upload File Audio ──────────────────────────────
  const _handleAudioFileUpload = async (file) => {
    const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

    const isValid = file.type.startsWith('audio/') ||
      file.name.match(/\.(mp3|m4a|wav|aac|ogg|wma)$/i);

    if (!isValid) {
      Studio.showToast('File harus berupa audio (MP3, M4A, dll.)');
      return;
    }
    if (file.size > MAX_AUDIO_SIZE) {
      Studio.showToast('File audio terlalu besar. Maks 10MB.');
      return;
    }

    Studio.showToast('Mengupload audio...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'audio');

      formData.append('type', 'audio');

      // HARDCODED FIX: Bypass APP_CONFIG cache issues
      const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';
      console.log(`[VoiceRecorder] FILE UPLOAD URL: ${API_BASE_URL}/upload`);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      _savedUrl = result.url;
      _savedMimeType = file.type;
      // TODO: Hitung durasi audio
      _setState('saved');
      _initSavedPlayer();

      Studio.onVoiceNoteChanged({
        url: _savedUrl,
        duration: _savedDuration,
        mimeType: _savedMimeType,
      });

      Studio.showToast('Audio berhasil ditambahkan! ✅');

    } catch (err) {
      console.error('[VoiceRecorder] File upload error:', err);
      Studio.showToast('Gagal mengupload audio. Coba lagi.');
    }
  };

  // ── Reset ke IDLE ─────────────────────────────────────────
  const _resetToIdle = () => {
    _stopTimer();
    _stopWaveform();
    if (_mediaRecorder?.state !== 'inactive') _mediaRecorder?.stop();
    _stream?.getTracks().forEach(t => t.stop());
    if (_audioUrl) { URL.revokeObjectURL(_audioUrl); _audioUrl = null; }
    _audioBlob = null;
    _audioChunks = [];
    _savedUrl = null;
    _savedDuration = null;
    _savedMimeType = null;
    _setState('idle');

    // Beri tahu studio.js voice note dihapus
    Studio.onVoiceNoteChanged({ url: null, duration: null, mimeType: null });
  };

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    getVoiceNote: () => ({
      url: _savedUrl,
      duration: _savedDuration,
      mimeType: _savedMimeType,
    }),
  };

})();
