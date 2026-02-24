// ============================================================
// player.js — Gift Camera Cinematic Player
// Ported from gift-beige/player.js with digicam aesthetics
// ============================================================

const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';

// ── State ───────────────────────────────────────────────────
let giftConfig = null;
let giftId = null;

// ── DOM ─────────────────────────────────────────────────────
const showState = (name) => {
    ['loading', 'access', 'error', 'password', 'gift'].forEach(s => {
        document.getElementById(`state-${s}`)?.classList.toggle('hidden', s !== name);
    });
};

// ── Bokeh Particles ──────────────────────────────────────────
const setupBokeh = () => {
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
};

// AMBIENT_SOUNDS is now loaded from ../../shared/ambient-data.js

// ── Gift Player Init ─────────────────────────────────────────
const initPlayer = (config) => {
    giftConfig = config;

    // Build photo list (support both string[] and object[])
    const rawPhotos = config.photos || [];
    const photoUrls = rawPhotos.map(p => typeof p === 'string' ? p : (p.url || p.localPreview)).filter(Boolean);

    if (photoUrls.length === 0) return;

    const voiceNote = config.voiceNote;
    const ambientId = config.ambient || 'none';
    const message = config.message || '';

    // ── Build infinite photo tray inside the LCD ──────────────
    // Triple photos for seamless infinite loop
    const triplePhotos = [...photoUrls, ...photoUrls, ...photoUrls];
    const totalPhotos = photoUrls.length;

    // Inject the full digicam player HTML into the gift section
    const giftSection = document.getElementById('gift-voice');
    if (!giftSection) return;

    const trayHTML = triplePhotos.map(url => `
        <div class="film-frame">
            <img src="${url}" alt="Memory">
        </div>
    `).join('');

    const waveformHTML = Array(28).fill('<div class="waveform-bar"></div>').join('');

    giftSection.innerHTML = `
        <div class="digicam-container" id="digicam-box">

            <!-- Corner screws -->
            <div class="console-screw top-left"></div>
            <div class="console-screw top-right"></div>
            <div class="console-screw bottom-left"></div>
            <div class="console-screw bottom-right"></div>

            <!-- Camera Body -->
            <div class="camera-body">

                <!-- Left: Lens -->
                <div class="camera-left">
                    <div class="flash-unit">
                        <div class="flash-grid"></div>
                    </div>
                    <div class="viewfinder-dot"></div>

                    <div class="lens-outer">
                        <div class="lens-mid">
                            <div class="lens-inner">
                                <div class="lens-deep">
                                    <div class="lens-core" id="lens-core">
                                        <div class="lens-glare-main"></div>
                                        <div class="lens-glare-blue"></div>
                                        <div class="lens-specular"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="lens-ring-label">DIGICAM 38mm f/2.8</div>
                    </div>
                </div>

                <!-- Right: LCD + Play -->
                <div class="camera-right">
                    <div class="lcd-bezel">
                        <div class="lcd-screen" id="lcd-screen">
                            <!-- The film tray slides inside here -->
                            <div class="film-tray" id="film-tray">
                                ${trayHTML}
                            </div>
                            <!-- Analog overlays (placed on top of film tray) -->
                            <div class="light-leak-overlay"></div>
                            <div class="glass-lens-overlay"></div>
                            <div class="lcd-glass-overlay"></div>
                            <div class="lcd-scanlines"></div>
                            <div class="slide-counter" id="slide-counter">1 / ${totalPhotos}</div>
                            <div class="lcd-idle-overlay" id="lcd-idle-overlay">
                                <div class="lcd-idle-line"></div>
                                <div class="lcd-idle-label">press play</div>
                                <div class="lcd-idle-line"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Auto-play button -->
                    <button class="auto-play-btn" id="auto-play-toggle">
                        <span class="auto-play-icon">▶</span>
                        <span class="auto-play-text">AUTO PLAY</span>
                    </button>
                </div>

            </div>

            <!-- Message -->
            <div class="message-slot" id="message-slot">
                <div class="message-strip" id="message-text"></div>
            </div>

            <!-- Bottom waveform + timer -->
            <div class="bottom-panel">
                <div class="music-box-waveform" id="waveform-bars">
                    ${waveformHTML}
                </div>
                <div class="timer-display" id="timer-display">0:00</div>
            </div>

        </div>
    `;

    // Inject message
    const msgEl = document.getElementById('message-text');
    if (msgEl && message) msgEl.textContent = message;

    setupBokeh();

    // ── Audio Setup ────────────────────────────────────────────
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;
    let sourceNode = null;
    let animationId = null;

    let ambientAudio = null;
    let ambientGain = null;
    let voiceGain = null;

    // SFX for countdown
    const sfx = new Audio('https://dl.dropboxusercontent.com/scl/fi/kvr3bdvgi73t2nrtaj6y5/countdown.mp3?rlkey=ov8bf8msz3z6vxnwsvkst1ldc&st=j6jlhrhf&dl=1');
    sfx.volume = 0.3;
    sfx.crossOrigin = 'anonymous';
    sfx.preload = 'auto';

    const getAudioContext = () => {
        if (!audioCtx) audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => { });
        return audioCtx;
    };

    const initAmbient = () => {
        if (!ambientId || ambientId === 'none' || !AMBIENT_SOUNDS[ambientId]) return;
        const ctx = getAudioContext();
        ambientAudio = new Audio(AMBIENT_SOUNDS[ambientId]);
        ambientAudio.crossOrigin = 'anonymous';
        const isSong = ['nadin-ah', 'daniel', 'mitski', 'feast-nina', 'feast-tarot'].includes(ambientId);
        ambientAudio.loop = !isSong;
        const src = ctx.createMediaElementSource(ambientAudio);
        ambientGain = ctx.createGain();
        ambientGain.gain.setValueAtTime(0, ctx.currentTime);
        src.connect(ambientGain);
        ambientGain.connect(ctx.destination);
    };

    // ── Voice Note ─────────────────────────────────────────────
    let audio = null;
    let isPlaying = false;

    if (voiceNote && voiceNote.url) {
        audio = new Audio(voiceNote.url);
        audio.crossOrigin = 'anonymous';
    }

    const fmt = (s) => {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const updateDuration = () => {
        const timerEl = document.getElementById('timer-display');
        if (timerEl && audio && audio.duration && isFinite(audio.duration)) {
            timerEl.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);

            // Reveal message near the end (5s remaining)
            if (audio.currentTime >= (audio.duration - 5)) {
                document.getElementById('message-text')?.classList.add('visible');
            }
        }
    };

    const setupVisualizer = () => {
        const ctx = getAudioContext();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        if (!sourceNode) {
            sourceNode = ctx.createMediaElementSource(audio);
            voiceGain = ctx.createGain();
            sourceNode.connect(voiceGain);
            voiceGain.connect(analyser);
            analyser.connect(ctx.destination);
        }
    };

    let frameCounter = 0;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const cachedParticles = () => document.querySelectorAll('.bokeh-particle');
    let particleCache = null;

    const updateVisuals = () => {
        if (!isPlaying) { cancelAnimationFrame(animationId); return; }
        animationId = requestAnimationFrame(updateVisuals);
        frameCounter++;
        const skipRate = isMobile ? 3 : 2;
        if (frameCounter % skipRate !== 0) return;

        if (analyser) {
            analyser.getByteFrequencyData(dataArray);
            const bars = document.querySelectorAll('#waveform-bars .waveform-bar');
            bars.forEach((bar, i) => {
                const distToCenter = Math.abs(i - 14);
                const binIndex = Math.floor(distToCenter * 0.8) + 2;
                const val = dataArray[binIndex] || 0;
                const scale = val / 255;
                bar.style.transform = `scaleY(${0.12 + scale * 0.88})`;
                bar.style.opacity = scale > 0.3 ? (0.5 + scale * 0.5) : (0.1 + scale * 0.2);
            });
        }

        // Bokeh pulses
        if (frameCounter % 4 === 0 && analyser) {
            const avgVolume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            if (!particleCache) particleCache = cachedParticles();
            const nowSec = Date.now() / 1000;
            particleCache.forEach((p, idx) => {
                const move = (avgVolume / 255) * (30 + idx * 5);
                const scale = 1 + (avgVolume / 255) * 0.5;
                p.style.transform = `translate3d(${Math.sin(nowSec + idx) * move}px, ${Math.cos(nowSec + idx) * move}px, 0) scale(${scale})`;
                p.style.opacity = 0.03 + (avgVolume / 255) * 0.07;
            });
        }

        // Timer update
        if (audio) updateDuration();
    };

    // ── Auto-Play Film Advance Logic ───────────────────────────
    const tray = document.getElementById('film-tray');
    const counterEl = document.getElementById('slide-counter');
    const idleOverlay = document.getElementById('lcd-idle-overlay');
    const digicamBox = document.getElementById('digicam-box');
    const lensCore = document.getElementById('lens-core');

    // Frame width = 100% of the tray container (lcd-screen)
    let VIEW_WIDTH = 150; // Fixed square frame width

    let totalCrankAngle = 0;
    let lastActiveIndex = -1;
    const AUTO_SPEED = 4.5; // Sync with main gift pages
    let isAutoPlaying = false;
    let autoRafId = null;
    let countdownWasStarted = false; // New flag to prevent repeat countdowns

    const getLcdWidth = () => {
        const screen = document.getElementById('lcd-screen');
        return screen ? screen.offsetWidth : 218;
    };

    // Cache film frame elements after injection
    const frameEls = tray ? tray.querySelectorAll('.film-frame') : [];
    let lastActiveFrameIndex = -1;

    const advanceTray = (loopSlide) => {
        if (!tray || !frameEls.length) return;

        // LCD visible width is bezel minus padding (approx 204px)
        const screen = document.getElementById('lcd-screen');
        const lcdWidth = screen ? screen.clientWidth : 204;

        // Centering offset: put the photo in the middle of the LCD
        const offset = (lcdWidth - VIEW_WIDTH) / 2;
        tray.style.transform = `translate3d(${-loopSlide + offset}px, 0, 0)`;

        // Calculate active index based on which photo is at the physical center
        const activeIndex = Math.round(loopSlide / VIEW_WIDTH);

        // Update counter (wrapped to real photo index for display)
        const displayIndex = activeIndex % totalPhotos;
        if (counterEl) counterEl.textContent = `${displayIndex + 1} / ${totalPhotos}`;

        // Apply .is-active to current frame for zoom-in effect
        if (activeIndex !== lastActiveFrameIndex && frameEls[activeIndex]) {
            if (lastActiveFrameIndex >= 0 && frameEls[lastActiveFrameIndex]) {
                frameEls[lastActiveFrameIndex].classList.remove('is-active');
            }
            frameEls[activeIndex].classList.add('is-active');
            lastActiveFrameIndex = activeIndex;
        }
    };

    const autoPlayLoop = () => {
        if (!isAutoPlaying) return;
        // VIEW_WIDTH is fixed at 150

        totalCrankAngle += AUTO_SPEED;
        const rawSlide = (totalCrankAngle / 720) * VIEW_WIDTH;
        const fullSetWidth = totalPhotos * VIEW_WIDTH;
        const loopSlide = (rawSlide % fullSetWidth) + fullSetWidth;

        advanceTray(loopSlide);
        startPlayingAudio();

        autoRafId = requestAnimationFrame(autoPlayLoop);
    };


    // Start/stop audio
    const startPlayingAudio = () => {
        if (isPlaying) return;
        if (!audio) return;
        isPlaying = true;
        digicamBox?.classList.add('is-playing');

        // Hide idle overlay
        if (idleOverlay) idleOverlay.classList.add('hidden');

        // Lens flicker effect
        if (lensCore) lensCore.classList.add('lens-active');

        if (!sourceNode && audio) setupVisualizer();
        if (!ambientAudio) initAmbient();

        if (audio.ended) audio.currentTime = 0;

        // Subtle fade-in for the user voice note
        if (voiceGain) {
            voiceGain.gain.setValueAtTime(0, audioCtx.currentTime);
            voiceGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.4);
        }

        ambientAudio?.play().catch(() => { });
        audio.play().catch(() => { });
        updateVisuals();

        if (ambientGain) {
            ambientGain.gain.setTargetAtTime(0.085, audioCtx.currentTime, 0.5);
        }

        // Message reveal handled in updateDuration
    };

    const stopPlayingAudio = () => {
        // Always kill countdown/sfx even if not mid-song
        const overlay = document.getElementById('countdown-overlay');
        if (overlay) overlay.remove();
        sfx.pause();
        sfx.currentTime = 0;

        if (!isPlaying) return;
        isPlaying = false;
        audio?.pause();
        ambientAudio?.pause(); // Explicitly pause ambient too
        digicamBox?.classList.remove('is-playing');
        lensCore?.classList.remove('lens-active');

        if (ambientGain) {
            ambientGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
        }

        cancelAnimationFrame(animationId);
    };

    // ── Toggle Button ───────────────────────────────────────────
    const toggleBtn = document.getElementById('auto-play-toggle');

    // Countdown + TV static before real playback
    const runCountdownThenPlay = () => {
        // If we've already started the countdown once, just resume the loop
        if (countdownWasStarted) {
            // Clean up old overlay if it exists (e.g. if paused during countdown)
            const oldOverlay = document.getElementById('countdown-overlay');
            if (oldOverlay) oldOverlay.remove();

            autoPlayLoop();
            return;
        }

        countdownWasStarted = true; // Mark as started immediately

        const lcdScreen = document.querySelector('#lcd-screen');
        if (!lcdScreen) { autoPlayLoop(); return; }

        // Countdown uses the pre-initialized sfx
        const startVisuals = () => {
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
            lcdScreen.appendChild(overlay);

            if (idleOverlay) idleOverlay.classList.add('hidden');

            const totalDur = sfx.duration || 4.0;
            const stepMs = (totalDur * 1000) / 4;

            if (!isAutoPlaying) return;
            sfx.currentTime = 0;
            sfx.play().catch(e => console.log('SFX blocked:', e));

            let count = 3;
            const tick = () => {
                if (!isAutoPlaying) return;
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
                    // TV Static bit - runs for the remaining step time (1s)
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

        if (sfx.readyState >= 1) startVisuals();
        else sfx.onloadedmetadata = startVisuals;
    };

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            getAudioContext(); // Ensure context on user gesture

            // Audio Priming: Unlock audio on mobile gesture
            const primeAudio = (el) => {
                if (!el) return;
                el.play().then(() => {
                    el.pause();
                }).catch(() => { });
            };

            isAutoPlaying = !isAutoPlaying;
            toggleBtn.classList.toggle('is-active', isAutoPlaying);
            toggleBtn.querySelector('.auto-play-icon').textContent = isAutoPlaying ? '⏸' : '▶';
            toggleBtn.querySelector('.auto-play-text').textContent = isAutoPlaying ? 'PAUSE' : 'AUTO PLAY';

            if (isAutoPlaying) {
                if (!ambientAudio) initAmbient();

                if (!countdownWasStarted) {
                    // First time: Prime and start countdown sequence
                    // primeAudio will allow them to play after countdown
                    primeAudio(ambientAudio);
                    primeAudio(audio);
                    runCountdownThenPlay();
                } else {
                    // Resume: startPlayingAudio inside autoPlayLoop will handle play()
                    autoPlayLoop();
                }
            } else {
                // Total stop
                cancelAnimationFrame(autoRafId);
                stopPlayingAudio();
            }

            if (audio && !sourceNode) setupVisualizer();
        });
    }

    if (audio) {
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('timeupdate', updateDuration);
    }
};

