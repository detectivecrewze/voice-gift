// ============================================================
// player.js — Gift Cassette Tape Player (Cream Vintage)
// ============================================================
// Bertanggung jawab untuk:
//   1. Fetch gift config dari API
//   2. Inject UI kaset tape ke #gift-cassette
//   3. Animasi foto sliding cinematic di dalam label kaset
//   4. Caption overlay di dalam foto (fade in/out)
//   5. Reel spin animation sinkron dengan play/pause
//   6. Audio: voice note + ambient mix via Web Audio API
//   7. Waveform visualizer
//   8. Password gate + access gate
// ============================================================

const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';

// ── State ────────────────────────────────────────────────────
let giftConfig = null;
let giftId = null;

// ── Show/hide states ─────────────────────────────────────────
const showState = (name) => {
  ['loading', 'access', 'error', 'password', 'gift'].forEach(s => {
    document.getElementById(`state-${s}`)?.classList.toggle('hidden', s !== name);
  });
};

// ── Bokeh particles ──────────────────────────────────────────
const setupBokeh = () => {
  const container = document.getElementById('bokeh-container');
  if (!container || container.children.length > 0) return;
  for (let i = 0; i < 7; i++) {
    const dot = document.createElement('div');
    dot.className = 'bokeh-particle';
    const size = Math.random() * 260 + 160;
    dot.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      animation-duration:${Math.random() * 4 + 5}s;
      animation-delay:${Math.random() * 3}s;
    `;
    container.appendChild(dot);
  }
};

// ── AMBIENT_SOUNDS is loaded from ../../shared/ambient-data.js ──

// ── Main Player Init ─────────────────────────────────────────
const initPlayer = (config) => {
  giftConfig = config;

  // Normalize photos: support both string[] and object[]
  const rawPhotos = config.photos || [];
  const photos = rawPhotos.map(p =>
    typeof p === 'string'
      ? { url: p, caption: '' }
      : { url: p.url || p.localPreview || '', caption: p.caption || '' }
  ).filter(p => p.url);

  if (photos.length === 0) {
    photos.push({
      url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1000&auto=format&fit=crop',
      caption: 'Tambahkan foto di Studio untuk mengganti ini ✨'
    });
  }

  const totalPhotos = photos.length;
  const voiceNote = config.voiceNote;
  const voiceVol = config.voiceVolume !== undefined ? config.voiceVolume : 1.0;
  const ambientId = config.ambient || 'none';
  const customAmbientUrl = config.customAmbientUrl || null;
  const ambientVol = config.ambientVolume !== undefined ? config.ambientVolume : 0.085;

  // Triple photos for seamless infinite loop
  const triplePhotos = [...photos, ...photos, ...photos];

  const section = document.getElementById('gift-cassette');
  if (!section) return;

  // ── Build waveform bars HTML ──────────────────────────────
  const waveformHTML = Array(24).fill('<div class="cas-waveform-bar"></div>').join('');

  // ── Build photo tray HTML ─────────────────────────────────
  const trayHTML = triplePhotos.map(p => `
    <div class="cas-photo-frame">
      <img src="${p.url}" alt="Memory" loading="lazy" decoding="async" />
    </div>
  `).join('');

  // ── Inject full cassette UI ───────────────────────────────
  section.innerHTML = `

    <!-- Brand header -->
    <div class="cas-brand-header">
      <div class="cas-brand-line"></div>
      <span class="cas-brand-text">✦ For You, Always</span>
      <div class="cas-brand-line right"></div>
    </div>

    <!-- Cassette body -->
    <div class="cas-wrap">
      <div class="cas-body">

        <div class="cas-screw tl"></div>
        <div class="cas-screw tr"></div>
        <div class="cas-screw bl"></div>
        <div class="cas-screw br"></div>

        <!-- Label = photo viewport -->
        <div class="cas-label">

          <div class="cas-label-header">
            <span class="cas-label-brand">For You, Always · Vol. I</span>
            <span class="cas-label-side">Side A · C-60</span>
          </div>

          <div class="cas-photo-viewport" id="cas-viewport">

            <div class="cas-photo-tray" id="cas-tray">
              ${trayHTML}
            </div>

            <!-- Idle overlay -->
            <div class="cas-idle-overlay" id="cas-idle">
              <div class="cas-idle-line"></div>
              <div class="cas-idle-label">press play</div>
              <div class="cas-idle-line"></div>
            </div>

            <!-- Caption inside photo -->
            <div class="cas-caption-overlay">
              <p class="cas-caption-text" id="cas-caption"></p>
            </div>

            <!-- Counter inside photo -->
            <div class="cas-slide-counter" id="cas-counter">01 / ${String(totalPhotos).padStart(2, '0')}</div>

          </div>

          <!-- Label footer: authentic cassette tape style -->
          <div class="cas-label-footer">
            <div class="cas-footer-left">
              <span class="cas-footer-side-a">A</span>
              <div class="cas-footer-dot"></div>
              <span class="cas-footer-voices">Voices of You</span>
              <div class="cas-footer-dot"></div>
              <span class="cas-footer-spec">C-60</span>
              <div class="cas-footer-line"></div>
            </div>
            <div class="cas-footer-right">
              <span class="cas-footer-nr">N.R</span>
              <div class="cas-indicators">
                <div class="cas-indicator">
                  <div class="cas-indicator-box"></div>
                  <span>IN</span>
                </div>
                <div class="cas-indicator">
                  <div class="cas-indicator-box"></div>
                  <span>OUT</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Tape window: reels + play button -->
        <div class="cas-window-shell">
          <div class="cas-window-inner">

            <div class="cas-reel-wrap">
              <div class="cas-reel spin-idle" id="cas-reel-l"></div>
              <span class="cas-reel-tag">L</span>
            </div>

            <div class="cas-controls">
              <div class="cas-tape-strip"></div>
              <button class="cas-play-btn" id="cas-play-btn" aria-label="Play / Pause">
                <div class="cas-play-icon"></div>
              </button>
              <div class="cas-tape-strip"></div>
            </div>

            <div class="cas-reel-wrap">
              <div class="cas-reel spin-idle" id="cas-reel-r"></div>
              <span class="cas-reel-tag">R</span>
            </div>

          </div>
        </div>

        <!-- Bottom ribs -->
        <div class="cas-ribs">
          <div class="cas-rib"></div>
          <div class="cas-rib"></div>
          <div class="cas-rib"></div>
          <div class="cas-rib"></div>
          <div class="cas-rib"></div>
          <div class="cas-rib"></div>
        </div>

      </div>
    </div>

    <!-- Waveform + timer below cassette -->
    <div class="cas-waveform" id="cas-waveform">
      ${waveformHTML}
    </div>
    <div class="cas-timer" id="cas-timer">0:00 / 0:00</div>

    <!-- Tape spec strip -->
    <div class="cas-spec-strip">
      <span class="cas-spec-text">Chrome EX II</span>
      <div class="cas-spec-dot"></div>
      <span class="cas-spec-text">Dolby B</span>
      <div class="cas-spec-dot"></div>
      <span class="cas-spec-text">2025</span>
    </div>

  `;

  setupBokeh();

  // ── DOM refs ──────────────────────────────────────────────
  const viewport = document.getElementById('cas-viewport');
  const tray = document.getElementById('cas-tray');
  const idleEl = document.getElementById('cas-idle');
  const captionEl = document.getElementById('cas-caption');
  const counterEl = document.getElementById('cas-counter');
  const timerEl = document.getElementById('cas-timer');
  const reelL = document.getElementById('cas-reel-l');
  const reelR = document.getElementById('cas-reel-r');
  const playBtn = document.getElementById('cas-play-btn');
  const frames = tray ? tray.querySelectorAll('.cas-photo-frame') : [];

  // ── Audio ─────────────────────────────────────────────────
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let analyser = null;
  let dataArray = null;
  let sourceNode = null;
  let voiceGain = null;
  let ambientAudio = null;
  let ambientGain = null;
  let animationId = null;

  let audio = null;
  let isPlaying = false;

  if (voiceNote && voiceNote.url) {
    audio = new Audio(voiceNote.url);
    audio.crossOrigin = 'anonymous';
  }

  const getAudioContext = () => {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => { });
    return audioCtx;
  };

  const initAmbient = () => {
    let soundUrl = (typeof AMBIENT_SOUNDS !== 'undefined') ? AMBIENT_SOUNDS[ambientId] : null;
    if (ambientId === 'custom') soundUrl = customAmbientUrl;
    if (!ambientId || ambientId === 'none' || !soundUrl) return;

    const ctx = getAudioContext();
    ambientAudio = new Audio(soundUrl);
    ambientAudio.crossOrigin = 'anonymous';
    ambientAudio.loop = true;
    const src = ctx.createMediaElementSource(ambientAudio);
    ambientGain = ctx.createGain();
    ambientGain.gain.setValueAtTime(0, ctx.currentTime);
    src.connect(ambientGain);
    ambientGain.connect(ctx.destination);
  };

  // ── Format time ──────────────────────────────────────────
  const fmt = (s) => {
    if (isNaN(s) || s == null) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const updateTimer = () => {
    if (!timerEl || !audio) return;
    let dur = audio.duration;
    if (!dur || isNaN(dur) || !isFinite(dur) || dur === 0) {
      dur = voiceNote?.duration || 0;
    }
    timerEl.textContent = fmt(audio.currentTime) + ' / ' + fmt(dur);
  };

  // ── Caption updater ───────────────────────────────────────
  let captionTimer = null;
  let currentCaption = '';

  const updateCaption = (newCaption) => {
    if (!captionEl) return;
    const text = (newCaption || '').trim();
    if (text === currentCaption) return;
    currentCaption = text;
    captionEl.classList.remove('visible');
    clearTimeout(captionTimer);
    captionTimer = setTimeout(() => {
      captionEl.textContent = text ? `"${text}"` : '';
      requestAnimationFrame(() => {
        if (text) captionEl.classList.add('visible');
      });
    }, 200);
  };

  // ── iOS Audio Warm-Up ─────────────────────────────────────
  let audioWarmed = false;
  const warmUpAudio = () => {
    if (audioWarmed) return;
    audioWarmed = true;
    getAudioContext();
    if (audio) {
      const pv = audio.volume;
      audio.volume = 0;
      audio.play()
        .then(() => {
          if (!isPlaying) { audio.pause(); audio.currentTime = 0; }
          audio.volume = pv;
        })
        .catch(() => { audio.volume = pv; });

      // Fix iOS infinite duration bug
      if (voiceNote?.url && (audio.duration === Infinity || audio.duration === 0 || isNaN(audio.duration))) {
        audio.currentTime = 1e10;
        audio.addEventListener('timeupdate', function reset() {
          if (!isPlaying) { audio.pause(); audio.currentTime = 0; }
          audio.removeEventListener('timeupdate', reset);
          updateTimer();
        }, { once: true });
      }
    }
    if (ambientAudio) {
      ambientAudio.muted = true;
      ambientAudio.play()
        .then(() => {
          if (!isPlaying) { ambientAudio.pause(); ambientAudio.currentTime = 0; }
          ambientAudio.muted = false;
        })
        .catch(() => { ambientAudio.muted = false; });
    }
  };

  // ── Visualizer setup ──────────────────────────────────────
  const setupVisualizer = (sourceAudio) => {
    const src = sourceAudio || audio;
    if (!src) return;
    const ctx = getAudioContext();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    if (!sourceNode) {
      sourceNode = ctx.createMediaElementSource(src);
      voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(0, ctx.currentTime);
      sourceNode.connect(voiceGain);
      voiceGain.connect(analyser);
      analyser.connect(ctx.destination);
    }
  };

  // ── Waveform animation ────────────────────────────────────
  let frameCounter = 0;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  const updateVisuals = () => {
    if (!isPlaying) { cancelAnimationFrame(animationId); return; }
    animationId = requestAnimationFrame(updateVisuals);
    frameCounter++;
    const skipRate = isMobile ? 6 : 4;
    if (frameCounter % skipRate !== 0) return;

    const bars = document.querySelectorAll('#cas-waveform .cas-waveform-bar');
    const nowSec = Date.now() / 1000;

    if (!analyser || !dataArray) {
      bars.forEach((bar, i) => {
        const idle = 0.12 + Math.sin(nowSec / 0.4 + i * 0.4) * 0.06;
        bar.style.transform = `scaleY(${idle})`;
        bar.style.opacity = '0.18';
      });
      if (audio) updateTimer();
      return;
    }

    analyser.getByteFrequencyData(dataArray);

    let isFallback = false;
    if (isPlaying && audio && !audio.paused && audio.currentTime > 0) {
      let total = 0;
      for (let j = 0; j < dataArray.length; j++) { total += dataArray[j]; if (total > 0) break; }
      isFallback = (total === 0);
    }

    const barCount = bars.length;
    bars.forEach((bar, i) => {
      const distToCenter = Math.abs(i - barCount / 2);
      const binIndex = Math.floor(distToCenter * 0.8) + 2;
      let val = dataArray[binIndex] || 0;
      if (isFallback) {
        const wave = Math.sin(nowSec * 5 + i * 0.4) * 0.5 + 0.5;
        val = (wave * 120) + (Math.random() * 60) + 20;
      }
      const scale = Math.min(val / 255, 1);
      bar.style.transform = `scaleY(${0.12 + scale * 0.88})`;
      bar.style.opacity = scale > 0.3 ? (0.5 + scale * 0.5) : (0.1 + scale * 0.2);
    });

    if (audio) updateTimer();
  };

  // ── Photo film advance ────────────────────────────────────
  let FRAME_W = 0;
  let offsetPx = 0;
  let rafFilmId = null;
  let isFilmPlaying = false;
  let lastActiveIdx = -1;
  const AUTO_SPEED = 1.25; // px per frame — increased speed for cinematic feel

  const initFilm = () => {
    FRAME_W = viewport ? viewport.clientWidth : 300;
    offsetPx = totalPhotos * FRAME_W; // start at middle set
    tray.style.transform = `translate3d(${-offsetPx}px,0,0)`;
    if (frames[totalPhotos]) frames[totalPhotos].classList.add('cas-frame-active');
  };

  const advanceFilm = () => {
    if (!isFilmPlaying) return;

    offsetPx += AUTO_SPEED;

    // Seamless loop: jump back when past 2nd set
    const fullSetW = totalPhotos * FRAME_W;
    if (offsetPx >= totalPhotos * 2 * FRAME_W) {
      offsetPx -= fullSetW;
    }

    tray.style.transform = `translate3d(${-offsetPx}px,0,0)`;

    // Determine active frame
    const activeIdx = Math.round(offsetPx / FRAME_W);
    const displayIdx = ((activeIdx % totalPhotos) + totalPhotos) % totalPhotos;

    if (activeIdx !== lastActiveIdx) {
      frames.forEach(f => f.classList.remove('cas-frame-active'));
      if (frames[activeIdx]) frames[activeIdx].classList.add('cas-frame-active');
      lastActiveIdx = activeIdx;

      counterEl.textContent = `${String(displayIdx + 1).padStart(2, '0')} / ${String(totalPhotos).padStart(2, '0')}`;
      updateCaption(photos[displayIdx]?.caption || '');
    }

    rafFilmId = requestAnimationFrame(advanceFilm);
  };

  // ── Start audio playback ──────────────────────────────────
  const startAudio = () => {
    if (isPlaying) return;
    if (!audio && !ambientAudio) return;
    if (audio?.ended) return;
    isPlaying = true;

    if (!sourceNode) setupVisualizer(audio || ambientAudio);
    if (!ambientAudio) initAmbient();

    const now = getAudioContext().currentTime;
    if (voiceGain) voiceGain.gain.setTargetAtTime(voiceVol, now, 0.4);
    if (audio) audio.play().catch(() => { });
    if (ambientAudio) {
      ambientAudio.play().then(() => {
        if (ambientGain) ambientGain.gain.setTargetAtTime(ambientVol, getAudioContext().currentTime, 0.5);
      }).catch(() => { });
    }

    animationId = requestAnimationFrame(updateVisuals);
  };

  // ── Stop audio playback ───────────────────────────────────
  const stopAudio = () => {
    if (!isPlaying) return;
    isPlaying = false;
    const now = getAudioContext().currentTime;
    if (voiceGain) voiceGain.gain.setTargetAtTime(0, now, 0.2);
    if (ambientGain) ambientGain.gain.setTargetAtTime(0, now, 0.3);
    setTimeout(() => {
      if (audio && !isPlaying) audio.pause();
      if (ambientAudio && !isPlaying) ambientAudio.pause();
    }, 400);
    cancelAnimationFrame(animationId);
  };

  // ── Toggle play / pause ───────────────────────────────────
  const togglePlay = () => {
    warmUpAudio();
    getAudioContext();

    if (!isFilmPlaying) {
      // START
      isFilmPlaying = true;
      idleEl?.classList.add('hidden');
      reelL?.classList.remove('spin-idle'); reelL?.classList.add('spin');
      reelR?.classList.remove('spin-idle'); reelR?.classList.add('spin');
      playBtn?.classList.add('playing');
      startAudio();
      rafFilmId = requestAnimationFrame(advanceFilm);
    } else {
      // PAUSE
      isFilmPlaying = false;
      reelL?.classList.remove('spin'); reelL?.classList.add('spin-idle');
      reelR?.classList.remove('spin'); reelR?.classList.add('spin-idle');
      playBtn?.classList.remove('playing');
      stopAudio();
      cancelAnimationFrame(rafFilmId);
    }
  };

  // ── Bind play button ──────────────────────────────────────
  playBtn?.addEventListener('click', togglePlay);

  // ── Audio event listeners ─────────────────────────────────
  if (audio) {
    audio.addEventListener('loadedmetadata', updateTimer);
    audio.addEventListener('timeupdate', updateTimer);
    audio.addEventListener('ended', () => {
      isPlaying = false;
      // Note: We DO NOT stop isFilmPlaying, reelL spin, or rafFilmId here.
      // This allows the photos to continue looping infinitely like a cinema reel.
      playBtn?.classList.remove('playing');
      cancelAnimationFrame(animationId); // Stop voice waveform only
    });
  }

  // ── Page visibility: resume on return ────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isFilmPlaying) {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (audio && audio.paused && !audio.ended) audio.play().catch(() => { });
      if (ambientAudio && ambientAudio.paused) ambientAudio.play().catch(() => { });
    }
  });

  // ── Init film position after layout ──────────────────────
  if (document.readyState === 'complete') {
    initFilm();
  } else {
    window.addEventListener('load', initFilm);
  }
  setTimeout(initFilm, 80);
};

// ── Fetch gift config ─────────────────────────────────────────
const loadGift = async (id) => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const cacheBuster = urlParams.get('t') ? `&t=${urlParams.get('t')}` : '';
    const endpoint = `${API_BASE_URL}/get-config?id=${encodeURIComponent(id)}${cacheBuster}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik

    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('not found');
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[Cassette] Fetch timeout');
    }
    return null;
  }
};

