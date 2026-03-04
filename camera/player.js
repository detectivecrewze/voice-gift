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
    // Normalise: always objects with url + caption
    const normalizedPhotos = rawPhotos.map(p =>
        typeof p === 'string' ? { url: p, caption: '' } : { url: p.url || p.localPreview || '', caption: p.caption || '' }
    ).filter(p => p.url);

    if (normalizedPhotos.length === 0) return;

    const photoUrls = normalizedPhotos.map(p => p.url);
    const totalPhotos = normalizedPhotos.length;
    const voiceNote = config.voiceNote;
    const ambientId = config.ambient || 'none';
    const customAmbientUrl = config.customAmbientUrl || null;
    const message = config.message || '';

    // ── Build infinite photo tray inside the LCD ──────────────
    const triplePhotos = [...normalizedPhotos, ...normalizedPhotos, ...normalizedPhotos];

    const giftSection = document.getElementById('gift-voice');
    if (!giftSection) return;

    const trayHTML = triplePhotos.map(p => `
        <div class="film-frame">
            <img src="${p.url}" alt="Memory">
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
                            <div class="film-tray" id="film-tray">
                                ${trayHTML}
                            </div>
                            <div class="light-leak-overlay"></div>
                            <div class="glass-lens-overlay"></div>
                            <div class="lcd-glass-overlay"></div>
                            <div class="lcd-scanlines"></div>
                            <div class="slide-counter" id="slide-counter">1 / ${totalPhotos}</div>
                            <!-- Caption overlay -->
                            <div id="photo-caption" style="
                                position:absolute;bottom:0;left:0;right:0;z-index:22;
                                padding:18px 10px 8px;
                                background:linear-gradient(to top,rgba(0,0,0,0.68) 0%,rgba(0,0,0,0.25) 60%,transparent 100%);
                                font-family:var(--font-mono);font-size:7.5px;font-style:italic;
                                letter-spacing:0.1em;line-height:1.55;text-align:center;
                                color:rgba(255,255,255,0.8);text-shadow:0 1px 4px rgba(0,0,0,0.6);
                                opacity:0;transform:translateY(4px);
                                transition:opacity 0.5s ease,transform 0.5s ease;
                                pointer-events:none;box-sizing:border-box;
                            "></div>
                            <div class="lcd-idle-overlay" id="lcd-idle-overlay">
                                <div class="lcd-idle-line"></div>
                                <div class="lcd-idle-label">press play</div>
                                <div class="lcd-idle-line"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Auto-play button -->
                    <button class="auto-play-btn" id="auto-play-toggle">
                        <span class="material-symbols-outlined auto-play-icon">play_arrow</span>
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
    const sfx = new Audio(AMBIENT_SOUNDS?.countdown || 'https://cdn.for-you-always.my.id/1772227895645-j1jcgl.mp3?v=2');
    sfx.volume = 0.3;
    sfx.crossOrigin = 'anonymous';
    sfx.preload = 'auto';

    const getAudioContext = () => {
        if (!audioCtx) audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => { });
        return audioCtx;
    };

    const initAmbient = () => {
        let soundUrl = AMBIENT_SOUNDS[ambientId];
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

    // ── Voice Note ─────────────────────────────────────────────
    let audio = null;
    let isPlaying = false;

    if (voiceNote && voiceNote.url) {
        audio = new Audio(voiceNote.url);
        audio.crossOrigin = 'anonymous';
    }

    const fmt = (s) => {
        if (isNaN(s) || s == null) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const updateDuration = () => {
        const timerEl = document.getElementById('timer-display');
        if (!timerEl || !audio) return;
        let dur = audio.duration;
        if (!dur || isNaN(dur) || !isFinite(dur) || dur === 0) {
            dur = voiceNote?.duration || 0;
        }
        timerEl.textContent = fmt(audio.currentTime) + ' / ' + fmt(dur);
        if (dur > 0 && audio.currentTime >= (dur - 5)) {
            document.getElementById('message-text')?.classList.add('visible');
        }
    };

    // ── Caption updater ────────────────────────────────────────
    const captionEl = document.getElementById('photo-caption');
    let captionTimeout = null;
    let currentCaptionText = '';
    const updateCaption = (newCaption) => {
        if (!captionEl) return;
        const text = (newCaption || '').trim();
        if (text === currentCaptionText) return;
        currentCaptionText = text;
        captionEl.style.opacity = '0';
        captionEl.style.transform = 'translateY(6px)';
        clearTimeout(captionTimeout);
        captionTimeout = setTimeout(() => {
            captionEl.textContent = text ? `"${text}"` : '';
            requestAnimationFrame(() => {
                captionEl.style.opacity = text ? '1' : '0';
                captionEl.style.transform = text ? 'translateY(0px)' : 'translateY(6px)';
            });
        }, 200);
    };

    // iOS Audio Warm-Up
    let audioWarmed = false;
    const warmUpAudio = () => {
        if (audioWarmed) return;
        audioWarmed = true;
        getAudioContext();
        if (audio) {
            const pv = audio.volume;
            audio.volume = 0;
            audio.play().then(() => { audio.pause(); audio.currentTime = 0; audio.volume = pv; }).catch(() => { audio.volume = pv; });
            if (voiceNote?.url && (audio.duration === Infinity || audio.duration === 0 || isNaN(audio.duration))) {
                audio.currentTime = 1e10;
                audio.addEventListener('timeupdate', function reset() {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.removeEventListener('timeupdate', reset);
                    updateDuration();
                }, { once: true });
            }
        }
        if (ambientAudio) {
            ambientAudio.muted = true;
            ambientAudio.play().then(() => { ambientAudio.pause(); ambientAudio.currentTime = 0; ambientAudio.muted = false; }).catch(() => { ambientAudio.muted = false; });
        }
    };

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
            voiceGain.gain.setValueAtTime(0, ctx.currentTime); // start silent — prevents warmup audio leaking at gain=1 default
            sourceNode.connect(voiceGain);
            voiceGain.connect(analyser);
            analyser.connect(ctx.destination);
        }
    };

    let frameCounter = 0;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    let particleCache = null;

    const updateVisuals = () => {
        if (!isPlaying) { cancelAnimationFrame(animationId); return; }
        animationId = requestAnimationFrame(updateVisuals);
        frameCounter++;
        const skipRate = isMobile ? 3 : 2;
        if (frameCounter % skipRate !== 0) return;

        const bars = document.querySelectorAll('#waveform-bars .waveform-bar');
        const nowSec = Date.now() / 1000;

        if (!analyser || !dataArray) {
            bars.forEach((bar, i) => {
                const idleScale = 0.125 + Math.sin(nowSec / 0.4 + i * 0.4) * 0.06;
                bar.style.transform = `scaleY(${idleScale})`;
                bar.style.opacity = '0.18';
            });
            if (audio) updateDuration();
            return;
        }

        analyser.getByteFrequencyData(dataArray);

        let isFallback = false;
        if (isPlaying && audio && !audio.paused && audio.currentTime > 0) {
            let total = 0;
            for (let j = 0; j < dataArray.length; j++) { total += dataArray[j]; if (total > 0) break; }
            isFallback = (total === 0);
        }

        bars.forEach((bar, i) => {
            const distToCenter = Math.abs(i - 14);
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

        if (frameCounter % 4 === 0) {
            const avgVolume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            if (!particleCache) particleCache = document.querySelectorAll('.bokeh-particle');
            const nowSecB = nowSec;
            particleCache.forEach((p, idx) => {
                const move = (avgVolume / 255) * (30 + idx * 5);
                const sc = 1 + (avgVolume / 255) * 0.5;
                p.style.transform = `translate3d(${Math.sin(nowSecB + idx) * move}px, ${Math.cos(nowSecB + idx) * move}px, 0) scale(${sc})`;
                p.style.opacity = 0.03 + (avgVolume / 255) * 0.07;
            });
        }

        if (audio) updateDuration();
    };

    // ── Auto-Play Film Advance Logic ───────────────────────────
    const tray = document.getElementById('film-tray');
    const counterEl = document.getElementById('slide-counter');
    const idleOverlay = document.getElementById('lcd-idle-overlay');
    const digicamBox = document.getElementById('digicam-box');
    const lensCore = document.getElementById('lens-core');

    const VIEW_WIDTH = 165;

    let totalCrankAngle = 0;
    let lastActiveIndex = -1;
    const AUTO_SPEED = 3.6;
    let _autoLastTime = 0;
    let isAutoPlaying = false;
    let autoRafId = null;
    let countdownWasStarted = false;

    const frameEls = tray ? tray.querySelectorAll('.film-frame') : [];
    let lastActiveFrameIndex = -1;



    const advanceTray = (loopSlide) => {
        if (!tray || !frameEls.length) return;

        const screen = document.getElementById('lcd-screen');
        const lcdWidth = screen ? screen.clientWidth : 165;
        const offset = (lcdWidth - VIEW_WIDTH) / 2;
        tray.style.transform = `translate3d(${-loopSlide + offset}px, 0, 0)`;

        const activeIndex = Math.round(loopSlide / VIEW_WIDTH);
        const displayIndex = activeIndex % totalPhotos;
        if (counterEl) counterEl.textContent = `${displayIndex + 1} / ${totalPhotos}`;

        if (activeIndex !== lastActiveFrameIndex && frameEls[activeIndex]) {
            if (lastActiveFrameIndex >= 0 && frameEls[lastActiveFrameIndex]) {
                frameEls[lastActiveFrameIndex].classList.remove('is-active');
            }
            frameEls[activeIndex].classList.add('is-active');
            lastActiveFrameIndex = activeIndex;
            const caption = normalizedPhotos[displayIndex]?.caption || '';
            updateCaption(caption);
        }

        const slideProgress = (loopSlide % VIEW_WIDTH) / VIEW_WIDTH;
        if (slideProgress > 0.40 && slideProgress < 0.60) {
            if (captionEl && captionEl.style.opacity !== '0') {
                captionEl.style.opacity = '0';
                captionEl.style.transform = 'translateY(6px)';
            }
        } else if (captionEl && captionEl.textContent) {
            if (captionEl.style.opacity === '0') {
                captionEl.style.opacity = '1';
                captionEl.style.transform = 'translateY(0px)';
            }
        }
    };

    const autoPlayLoop = (timestamp) => {
        if (!isAutoPlaying) return;

        const now = (typeof timestamp === 'number') ? timestamp : performance.now();
        if (_autoLastTime === 0) _autoLastTime = now;
        const elapsed = now - _autoLastTime;
        _autoLastTime = now;
        const delta = Math.min(elapsed, 100) / (1000 / 60);
        const step = AUTO_SPEED * delta;

        totalCrankAngle += step;
        const rawSlide = (totalCrankAngle / 720) * VIEW_WIDTH;
        const fullSetWidth = totalPhotos * VIEW_WIDTH;
        const loopSlide = ((rawSlide % fullSetWidth) + fullSetWidth) % fullSetWidth;

        advanceTray(loopSlide);
        startPlayingAudio();

        autoRafId = requestAnimationFrame(autoPlayLoop);
    };


    // Start/stop audio
    const startPlayingAudio = () => {
        if (isPlaying) return;
        if (!audio && !ambientAudio) return;
        if (audio?.ended) return;
        isPlaying = true;
        digicamBox?.classList.add('is-playing');

        if (idleOverlay) idleOverlay.classList.add('hidden');
        if (lensCore) lensCore.classList.add('lens-active');

        if (!sourceNode) setupVisualizer(audio || ambientAudio);
        if (!ambientAudio) initAmbient();

        if (voiceGain && audioCtx) {
            voiceGain.gain.setValueAtTime(0, audioCtx.currentTime);
            voiceGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.4);
        }

        ambientAudio?.play().catch(() => { });
        if (audio && !audio.ended) audio.play().catch(() => { });
        updateVisuals();

        if (ambientGain && audioCtx) {
            ambientGain.gain.setTargetAtTime(0.085, audioCtx.currentTime, 0.5);
        }
    };

    const stopPlayingAudio = () => {
        const overlay = document.getElementById('countdown-overlay');
        if (overlay) overlay.remove();
        sfx.pause();
        sfx.currentTime = 0;

        if (!isPlaying) return;
        isPlaying = false;
        audio?.pause();
        ambientAudio?.pause();
        digicamBox?.classList.remove('is-playing');
        lensCore?.classList.remove('lens-active');

        if (ambientGain && audioCtx) {
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
            warmUpAudio();
            getAudioContext();
            _autoLastTime = 0;

            isAutoPlaying = !isAutoPlaying;
            toggleBtn.classList.toggle('is-active', isAutoPlaying);
            toggleBtn.querySelector('.auto-play-icon').textContent = isAutoPlaying ? 'pause' : 'play_arrow';
            toggleBtn.querySelector('.auto-play-text').textContent = isAutoPlaying ? 'PAUSE' : 'AUTO PLAY';

            if (isAutoPlaying) {
                if (!ambientAudio) initAmbient();
                if (countdownWasStarted) {
                    autoPlayLoop();
                } else {
                    runCountdownThenPlay();
                }
            } else {
                cancelAnimationFrame(autoRafId);
                stopPlayingAudio();
            }

            if (!sourceNode) setupVisualizer(audio || ambientAudio);
        });
    }

    if (audio) {
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('timeupdate', updateDuration);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && isAutoPlaying) {
            const ctx = getAudioContext();
            if (ctx && ctx.state === 'suspended') ctx.resume();
            if (audio && audio.paused && !audio.ended) audio.play().catch(() => { });
            if (ambientAudio && ambientAudio.paused) ambientAudio.play().catch(() => { });
        }
    });
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
    let giftIdParam = params.get('to');

    // Fallback: baca gift ID dari path jika tidak ada ?to= (e.g., /camera/silver/GIFT_ID)
    if (!giftIdParam) {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart !== 'index.html') {
            giftIdParam = lastPart;
        }
    }

    // Default test config (matches main landing page demo)
    giftConfig = {
        photos: [
            '../assets/1.jpg', '../assets/2.jpg', '../assets/3.jpg',
            '../assets/4.jpg', '../assets/5.jpg', '../assets/6.jpg',
            '../assets/7.jpg', '../assets/8.jpg', '../assets/9.jpg',
            '../assets/10.jpg'
        ],
        message: 'Selamat hari jadi yang ke-1! Terima kasih sudah selalu ada di sampingku. Ini adalah sedikit kenangan yang aku kumpulin buat kamu. Love you always! ✨',
        ambient: 'rain',
        voiceNote: {
            url: 'https://cdn.for-you-always.my.id/1772227226601-vibhce.mp3',
            duration: 300
        }
    };

    if (giftIdParam) {
        // Cek apakah ini mode preview dari studio
        if (giftIdParam === 'for-preview') {
            try {
                const previewStr = sessionStorage.getItem('studio_preview_config');
                if (previewStr) {
                    const previewConfig = JSON.parse(previewStr);
                    if (previewConfig && previewConfig.photos && previewConfig.photos.length > 0) {
                        giftConfig = previewConfig;
                        handleAfterLoad();
                        return;
                    }
                }
            } catch (e) {
                console.warn('[Camera] Could not read preview config from sessionStorage:', e);
            }
            // Fallback ke default config jika tidak ada sessionStorage
            handleAfterLoad();
            return;
        }

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