// ── Fetch & Load Gift ────────────────────────────────────────
const loadGift = async (id) => {
    try {
        const res = await fetch(`${API_BASE_URL}/get-config?id=${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error('not found');
        return await res.json();
    } catch {
        return null;
    }
};

const handleAfterLoad = () => {
    showState('gift');
    if (giftConfig) initPlayer(giftConfig);
};

// ── Entry Point ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const giftIdParam = params.get('to');

    // Default test config
    giftConfig = {
        photos: [
            'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=400&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1503803548695-c2a7b4a5b875?q=80&w=400&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?q=80&w=400&auto=format&fit=crop'
        ],
        message: '',
        ambient: 'none',
        voiceNote: null
    };

    if (giftIdParam) {
        showState('loading');
        const fetched = await loadGift(giftIdParam);
        if (fetched) {
            giftConfig = fetched;
            if (giftConfig.password) {
                showState('password');
            } else {
                handleAfterLoad();
            }
        } else {
            showState('error');
        }
    } else {
        // Preview mode / default config (no ?to=)
        handleAfterLoad();
    }

    // Password gate
    const pwdBtn = document.getElementById('btn-unlock');
    if (pwdBtn) {
        pwdBtn.addEventListener('click', () => {
            const input = document.getElementById('password-input');
            const pwd = input?.value?.trim();
            if (!pwd) return;

            if (pwd === giftConfig.password) {
                showState('gift');
                initPlayer(giftConfig);
            } else {
                document.getElementById('password-error')?.classList.remove('hidden');
            }
        });
        document.getElementById('password-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') pwdBtn.click();
        });
    }

    // Access gate (no-token search)
    const accessBtn = document.getElementById('btn-access-go');
    if (accessBtn) {
        accessBtn.addEventListener('click', async () => {
            const inputEl = document.getElementById('access-id-input');
            const id = inputEl?.value?.trim();
            if (!id) return;

            const fetched = await loadGift(id);
            if (!fetched) {
                alert('Kado tidak ditemukan. Cek kembali kode kado-mu.');
                return;
            }
            giftConfig = fetched;
            if (giftConfig.password) {
                showState('password');
            } else {
                showState('gift');
                initPlayer(giftConfig);
            }
        });
    }
});