const handleAfterLoad = () => {
  showState('gift');
  if (giftConfig) initPlayer(giftConfig);
};

// ── Entry Point ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const isPreview = params.get('preview') === 'true';
  let giftIdParam = params.get('to');

  // Fallback: baca gift ID dari path (e.g. /cassette/cream/GIFT_ID)
  if (!giftIdParam) {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart !== 'index.html') {
      giftIdParam = lastPart;
    }
  }

  // Default demo config (no API, for local dev)
  giftConfig = {
    photos: [],
    ambient: 'none',
    voiceNote: null,
  };

  if (giftIdParam) {
    showState('loading');
    const fetched = await loadGift(giftIdParam);

    if (fetched) {
      giftConfig = fetched;
      if (giftConfig.password && !isPreview) {
        showState('password');
      } else {
        handleAfterLoad();
      }
    } else {
      showState('error');
    }
  } else {
    // No ID in URL — show access input
    showState('access');
  }

  // ── Password gate ──────────────────────────────────────
  const pwdBtn = document.getElementById('btn-unlock');
  if (pwdBtn) {
    const tryPassword = async () => {
      const input = document.getElementById('password-input');
      const pwd = input?.value?.trim();
      if (!pwd) return;

      pwdBtn.textContent = 'Membuka...';
      pwdBtn.disabled = true;

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const cacheBuster = urlParams.get('t') ? `&t=${urlParams.get('t')}` : '';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${API_BASE_URL}/get-config?id=${giftIdParam}${cacheBuster}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        if (data && data.password === pwd) {
          giftConfig = data;
          handleAfterLoad();
        } else {
          const errEl = document.getElementById('password-error');
          errEl?.classList.remove('hidden');
          input?.classList.add('shake');
          setTimeout(() => input?.classList.remove('shake'), 400);
          if (input) { input.value = ''; input.focus(); }
        }
      } catch (err) {
        console.error('[Cassette] Password unlock error', err);
        const errEl = document.getElementById('password-error');
        if (errEl) {
          errEl.textContent = err.name === 'AbortError' ? 'Koneksi timeout. Coba lagi.' : 'Password salah, coba lagi.';
          errEl.classList.remove('hidden');
        }
      } finally {
        pwdBtn.textContent = 'Buka Hadiah';
        pwdBtn.disabled = false;
      }
    };
    pwdBtn.addEventListener('click', tryPassword);
    document.getElementById('password-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryPassword();
    });
  }

  // ── Access gate (Manual Code Entry) ──────────────────
  const accessBtn = document.getElementById('btn-access-go');
  if (accessBtn) {
    const tryAccess = async () => {
      const inputEl = document.getElementById('access-id-input');
      const id = inputEl?.value?.trim();
      if (!id) return;

      accessBtn.textContent = 'Mengecek...';
      accessBtn.disabled = true;

      // Update URL silently without refreshing so loadGift can catch `?to=` natively if needed later
      const newUrl = `${window.location.origin}${window.location.pathname}?to=${id}`;
      window.history.pushState({ path: newUrl }, '', newUrl);

      const fetched = await loadGift(id);

      accessBtn.textContent = 'Buka Kado';
      accessBtn.disabled = false;

      if (!fetched) {
        alert('Kado tidak ditemukan. Cek kembali kode kado-mu.');
        return;
      }
      giftConfig = fetched;
      if (giftConfig.password) {
        showState('password');
      } else {
        handleAfterLoad();
      }
    };

    accessBtn.addEventListener('click', tryAccess);
    document.getElementById('access-id-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryAccess();
    });
  }
});
