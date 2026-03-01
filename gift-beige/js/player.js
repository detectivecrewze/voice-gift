const VoicePlayer = (() => {

  // ── Module-level Singleton AudioContext ──────────────────────
  // Prevents AudioContext leak: browser limits ~6-20 contexts per tab.
  // Previously, every call to init() created a new AudioContext that was
  // never closed. Now all calls share one context.
  const _AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  let _sharedAudioCtx = null;

  const _getSharedAudioContext = () => {
    if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
      _sharedAudioCtx = new _AudioCtxClass();
    }
    if (_sharedAudioCtx.state === 'suspended') {
      _sharedAudioCtx.resume().catch(() => { });
    }
    return _sharedAudioCtx;
  };

  // FIX ROOT CAUSE: Terima audio element yang sudah di-preload dari handleAfterLoad
  // agar buffer yang sudah terkumpul tidak terbuang sia-sia saat membuat Audio() baru
  const init = (voiceNote, containerEl, allPhotos, ambientId = 'none', customAmbientUrl = null, voiceVol = 1.0, ambientVol = 0.085, preloadedAudio = null) => {
    let audio;
    if (preloadedAudio) {
      audio = preloadedAudio;
    } else {
      audio = new Audio();
      if (voiceNote?.url) {
        audio.crossOrigin = 'anonymous';
        audio.src = voiceNote.url;
      }
    }
    let isPlaying = false;
    let lastRotationTime = 0;
    let lastAngle = null;
    let totalCrankAngle = 0;
    let lastClickRotation = 0;
    let lastMoveTime = 0;          // Fix 1: Throttle touchmove to ~30fps
    let lastClickTime = 0;         // Fix 6: Throttle click sounds
    let frameCounter = 0;          // Fix 2: Proper frame-skip counter
    let stopTimeoutId = null;      // Fix 7: Conditional stop timeout
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    // Use volumes from config if available
    const VOICE_VOL = voiceNote?.voiceVolume !== undefined ? voiceNote.voiceVolume : voiceVol;
    const AMBIENT_VOL = voiceNote?.ambientVolume !== undefined ? voiceNote.ambientVolume : ambientVol;

    // --- Sound Engine & Haptics ---
    // audioCtx is a local alias to the shared singleton — kept for compatibility
    // with 20+ references inside init() (startPlaying, stopPlaying, etc.)
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;
    let sourceNode = null;
    let voiceGain = null;
    let animationId = null;

    // ── DOM Utilities ────────────────────────────────────────
    const showState = (name) => {
      ['loading', 'preloading', 'access', 'error', 'password', 'gift'].forEach(s => {
        document.getElementById(`state-${s}`)?.classList.toggle('hidden', s !== name);
      });
    };

    // ── Centralized AudioContext Helper ───────────────────────
    // Uses the module-level singleton to prevent AudioContext leak
    const getAudioContext = () => {
      audioCtx = _getSharedAudioContext();
      return audioCtx;
    };

    const playMechanicalClick = () => {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);

      // Muted: changed gain from 0.04 to 0 as requested by user
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);

      // Haptic Feedback - wrapped in try-catch for iOS Safari
      try {
        if (navigator.vibrate) navigator.vibrate(5);
      } catch (e) { }
    };

    // --- Ambient Soundscapes ---
    const AMBIENT_SOUNDS = {
      rain: 'https://cdn.for-you-always.my.id/1772227486439-blw2aj.mp3',
      cafe: 'https://cdn.for-you-always.my.id/1772227483969-rc084e.mp3',
      waves: 'https://cdn.for-you-always.my.id/1772227486868-kl95f6.mp3',
      fireplace: 'https://cdn.for-you-always.my.id/1772227484891-mv1lcl.mp3',
      forest: 'https://cdn.for-you-always.my.id/1772227485518-wlidq.mp3',
      'nadin-ah': 'https://cdn.for-you-always.my.id/1772227383860-qvi027.mp3',
      daniel: 'https://cdn.for-you-always.my.id/1772227226601-vibhce.mp3',
      mitski: 'https://cdn.for-you-always.my.id/1772227092846-paa3bd.mp3',
      'feast-nina': 'https://cdn.for-you-always.my.id/1772227124627-yaxp9g.mp3',
      'feast-tarot': 'https://cdn.for-you-always.my.id/1772227035785-lvjl94.mp3'
    };

    let ambientAudio = null;
    let ambientGain = null;
    let ambientSource = null;

    const initAmbientSound = () => {
      let soundUrl = AMBIENT_SOUNDS[ambientId];
      if (ambientId === 'custom') soundUrl = customAmbientUrl;

      if (!ambientId || ambientId === 'none' || !soundUrl) {
        return;
      }
      const ctx = getAudioContext();
      if (!ctx) return;

      ambientAudio = new Audio(soundUrl);
      ambientAudio.crossOrigin = 'anonymous';

      // Only loop nature SFX, not songs
      const isSong = ['nadin-ah', 'daniel', 'mitski', 'feast-nina', 'feast-tarot', 'custom'].includes(ambientId);
      ambientAudio.loop = !isSong;

      ambientSource = ctx.createMediaElementSource(ambientAudio);
      ambientGain = ctx.createGain();
      ambientGain.gain.setValueAtTime(0, ctx.currentTime);

      ambientSource.connect(ambientGain);
      ambientGain.connect(ctx.destination);

      ambientAudio.muted = true;
      ambientAudio.play().then(() => {
        ambientAudio.pause();
        ambientAudio.currentTime = 0;
        // Don't unmute yet! startPlaying will handle it
      }).catch(() => { });
    };

    // --- Continuous Mechanical Soundscape (Vinyl Crackle & Whir) ---
    let noiseSource = null;
    let noiseGain = null;

    const initMechanicalSoundscape = () => {
      const ctx = getAudioContext();
      if (!ctx) return;

      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        // Muted: Vinyl Crackle & Whir removed as requested by user
        data[i] = 0;
      }

      noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, ctx.currentTime);

      noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start();
    };

    // Viewport width in CSS is 240px (Desktop) / 200px (Mobile)
    let VIEW_WIDTH = isMobile ? 200 : 240;

    // For Infinite Loop: Clone the list of photos
    // Normalisasi: pastikan semua p adalah object dengan p.url
    const normalizedPhotos = (allPhotos || []).map(p => {
      if (typeof p === 'string') return { url: p, caption: '' };
      return {
        url: p.url || p.localPreview || '',
        caption: p.caption || ''
      };
    }).filter(p => p.url);

    const displayPhotos = normalizedPhotos.length > 0 ? normalizedPhotos : [{ url: '../assets/1.jpg' }];
    const totalPhotos = displayPhotos.length;

    // Double for seamless looping (hanya perlu 1 extra di akhir untuk wrap-around)
    const doublePhotos = [...displayPhotos, displayPhotos[0]];

    const photosMarkup = doublePhotos.map((p, idx) => `
      <div class="printer-photo">
        <img src="${p.url}" alt="Memory">
      </div>
    `).join('');

    containerEl.innerHTML = `
      <div class="music-box-container" id="music-box">
        <div class="console-screw top-left"></div>
        <div class="console-screw top-right"></div>
        <div class="console-screw bottom-left"></div>
        <div class="console-screw bottom-right"></div>

        <!-- Metallic Nameplate Plate (Aesthetic Only) -->
        <div class="console-plate"></div>
        
        <div class="printer-viewport" id="viewport">
          <div class="light-leak-overlay"></div>
          <div class="glass-lens-overlay"></div>
          <div class="analog-noise"></div>
          <div class="printer-tray" id="tray">
            ${photosMarkup}
          </div>
          <div class="lcd-idle-overlay" id="lcd-idle-overlay">
            <div class="lcd-idle-line"></div>
            <div class="lcd-idle-label">press play</div>
            <div class="lcd-idle-line"></div>
          </div>
          <div class="printer-slot"></div>

          <!-- Caption overlay — melayang di bawah foto, di dalam viewport -->
          <div id="photo-caption" style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 12px;
            z-index: 22;
            padding: 28px 14px 12px;
            background: linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
            font-family: inherit;
            font-size: 9.5px;
            font-style: italic;
            letter-spacing: 0.12em;
            line-height: 1.65;
            text-align: center;
            color: rgba(255,255,255,0.82);
            text-shadow: 0 1px 4px rgba(0,0,0,0.6);
            opacity: 0;
            transform: translateY(4px);
            transition: opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1);
            pointer-events: none;
            box-sizing: border-box;
            border-radius: 0 0 32px 32px;
          "></div>
        </div>

        <div class="music-box-info">
          <div class="music-box-waveform" id="waveform">
            ${Array(24).fill('<div class="waveform-bar"></div>').join('')}
          </div>

          <div class="music-box-timer">
            <span id="v-current">0:00</span>
            <div class="time-divider"></div>
            <span id="v-total">0:00</span>
          </div>

          <button class="auto-play-btn" id="auto-play-toggle">
            <span class="auto-play-icon">▶</span>
            <span class="auto-play-text">AUTO</span>
          </button>
        </div>

        <div class="music-box-crank-area">
          <div class="crank-handle-wrapper" id="crank-handle">
            <div class="crank-base"></div>
            <div class="crank-arm" id="crank-arm">
              <div class="crank-knob"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const box = containerEl.querySelector('#music-box');
    const handle = containerEl.querySelector('#crank-handle');
    const arm = containerEl.querySelector('#crank-arm');
    const tray = containerEl.querySelector('#tray');
    const bars = containerEl.querySelectorAll('.waveform-bar');
    const currentEl = containerEl.querySelector('#v-current');
    const totalEl = containerEl.querySelector('#v-total');
    const captionEl = containerEl.querySelector('#photo-caption');

    // ── Caption Updater ───────────────────────────────────────
    let captionTimeout = null;
    let currentCaptionText = '';
    const updateCaption = (newCaption) => {
      if (!captionEl) return;
      const text = (newCaption || '').trim();

      // Jangan animasi kalau teksnya sama
      if (text === currentCaptionText) return;
      currentCaptionText = text;

      // Slide down + fade out dulu
      captionEl.style.opacity = '0';
      captionEl.style.transform = 'translateY(6px)';
      clearTimeout(captionTimeout);

      captionTimeout = setTimeout(() => {
        captionEl.textContent = text ? `"${text}"` : '';
        // Slide up + fade in jika ada teks
        requestAnimationFrame(() => {
          captionEl.style.opacity = text ? '1' : '0';
          captionEl.style.transform = text ? 'translateY(0px)' : 'translateY(6px)';
        });
      }, 200);
    };

    // ── Performance: Cache DOM elements ──────────────────────────
    const photoEls = tray.querySelectorAll('.printer-photo');
    let lastActivePhotoIndex = -1;

    // --- Helper Functions (Defined before use) ---
    function setupBokeh() {
      const container = document.getElementById('bokeh-container');
      if (!container || container.children.length > 0) return;

      for (let i = 0; i < 4; i++) {
        const dot = document.createElement('div');
        dot.className = 'bokeh-particle';
        const size = Math.random() * 300 + 200;
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.left = `${Math.random() * 100}%`;
        dot.style.top = `${Math.random() * 100}%`;
        dot.style.transitionDuration = `${Math.random() * 3 + 2}s`;
        container.appendChild(dot);
      }
    }

    function setupVisualizer() {
      const ctx = getAudioContext();
      if (!ctx) return;

      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);

      if (!sourceNode) {
        sourceNode = ctx.createMediaElementSource(audio);
        voiceGain = ctx.createGain();
        voiceGain.gain.setValueAtTime(0, ctx.currentTime);
        sourceNode.connect(voiceGain);
        voiceGain.connect(analyser);
        analyser.connect(ctx.destination);
      }
    }

    let cachedParticles = null;

    function updateVisuals() {
      if (!isPlaying) {
        cancelAnimationFrame(animationId);
        return;
      }

      animationId = requestAnimationFrame(updateVisuals);

      frameCounter++;
      const skipRate = isMobile ? 3 : 2;
      if (frameCounter % skipRate !== 0) return;

      // FIX: Guard analyser — jika Web Audio gagal, tampilkan animasi idle sederhana
      if (!analyser || !dataArray) {
        for (let i = 0; i < bars.length; i++) {
          const idleScale = 0.125 + Math.sin(Date.now() / 400 + i * 0.4) * 0.06;
          bars[i].style.transform = `scaleY(${idleScale})`;
          bars[i].style.opacity = '0.18';
        }
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      const now = Date.now();
      const nowSec = now / 1000;

      for (let i = 0; i < bars.length; i++) {
        const distanceToCenter = Math.abs(i - 12);
        const binIndex = Math.floor(distanceToCenter * 0.8) + 2;
        const val = dataArray[binIndex] || 0;

        const scaleFactor = (val / 255);
        bars[i].style.transform = `scaleY(${0.125 + scaleFactor * 0.875})`;
        bars[i].style.opacity = scaleFactor > 0.3 ? (0.5 + scaleFactor * 0.5) : (0.1 + scaleFactor * 0.2);
      }

      if (frameCounter % 4 === 0) {
        const avgVolume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        if (!cachedParticles) {
          cachedParticles = document.querySelectorAll('.bokeh-particle');
        }

        for (let idx = 0; idx < cachedParticles.length; idx++) {
          const p = cachedParticles[idx];
          const move = (avgVolume / 255) * (30 + idx * 5);
          const scale = 1 + (avgVolume / 255) * 0.5;
          p.style.transform = `translate3d(${Math.sin(nowSec + idx) * move}px, ${Math.cos(nowSec + idx) * move}px, 0) scale(${scale})`;
          p.style.opacity = 0.03 + (avgVolume / 255) * 0.07;
        }
      }
    }

    const updateDuration = () => {
      let dur = audio.duration;
      // Fallback ke durasi yang disimpan di config jika browser gagal baca metadata (misal: WebM)
      if (!dur || isNaN(dur) || !isFinite(dur) || dur === 0) {
        dur = voiceNote.duration;
      }
      totalEl.textContent = fmt(dur);
    };

    const fmt = (s) => {
      if (isNaN(s)) return '0:00';
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // Warm up audio for iOS/Safari & WebM Duration Hack
    let audioWarmed = false;
    const warmUpAudio = () => {
      if (audioWarmed) return;
      audioWarmed = true;

      getAudioContext();

      // Silent unlock for iOS — set volume 0 sementara, lalu kembalikan
      const prevVolume = audio.volume;
      audio.volume = 0;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = prevVolume; // Kembalikan volume setelah unlock
      }).catch(() => {
        audio.volume = prevVolume; // Kembalikan juga kalau gagal
      });

      // WebM Duration Hack - perform while muted, ONLY if an audio source exists
      if (voiceNote?.url && (audio.duration === Infinity || audio.duration === 0 || isNaN(audio.duration))) {
        audio.currentTime = 1e10;
        audio.addEventListener('timeupdate', function reset() {
          audio.pause();
          audio.currentTime = 0;
          audio.removeEventListener('timeupdate', reset);
          updateDuration();
        }, { once: true });
      }

      if (!noiseSource) initMechanicalSoundscape();
      if (!analyser) setupVisualizer();
      if (!ambientAudio) initAmbientSound();
    };

    setupBokeh();

    if (audio.readyState >= 1) updateDuration();
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('progress', updateDuration); // Bantu percepet kalkulasi

    audio.addEventListener('timeupdate', () => {
      currentEl.textContent = fmt(audio.currentTime);
      // Jika display total masih 0:00, coba update lagi dari config
      if (totalEl.textContent === '0:00') updateDuration();
    });

    audio.addEventListener('ended', () => {
      audio.currentTime = 0;
      // Loop voice note: restart playback if audio is still active
      if (isPlaying) {
        audio.play().catch(() => { });
      }
    });

    // ── Interaction Logic (Infinite) ──────────────────────────
    let isDragging = false;
    let visualCrankAngle = 0;

    // ── Auto-Play Logic ──
    let isAutoPlaying = false;
    let autoPlayRafId = null;
    let AUTO_SPEED = 3.3; // Narrative speed for photo transitions
    const toggleBtn = containerEl.querySelector('#auto-play-toggle');

    // Add tutorial pulse on load
    if (toggleBtn) {
      toggleBtn.classList.add('tutorial-pulse');
    }

    function autoPlayLoop() {
      if (!isAutoPlaying) return;

      // 1. Increment rotations (1:1 sync)
      visualCrankAngle += AUTO_SPEED;
      totalCrankAngle += AUTO_SPEED;

      // 2. Visually rotate crank
      arm.style.transform = `rotate(${visualCrankAngle}deg) translateZ(0)`;

      // 3. Move photos
      const rawSlide = (totalCrankAngle / 720) * VIEW_WIDTH;
      const fullSetWidth = totalPhotos * VIEW_WIDTH;
      // Gunakan modulo ganda untuk memastikan range selalu [0, fullSetWidth)
      const loopSlide = ((rawSlide % fullSetWidth) + fullSetWidth) % fullSetWidth;

      tray.style.transform = `translate3d(-${loopSlide}px, 0, 0)`;

      // 4. Update active photo index
      const activeIndex = Math.round(loopSlide / VIEW_WIDTH);
      if (activeIndex !== lastActivePhotoIndex && photoEls[activeIndex]) {
        if (lastActivePhotoIndex >= 0 && photoEls[lastActivePhotoIndex]) {
          photoEls[lastActivePhotoIndex].classList.remove('is-active');
        }
        photoEls[activeIndex].classList.add('is-active');
        lastActivePhotoIndex = activeIndex;
        // Update caption
        const currentCaption = displayPhotos[activeIndex % displayPhotos.length]?.caption;
        updateCaption(currentCaption);
      }

      // 5. Trigger clicks & audio
      if (Math.abs(totalCrankAngle - lastClickRotation) > 15) {
        const clickNow = performance.now();
        if (clickNow - lastClickTime > 50) {
          playMechanicalClick();
          lastClickTime = clickNow;
        }
        lastClickRotation = totalCrankAngle;
      }

      startPlaying(); // keeps audio & visualizer running

      // Loop
      autoPlayRafId = requestAnimationFrame(autoPlayLoop);
    }

    let countdownWasStarted = false;

    const hideIdleOverlay = () => {
      const idleOverlay = document.getElementById('lcd-idle-overlay');
      if (idleOverlay && !idleOverlay.classList.contains('hidden')) {
        idleOverlay.classList.add('hidden');
      }
    };

    const runCountdownThenPlay = () => {
      if (countdownWasStarted) {
        const oldOverlay = document.getElementById('countdown-overlay');
        if (oldOverlay) oldOverlay.remove();
        hideIdleOverlay();
        autoPlayLoop();
        return;
      }

      countdownWasStarted = true;

      const viewport = document.getElementById('viewport');
      if (!viewport) { autoPlayLoop(); return; }

      const sfx = new Audio('https://cdn.for-you-always.my.id/1772227895645-j1jcgl.mp3?v=2');
      sfx.volume = 0.3;
      sfx.crossOrigin = 'anonymous';

      const startVisuals = () => {
        hideIdleOverlay();
        if (document.getElementById('countdown-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'countdown-overlay';
        overlay.style.cssText = `
          position: absolute; inset: 0; z-index: 100;
          display: flex; align-items: center; justify-content: center;
          background: #000; border-radius: 3px; overflow: hidden;
        `;
        const numEl = document.createElement('div');
        numEl.style.cssText = `
          font-family: var(--font-display); font-size: 36px; font-weight: 300;
          color: rgba(255,255,255,0.9); letter-spacing: 0.15em;
          text-shadow: 0 0 12px rgba(255,255,255,0.3);
          opacity: 0; transform: scale(0.95);
          transition: opacity 0.4s ease, transform 0.4s ease;
        `;
        overlay.appendChild(numEl);
        viewport.appendChild(overlay);

        const totalDur = sfx.duration || 4.0;
        const stepMs = (totalDur * 1000) / 4;

        sfx.play().catch(e => console.log('SFX blocked:', e));

        let count = 3;
        const tick = () => {
          if (count > 0) {
            numEl.textContent = count;
            requestAnimationFrame(() => {
              numEl.style.opacity = '1';
              numEl.style.transform = 'scale(1)';
            });
            count--;
            setTimeout(() => {
              numEl.style.opacity = '0';
              numEl.style.transform = 'scale(0.95)';
              setTimeout(tick, stepMs * 0.1);
            }, stepMs * 0.9);
          } else {
            overlay.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 48;
            canvas.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;opacity:0.6;';
            overlay.appendChild(canvas);
            const ctx2d = canvas.getContext('2d');

            const staticStartTime = Date.now();
            const draw = () => {
              const data = ctx2d.createImageData(64, 48);
              for (let i = 0; i < data.data.length; i += 4) {
                const v = Math.random() * 255;
                data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
                data.data[i + 3] = 255;
              }
              ctx2d.putImageData(data, 0, 0);

              if (Date.now() - staticStartTime < stepMs) {
                requestAnimationFrame(draw);
              } else {
                overlay.remove();
                autoPlayLoop();
              }
            };
            draw();
          }
        };
        tick();
      };

      if (sfx.readyState >= 1) {
        startVisuals();
      } else {
        sfx.addEventListener('canplay', startVisuals, { once: true });
        sfx.addEventListener('error', startVisuals, { once: true });
        setTimeout(() => { if (!document.getElementById('countdown-overlay')) startVisuals(); }, 3000);
      }
    };

    if (toggleBtn) {
      const toggleAutoPlay = () => {
        // Remove tutorial pulse on first interaction
        if (toggleBtn) {
          toggleBtn.classList.remove('tutorial-pulse');
        }

        isAutoPlaying = !isAutoPlaying;
        toggleBtn.classList.toggle('is-active', isAutoPlaying);

        warmUpAudio(); // Fix: Initialize AudioContext and Visualizer for Auto-Play
        getAudioContext();

        if (isAutoPlaying) {
          runCountdownThenPlay();
        } else {
          cancelAnimationFrame(autoPlayRafId);
          stopPlaying();
        }
      };

      toggleBtn.addEventListener('click', toggleAutoPlay);
    }

    const startDrag = (e) => {
      // Hide idle overlay jika user drag manual lebih awal
      hideIdleOverlay();
      countdownWasStarted = true;

      // Manual Override: Jika auto-play aktif, matikan saat user pegang tuas
      if (isAutoPlaying) {
        isAutoPlaying = false;
        if (toggleBtn) toggleBtn.classList.remove('is-active');
        cancelAnimationFrame(autoPlayRafId);
      }

      isDragging = true;
      lastAngle = null;

      // FIX: Gunakan getAudioContext() saja, jangan buat manual AudioCtx baru
      // Sebelumnya ada duplikasi: buat audioCtx manual DAN panggil warmUpAudio()
      // yang juga panggil getAudioContext() → bisa terbuat 2 AudioContext
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }

      warmUpAudio();
      e.preventDefault();
    };

    const stopDrag = () => {
      isDragging = false;
      lastAngle = null;
      // FIX: Saat jari diangkat, langsung jadwalkan stop
      // Sebelumnya stopDrag tidak melakukan apa-apa → audio bisa tidak pernah berhenti
      // dengan bersih, atau berhenti terlalu dini saat drag lambat
      if (stopTimeoutId) clearTimeout(stopTimeoutId);
      stopTimeoutId = setTimeout(() => {
        stopPlaying();
      }, 150); // 150ms setelah jari diangkat — cukup natural
    };

    const handleMove = (e) => {
      if (!isDragging) return;

      // Fix 1: Throttle touchmove to ~30fps (33ms)
      const moveNow = performance.now();
      if (moveNow - lastMoveTime < 33) return;
      lastMoveTime = moveNow;

      const rect = handle.getBoundingClientRect();
      // Center of the 40px circular pit base
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + 23; // Matches new CSS center (top 5px + radius 18px)

      const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
      const clientY = (e.touches ? e.touches[0].clientY : e.clientY);

      const angle = Math.atan2(clientY - centerY, clientX - centerX);

      if (lastAngle !== null) {
        let delta = angle - lastAngle;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;

        // Clockwise = Play
        if (delta > 0.001) {
          const deltaDeg = delta * (180 / Math.PI);
          visualCrankAngle += deltaDeg;
          totalCrankAngle += deltaDeg;

          arm.style.transform = `rotate(${visualCrankAngle}deg) translateZ(0)`;

          // Sliding Logic: 1 turn (360) = 0.5 photo width for smoother experience
          // Or 720deg = 1 photo
          const rawSlide = (totalCrankAngle / 720) * VIEW_WIDTH;
          const fullSetWidth = totalPhotos * VIEW_WIDTH;
          const loopSlide = ((rawSlide % fullSetWidth) + fullSetWidth) % fullSetWidth;
          tray.style.transform = `translate3d(-${loopSlide}px, 0, 0)`;

          // Optimize: Only update active photo when index changes
          const activeIndex = Math.round(loopSlide / VIEW_WIDTH);
          if (activeIndex !== lastActivePhotoIndex && photoEls[activeIndex]) {
            if (lastActivePhotoIndex >= 0 && photoEls[lastActivePhotoIndex]) {
              photoEls[lastActivePhotoIndex].classList.remove('is-active');
            }
            photoEls[activeIndex].classList.add('is-active');
            lastActivePhotoIndex = activeIndex;
            // Update caption saat foto berganti
            const currentCaption = displayPhotos[activeIndex % displayPhotos.length]?.caption;
            updateCaption(currentCaption);
          }

          // Trigger Click Sound & Haptic every 15 degrees (Fix 6: with 50ms cooldown)
          if (Math.abs(totalCrankAngle - lastClickRotation) > 15) {
            const clickNow = performance.now();
            if (clickNow - lastClickTime > 50) {
              playMechanicalClick();
              lastClickTime = clickNow;
            }
            lastClickRotation = totalCrankAngle;
          }

          startPlaying();
          lastRotationTime = Date.now();
        }
      }
      lastAngle = angle;
    };

    const startPlaying = () => {
      if (!isPlaying) {
        // Resume AudioContext jika suspended (iOS: wajib setelah tab background)
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        audio.muted = false;

        if (voiceGain && audioCtx && audioCtx.state === 'running') {
          voiceGain.gain.cancelScheduledValues(audioCtx.currentTime);
          voiceGain.gain.setValueAtTime(0, audioCtx.currentTime);
          voiceGain.gain.linearRampToValueAtTime(VOICE_VOL, audioCtx.currentTime + 0.1);
        } else {
          // HTML5 fallback: set volume langsung tanpa GainNode
          audio.volume = VOICE_VOL;
        }

        if (ambientAudio) ambientAudio.muted = false;
        if (audio.ended) audio.currentTime = 0;

        audio.play().catch((e) => {
          // AbortError bisa di-retry, NotAllowedError tidak bisa tanpa gesture baru
          if (e.name === 'AbortError') {
            setTimeout(() => audio.play().catch(() => { }), 300);
          }
        });

        isPlaying = true;
        box.classList.add('is-cranking');
        updateVisuals();

        // FIX: Guard audioCtx sebelum akses noiseGain & ambientGain
        if (noiseGain && audioCtx && audioCtx.state === 'running') {
          noiseGain.gain.setTargetAtTime(0.12, audioCtx.currentTime, 0.1);
        }

        if (ambientGain && audioCtx && audioCtx.state === 'running') {
          ambientGain.gain.setTargetAtTime(AMBIENT_VOL, audioCtx.currentTime, 0.5);
        } else if (ambientAudio) {
          ambientAudio.volume = AMBIENT_VOL;
        }

        // iOS Failsafe: paksa resume ambient jika tertahan autoplay policy
        if (ambientAudio && ambientAudio.paused && !ambientAudio.ended) {
          ambientAudio.play().catch(() => { });
        }
      }

      // Reset stop-timeout setiap ada gerakan crank
      // FIX: Dinaikkan dari 300ms ke 500ms
      // 300ms terlalu pendek — di HP jadul gap antar touchmove bisa >300ms
      // sehingga stop dipanggil di tengah drag aktif → audio putus-putus
      if (stopTimeoutId) clearTimeout(stopTimeoutId);
      if (isDragging) {
        // Selama masih drag, jangan auto-stop — biarkan stopDrag yang handle
        return;
      }
      stopTimeoutId = setTimeout(() => {
        stopPlaying();
      }, 500);
    };

    const stopPlaying = () => {
      if (isPlaying) {
        // FIX: Guard audioCtx sebelum akses .currentTime
        if (voiceGain && audioCtx && audioCtx.state === 'running') {
          voiceGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        }
        audio.pause();
        isPlaying = false;
        box.classList.remove('is-cranking');

        if (noiseGain && audioCtx && audioCtx.state === 'running') {
          noiseGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
        }

        if (ambientGain && audioCtx && audioCtx.state === 'running') {
          ambientGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
        } else if (ambientAudio) {
          ambientAudio.volume = 0;
        }

        if (stopTimeoutId) { clearTimeout(stopTimeoutId); stopTimeoutId = null; }
      }
    };

    handle.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopDrag);

    handle.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', stopDrag);

    // Initial caption state
    const firstCaption = displayPhotos[0]?.caption;
    updateCaption(firstCaption);

    // FIX 5: iOS Tab Background Recovery
    // Saat customer buka WhatsApp lalu balik ke halaman gift,
    // iOS Safari suspend AudioContext → suara mati. Handler ini auto-resume.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { });
      }
      // iOS bug: audio bisa di-pause paksa saat tab background
      if (isPlaying && audio.paused) {
        audio.play().catch(() => { });
      }
    });
  };

  const handleAfterLoad = async (giftConfig, containerEl) => {
    if (!giftConfig) return;

    const showState = (name) => {
      ['loading', 'preloading', 'access', 'error', 'password', 'gift'].forEach(s => {
        document.getElementById(`state-${s}`)?.classList.toggle('hidden', s !== name);
      });
    };

    showState('preloading');

    const photos = giftConfig.photos || [];
    const photoUrls = photos.map(p => typeof p === 'string' ? p : (p.url || p.localPreview)).filter(Boolean);
    const voiceUrl = giftConfig.voiceNote?.url;

    const total = photoUrls.length + (voiceUrl ? 1 : 0);
    let loaded = 0;

    const updateProgress = () => {
      loaded++;
      const percent = Math.round((loaded / total) * 100);
      const bar = document.getElementById('preload-bar');
      const text = document.getElementById('preload-text');
      if (bar) bar.style.width = `${percent}%`;
      if (text) text.textContent = `Mempersiapkan kenangan... ${percent}%`;
    };

    // FIX ROOT CAUSE: Buat audio element di sini dan SIMPAN referensinya
    // Lalu pass ke init() agar buffer yang sudah terkumpul tidak terbuang
    let preloadedAudio = null;
    if (voiceUrl) {
      preloadedAudio = new Audio();
      preloadedAudio.crossOrigin = 'anonymous';
      preloadedAudio.preload = 'auto';
      preloadedAudio.src = voiceUrl;
    }

    // Load semua assets secara paralel
    const allLoads = [];

    // Load foto
    photoUrls.forEach(url => {
      allLoads.push(new Promise((resolve) => {
        const timeout = setTimeout(() => { updateProgress(); resolve(); }, 10000);
        const img = new Image();
        img.src = url;
        img.onload = () => { clearTimeout(timeout); updateProgress(); resolve(); };
        img.onerror = () => { clearTimeout(timeout); updateProgress(); resolve(); };
      }));
    });

    // Load audio — gunakan element yang SAMA yang akan dipakai player
    // FIX LOADING LAMA: Cukup tunggu loadedmetadata (ukuran + durasi sudah diketahui)
    // Tidak perlu tunggu canplay/canplaythrough — itu butuh download sebagian besar file
    // Range Request di worker sudah handle streaming, jadi tidak perlu buffer penuh dulu
    if (preloadedAudio) {
      allLoads.push(new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[Preloader] Audio timeout, lanjut tanpa menunggu');
          updateProgress();
          resolve();
        }, 5000); // Turunkan timeout dari 10s ke 5s

        const onDone = () => {
          clearTimeout(timeout);
          updateProgress();
          resolve();
        };

        // Cukup tunggu metadata — jauh lebih cepat dari canplay
        preloadedAudio.addEventListener('loadedmetadata', onDone, { once: true });
        preloadedAudio.addEventListener('error', onDone, { once: true });

        // Jika metadata sudah ada (dari cache), langsung resolve
        if (preloadedAudio.readyState >= 1) onDone();
      }));
    }

    if (total > 0) {
      await Promise.all(allLoads);
    }

    showState('gift');
    // FIX: Pass preloadedAudio ke init() agar tidak buat Audio baru dari nol
    VoicePlayer.init(
      giftConfig.voiceNote,
      containerEl,
      giftConfig.photos,
      giftConfig.ambient || 'none',
      giftConfig.customAmbientUrl,
      giftConfig.voiceVolume,
      giftConfig.ambientVolume,
      preloadedAudio
    );
  };

  return { init, handleAfterLoad };

})();