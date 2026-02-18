const VoicePlayer = (() => {

  const init = (voiceNote, containerEl, allPhotos) => {
    const audio = new Audio(voiceNote.url);
    let isPlaying = false;
    let lastRotationTime = 0;
    let lastAngle = null;
    let totalCrankAngle = 0;
    let lastClickRotation = 0;

    // --- Sound Engine & Haptics ---
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;

    const playMechanicalClick = () => {
      if (!audioCtx) audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);

      // Haptic Feedback
      if (navigator.vibrate) navigator.vibrate(5);
    };

    // --- Continuous Mechanical Soundscape (Vinyl Crackle & Whir) ---
    let noiseSource = null;
    let noiseGain = null;

    const initMechanicalSoundscape = () => {
      if (!audioCtx) audioCtx = new AudioCtx();

      const bufferSize = audioCtx.sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        // Gabungan White Noise + Subtle Random Spikes (Crackle)
        const white = Math.random() * 2 - 1;
        const crackle = Math.random() > 0.999 ? (Math.random() * 0.5) : 0;
        data[i] = (white * 0.05) + crackle;
      }

      noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, audioCtx.currentTime);

      noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0, audioCtx.currentTime);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
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
          <div class="printer-tray" id="tray">
            ${photosMarkup}
          </div>
          <div class="printer-slot"></div>
        </div>

        <div class="music-box-info">
          <div class="music-box-waveform" id="waveform">
            ${Array(32).fill('<div class="waveform-bar"></div>').join('')}
          </div>

          <div class="music-box-timer">
            <span id="v-current">0:00</span> <span style="opacity:0.1">|</span> <span id="v-total">0:00</span>
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

      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      if (!noiseSource) initMechanicalSoundscape();
    };

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

          arm.style.transform = `rotate(${visualCrankAngle}deg)`;

          // Sliding Logic: 1 turn (360) = 0.5 photo width for smoother experience
          // Or 720deg = 1 photo
          const rawSlide = (totalCrankAngle / 720) * VIEW_WIDTH;
          const fullSetWidth = totalPhotos * VIEW_WIDTH;

          // INFINITE WRAP MATH:
          // Keep the translateX within the second set of photos to allow forward/backward looping
          // slide = (rawSlide % fullSetWidth) + fullSetWidth
          // But for simple forward-only:
          const loopSlide = (rawSlide % fullSetWidth) + fullSetWidth;

          tray.style.transform = `translateX(-${loopSlide}px)`;

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

        // Fade in Mechanical Soundscape
        if (noiseGain) {
          noiseGain.gain.setTargetAtTime(0.12, audioCtx.currentTime, 0.1);
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
