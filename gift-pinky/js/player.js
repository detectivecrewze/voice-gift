const VoicePlayer = (() => {

  const init = (voiceNote, containerEl, allPhotos, ambientId = 'none') => {
    const audio = new Audio(voiceNote.url);
    audio.crossOrigin = 'anonymous'; // Required for Web Audio API (waveform visualizer) with remote files
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

    // --- Sound Engine & Haptics ---
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;
    let sourceNode = null;
    let voiceGain = null;
    let animationId = null;

    // ── Centralized AudioContext Helper ───────────────────────
    // Ensures AudioContext is created & resumed AFTER user gesture (iOS/Safari fix)
    const getAudioContext = () => {
      if (!audioCtx) {
        audioCtx = new AudioCtx();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { });
      }
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
      rain: 'https://dl.dropboxusercontent.com/scl/fi/zwol73h41qnavbduc0qgh/rain.mp3?rlkey=7d82wac3ebncezhbe2vl09alf&st=cu5gupob',
      cafe: 'https://dl.dropboxusercontent.com/scl/fi/awuth8dg03qy0ij2czddi/cafe.mp3?rlkey=5dzngx7pmnsx6utce484e65go&st=lzluvv25',
      waves: 'https://dl.dropboxusercontent.com/scl/fi/9z17yg7u3l6wc2wv9lbp0/waves.mp3?rlkey=kwle5uf8h2vyodgt257t0lnwo&st=g1a3bxx5',
      fireplace: 'https://dl.dropboxusercontent.com/scl/fi/orte59auc36wxng69iy3n/fireplace.mp3?rlkey=xohuvr0p6p1816hvp34kf387q&st=fgatk8qq',
      forest: 'https://dl.dropboxusercontent.com/scl/fi/cy1k2ru7ddi1wm96uohqv/forest.mp3?rlkey=uvsqjyjxbwhk33cmaps931bqu&st=h2b6zlzk',
      'nadin-ah': 'https://dl.dropboxusercontent.com/scl/fi/itmvna64forw61thvwb19/AH-Nadin-Amizah.mp3?rlkey=lmzmxrhjgq9qrabe3sewox21q&st=0s3baidy',
      daniel: 'https://dl.dropboxusercontent.com/scl/fi/nqpvliyw9r780t3wk4636/Daniel-Caesar-Who-Knows.mp3?rlkey=vnfwwhsmuwdyt2lrgwuhjyf9u&st=fgjxdbio',
      mitski: 'https://dl.dropboxusercontent.com/scl/fi/71ib9m69dm2ed9squj191/Mitski-My-Love-Mine-All-Mine.mp3?rlkey=i43d8ng7tbndbuflm1yw3j3r9&st=dad3r4yp',
      'feast-nina': 'https://dl.dropboxusercontent.com/scl/fi/gasq7z9wglw9n4pi01g2o/Feast-Nina-Official-Lyric-Video.mp3?rlkey=9kemwk8ojsee4rlaqj8s0h3rx&st=5szgp51v',
      'feast-tarot': 'https://dl.dropboxusercontent.com/scl/fi/8eypewha6kurv9ffjx559/Tarot-.Feast-_-Lirik-Lagu.mp3?rlkey=jvp17k7g7mtahx0osdxstem9q&st=5e7q3pyd'
    };

    let ambientAudio = null;
    let ambientGain = null;
    let ambientSource = null;

    const initAmbientSound = () => {
      if (!ambientId || ambientId === 'none' || !AMBIENT_SOUNDS[ambientId]) {
        return;
      }
      const ctx = getAudioContext();
      if (!ctx) return;

      ambientAudio = new Audio(AMBIENT_SOUNDS[ambientId]);
      ambientAudio.crossOrigin = 'anonymous';

      // Only loop nature SFX, not songs
      const isSong = ['nadin-ah', 'daniel', 'mitski', 'feast-nina', 'feast-tarot'].includes(ambientId);
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

    // Viewport width in CSS is 240px (Compact)
    let VIEW_WIDTH = 240;

    // For Infinite Loop: Clone the list of photos
    const displayPhotos = (allPhotos && allPhotos.length > 0) ? allPhotos : [{ url: '../assets/1.jpg' }];
    const totalPhotos = displayPhotos.length;

    // Triple for seamless looping
    const triplePhotos = [...displayPhotos, ...displayPhotos, ...displayPhotos];

    const photosMarkup = triplePhotos.map((p, idx) => `
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
        </div>

        <div class="music-box-info">
          <div class="music-box-waveform" id="waveform">
            ${Array(48).fill('<div class="waveform-bar"></div>').join('')}
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

    // ── Performance: Cache DOM elements ──────────────────────────
    const photoEls = tray.querySelectorAll('.printer-photo');
    let lastActivePhotoIndex = -1;

    // --- Helper Functions (Defined before use) ---
    function setupBokeh() {
      const container = document.getElementById('bokeh-container');
      if (!container || container.children.length > 0) return;

      for (let i = 0; i < 8; i++) {
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

      // Fix 2: Proper frame-skip — skip 2 of 3 frames on mobile, every other on desktop
      frameCounter++;
      const skipRate = isMobile ? 3 : 2;
      if (frameCounter % skipRate !== 0) return;

      analyser.getByteFrequencyData(dataArray);

      // Fix 3: Batch all style writes together, minimize classList operations
      const now = Date.now();
      const nowSec = now / 1000;

      for (let i = 0; i < bars.length; i++) {
        const distanceToCenter = Math.abs(i - 24);
        const binIndex = Math.floor(distanceToCenter * 0.8) + 2;
        const val = dataArray[binIndex] || 0;

        const scaleFactor = (val / 255);
        bars[i].style.transform = `scaleY(${0.125 + scaleFactor * 0.875})`;
        bars[i].style.opacity = scaleFactor > 0.3 ? (0.5 + scaleFactor * 0.5) : (0.1 + scaleFactor * 0.2);
      }

      // Fix 3: Reduce bokeh update frequency — every 4th frame (effectively ~7.5fps)
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

      // Silent unlock for iOS
      audio.volume = 0;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => { });

      // WebM Duration Hack - perform while muted
      if (audio.duration === Infinity || audio.duration === 0 || isNaN(audio.duration)) {
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
      stopPlaying();
    });

    // ── Interaction Logic (Infinite) ──────────────────────────
    let isDragging = false;
    let visualCrankAngle = 0;

    // ── Auto-Play Logic ──
    let isAutoPlaying = false;
    let autoPlayRafId = null;
    const AUTO_SPEED = 4.5;
    const toggleBtn = containerEl.querySelector('#auto-play-toggle');

    function autoPlayLoop() {
      if (!isAutoPlaying) return;
      visualCrankAngle += AUTO_SPEED;
      totalCrankAngle += AUTO_SPEED;
      arm.style.transform = `rotate(${visualCrankAngle}deg) translateZ(0)`;
      const rawSlide = (totalCrankAngle / 720) * VIEW_WIDTH;
      const fullSetWidth = totalPhotos * VIEW_WIDTH;
      const loopSlide = (rawSlide % fullSetWidth) + fullSetWidth;
      tray.style.transform = `translate3d(-${loopSlide}px, 0, 0)`;
      const activeIndex = Math.round(loopSlide / VIEW_WIDTH);
      if (activeIndex !== lastActivePhotoIndex && photoEls[activeIndex]) {
        if (lastActivePhotoIndex >= 0 && photoEls[lastActivePhotoIndex]) {
          photoEls[lastActivePhotoIndex].classList.remove('is-active');
        }
        photoEls[activeIndex].classList.add('is-active');
        lastActivePhotoIndex = activeIndex;
      }
      if (Math.abs(totalCrankAngle - lastClickRotation) > 15) {
        const clickNow = performance.now();
        if (clickNow - lastClickTime > 50) { playMechanicalClick(); lastClickTime = clickNow; }
        lastClickRotation = totalCrankAngle;
      }
      startPlaying();
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

      const sfx = new Audio('https://dl.dropboxusercontent.com/scl/fi/kvr3bdvgi73t2nrtaj6y5/countdown.mp3?rlkey=ov8bf8msz3z6vxnwsvkst1ldc&st=j6jlhrhf');
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
      toggleBtn.addEventListener('click', () => {
        isAutoPlaying = !isAutoPlaying;
        toggleBtn.classList.toggle('is-active', isAutoPlaying);
        warmUpAudio();
        getAudioContext();
        if (isAutoPlaying) { runCountdownThenPlay(); }
        else { cancelAnimationFrame(autoPlayRafId); stopPlaying(); }
      });
    }

    const startDrag = (e) => {
      // Hide idle overlay if user manually drags early
      hideIdleOverlay();
      countdownWasStarted = true;

      if (isAutoPlaying) {
        isAutoPlaying = false;
        if (toggleBtn) toggleBtn.classList.remove('is-active');
        cancelAnimationFrame(autoPlayRafId);
      }
      isDragging = true;
      lastAngle = null;

      // ── iOS/Safari Fix: Initialize AudioContext SYNCHRONOUSLY in user gesture handler ──
      // This MUST happen directly in the event handler, not in a callback/helper
      if (!audioCtx) {
        audioCtx = new AudioCtx();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      warmUpAudio();
      e.preventDefault();
    };

    const stopDrag = () => {
      isDragging = false;
      lastAngle = null;
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

          // INFINITE WRAP MATH:
          // Keep the translateX within the second set of photos to allow forward/backward looping
          // slide = (rawSlide % fullSetWidth) + fullSetWidth
          // But for simple forward-only:
          const loopSlide = (rawSlide % fullSetWidth) + fullSetWidth;

          // Use translate3d for GPU acceleration
          tray.style.transform = `translate3d(-${loopSlide}px, 0, 0)`;

          // Optimize: Only update active photo when index changes
          const activeIndex = Math.round(loopSlide / VIEW_WIDTH);
          if (activeIndex !== lastActivePhotoIndex && photoEls[activeIndex]) {
            if (lastActivePhotoIndex >= 0 && photoEls[lastActivePhotoIndex]) {
              photoEls[lastActivePhotoIndex].classList.remove('is-active');
            }
            photoEls[activeIndex].classList.add('is-active');
            lastActivePhotoIndex = activeIndex;
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
        audio.muted = false;
        if (voiceGain) {
          voiceGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.01);
        }
        
        if (ambientAudio) ambientAudio.muted = false;
        if (audio.ended) audio.currentTime = 0;
         // Ensure unmuted
        audio.play().catch(() => { });
        isPlaying = true;
        box.classList.add('is-cranking');
        updateVisuals();

        // Fade in Mechanical Soundscape
        if (noiseGain) {
          noiseGain.gain.setTargetAtTime(0.12, audioCtx.currentTime, 0.1);
        }

        // Fade in Ambient Sound
        if (ambientGain) {
          ambientGain.gain.setTargetAtTime(0.060, audioCtx.currentTime, 0.5);
        }
        
        // Fix 8: iOS Auto-Play Block Failsafe. 
        // Force the paused background song to resume playing if blocked previously
        if (ambientAudio && ambientAudio.paused && !ambientAudio.ended) {
          ambientAudio.play().catch(() => {});
        }
      }

      // Fix 7: Reset stop-timeout each crank movement
      if (stopTimeoutId) clearTimeout(stopTimeoutId);
      stopTimeoutId = setTimeout(() => {
        stopPlaying();
      }, 300);
    };

    const stopPlaying = () => {
      if (isPlaying) {
        if (voiceGain) {
          voiceGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
        }
        audio.pause();
        isPlaying = false;
        box.classList.remove('is-cranking');

        // Fade out Mechanical Soundscape
        if (noiseGain) {
          noiseGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
        }

        // Fade out Ambient Sound
        if (ambientGain) {
          ambientGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
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
  };

  return { init };

})();
