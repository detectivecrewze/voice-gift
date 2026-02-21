const VoicePlayer = (() => {

  const init = (voiceNote, containerEl, allPhotos, ambientId = 'none') => {
    const audio = new Audio(voiceNote.url);
    audio.crossOrigin = 'anonymous'; // Required for Web Audio API (waveform visualizer) with remote files
    let isPlaying = false;
    let lastRotationTime = 0;
    let lastAngle = null;
    let totalCrankAngle = 0;
    let lastClickRotation = 0;

    // --- Sound Engine & Haptics ---
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;
    let sourceNode = null;
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

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
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
      mitski: 'https://dl.dropboxusercontent.com/scl/fi/71ib9m69dm2ed9squj191/Mitski-My-Love-Mine-All-Mine.mp3?rlkey=i43d8ng7tbndbuflm1yw3j3r9&st=dad3r4yp'
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
      const isSong = ['nadin-ah', 'daniel', 'mitski'].includes(ambientId);
      ambientAudio.loop = !isSong;

      ambientSource = ctx.createMediaElementSource(ambientAudio);
      ambientGain = ctx.createGain();
      ambientGain.gain.setValueAtTime(0, ctx.currentTime);

      ambientSource.connect(ambientGain);
      ambientGain.connect(ctx.destination);

      ambientAudio.play().catch(() => { });
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
        // Gabungan White Noise + Subtle Random Spikes (Crackle)
        const white = Math.random() * 2 - 1;
        const crackle = Math.random() > 0.999 ? (Math.random() * 0.5) : 0;
        data[i] = (white * 0.05) + crackle;
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
        sourceNode.connect(analyser);
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

      // Throttling: Only run visual updates occasionally or every other frame
      // to reduce CPU/GPU pressure on mobile
      if (Date.now() % 2 !== 0) return;

      analyser.getByteFrequencyData(dataArray);

      // Density: 48 bars
      // We take a slice of frequencies that represent the 'heart' of the audio
      const binStep = Math.floor(dataArray.length / 64);

      bars.forEach((bar, i) => {
        // Symmetric Mirrored Mapping (Low freqs in center)
        const distanceToCenter = Math.abs(i - 24);
        const binIndex = Math.floor(distanceToCenter * 0.8) + 2;
        const val = dataArray[binIndex] || 0;

        // Scale for 42px container
        const scaleFactor = (val / 255);
        // Use scaleY for GPU acceleration instead of height
        bar.style.transform = `scaleY(${0.125 + scaleFactor * 0.875})`;

        if (scaleFactor > 0.3) {
          bar.style.opacity = 0.5 + (scaleFactor * 0.5);
          bar.classList.add('active');
        } else {
          bar.style.opacity = 0.1 + (scaleFactor * 0.2);
          bar.classList.remove('active');
        }
      });

      const avgVolume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      if (!cachedParticles) {
        cachedParticles = document.querySelectorAll('.bokeh-particle');
      }

      cachedParticles.forEach((p, idx) => {
        const move = (avgVolume / 255) * (30 + idx * 5);
        const scale = 1 + (avgVolume / 255) * 0.5;
        // Use translate3d for GPU acceleration
        p.style.transform = `translate3d(${Math.sin(Date.now() / 1000 + idx) * move}px, ${Math.cos(Date.now() / 1000 + idx) * move}px, 0) scale(${scale})`;
        p.style.opacity = 0.03 + (avgVolume / 255) * 0.07;
      });
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

      // Initialize AudioContext on first user gesture
      getAudioContext();

      // Trick untuk memaksa browser kalkulasi durasi WebM yang tidak punya metadata cues (sering terjadi pada rekaman browser)
      if (audio.duration === Infinity || audio.duration === 0 || isNaN(audio.duration)) {
        audio.currentTime = 1e10; // Lompat ke ujung yang sangat jauh
        audio.addEventListener('timeupdate', function reset() {
          audio.currentTime = 0;
          audio.removeEventListener('timeupdate', reset);
          updateDuration();
        }, { once: true });
      }

      audio.play().then(() => {
        audio.pause();
        audioWarmed = true;
      }).catch(() => { });

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

    const startDrag = (e) => {
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

          // Optimize: Only scale the active (centered) photo
          const activeIndex = Math.round(loopSlide / VIEW_WIDTH);
          const photoEls = tray.querySelectorAll('.printer-photo');
          if (photoEls[activeIndex] && !photoEls[activeIndex].classList.contains('is-active')) {
            photoEls.forEach(el => el.classList.remove('is-active'));
            photoEls[activeIndex].classList.add('is-active');
          }

          // Trigger Click Sound & Haptic every 15 degrees
          if (Math.abs(totalCrankAngle - lastClickRotation) > 15) {
            playMechanicalClick();
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
        if (audio.ended) audio.currentTime = 0;
        audio.play().catch(() => { });
        isPlaying = true;
        box.classList.add('is-cranking');
        bars.forEach(b => b.classList.add('active'));
        updateVisuals();

        // Fade in Mechanical Soundscape
        if (noiseGain) {
          noiseGain.gain.setTargetAtTime(0.12, audioCtx.currentTime, 0.1);
        }

        // Fade in Ambient Sound
        if (ambientGain) {
          ambientGain.gain.setTargetAtTime(0.085, audioCtx.currentTime, 0.5);
        }
      }
    };

    const stopPlaying = () => {
      if (isPlaying) {
        audio.pause();
        isPlaying = false;
        box.classList.remove('is-cranking');
        bars.forEach(b => b.classList.remove('active'));

        // Fade out Mechanical Soundscape
        if (noiseGain) {
          noiseGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
        }

        // Fade out Ambient Sound
        if (ambientGain) {
          ambientGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
        }
      }
    };

    setInterval(() => {
      if (isPlaying && Date.now() - lastRotationTime > 300) {
        stopPlaying();
      }
    }, 100);

    handle.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopDrag);

    handle.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', stopDrag);
  };

  return { init };

})();
