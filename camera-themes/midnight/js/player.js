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

// ── Ambient Sounds ───────────────────────────────────────────
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
    'feast-tarot': 'https://dl.dropboxusercontent.com/scl/fi/8eypewha6kurv9ffjx559/Tarot-.Feast-_-Lirik-Lagu.mp3?rlkey=jvp17k7g7mtahx0osdxstem9q&st=5e7q3pyd',
};

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
        const isSong = ['nadin-ah', 'daniel', 'mitski', 'feast-nina'].includes(ambientId);
        ambientAudio.loop = !isSong;
        const src = ctx.createMediaElementSource(ambientAudio);
        ambientGain = ctx.createGain();
        ambientGain.gain.setValueAtTime(0, ctx.currentTime);
        src.connect(ambientGain);
        ambientGain.connect(ctx.destination);
        ambientAudio.play().catch(() => { });
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
        // VIEW_WIDTH is fixed at 164

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

        audio.play().catch(() => { });
        updateVisuals();

        if (ambientGain) {
            ambientGain.gain.setTargetAtTime(0.060, audioCtx.currentTime, 0.5);
        }

        // Reveal message near the end
        if (audio.duration && isFinite(audio.duration)) {
            const msgDelay = Math.max(0, (audio.duration - 5) * 1000);
            setTimeout(() => {
                document.getElementById('message-text')?.classList.add('visible');
            }, msgDelay);
        } else {
            // Try again once we know the duration
            audio.addEventListener('loadedmetadata', () => {
                const msgDelay = Math.max(0, (audio.duration - 5) * 1000);
                setTimeout(() => {
                    document.getElementById('message-text')?.classList.add('visible');
                }, msgDelay);
            }, { once: true });
        }
    };

    const stopPlayingAudio = () => {
        if (!isPlaying) return;
        isPlaying = false;
        audio?.pause();
        digicamBox?.classList.remove('is-playing');
        lensCore?.classList.remove('lens-active');

        if (ambientGain) {
            ambientGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
        }

        // Clean up countdown if active
        const overlay = document.getElementById('countdown-overlay');
        if (overlay) overlay.remove();

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

        // Setup SFX and dynamic timing (using direct link for cross-device compatibility)
        const sfx = new Audio('https://dl.dropboxusercontent.com/scl/fi/kvr3bdvgi73t2nrtaj6y5/countdown.mp3?rlkey=ov8bf8msz3z6vxnwsvkst1ldc&st=j6jlhrhf');
        sfx.volume = 0.3;
        sfx.crossOrigin = 'anonymous';

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

            // Sync precisely with 4s audio (fallback to 4.0 if metadata pending)
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

            if (!ambientAudio) initAmbient();
            if (audio && !sourceNode) setupVisualizer();

            isAutoPlaying = !isAutoPlaying;
            toggleBtn.classList.toggle('is-active', isAutoPlaying);
            toggleBtn.querySelector('.auto-play-icon').textContent = isAutoPlaying ? '⏸' : '▶';
            toggleBtn.querySelector('.auto-play-text').textContent = isAutoPlaying ? 'PAUSE' : 'AUTO PLAY';

            if (isAutoPlaying) {
                runCountdownThenPlay();
            } else {
                cancelAnimationFrame(autoRafId);
                stopPlayingAudio();
            }
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
