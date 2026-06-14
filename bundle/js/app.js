/**
 * Bundle Studio - Portal Kado Eksklusif
 * app.js v1
 */

const WORKER_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';
const BASE_GIFT_URL = 'https://voice.for-you-always.my.id/gift/';
const BASE_STUDIO_URL = 'https://voice.for-you-always.my.id/studio-premium/';
const SESSION_KEY = 'bundle_session';

// ── DOM References ──
const viewLogin     = document.getElementById('view-login');
const viewDashboard = document.getElementById('view-dashboard');
const viewCreate    = document.getElementById('view-create');
const viewSuccess   = document.getElementById('view-success');

const inputToken   = document.getElementById('input-token');
const btnLogin     = document.getElementById('btn-login');
const loginAlert   = document.getElementById('login-alert');

const quotaDisplay  = document.getElementById('quota-display');
const tokenDisplay  = document.getElementById('token-display');
const btnNewGift    = document.getElementById('btn-new-gift');
const giftList      = document.getElementById('gift-list');
const quotaAlert    = document.getElementById('quota-alert');
const btnLogout     = document.getElementById('btn-logout');

const inputGiftName = document.getElementById('input-gift-name');
const availStatus   = document.getElementById('avail-status');
const btnClaim      = document.getElementById('btn-claim');
const btnCancelCreate = document.getElementById('btn-cancel-create');
const createAlert   = document.getElementById('create-alert');

const successGiftUrl  = document.getElementById('success-gift-url');
const btnCopySuccess  = document.getElementById('btn-copy-success');
const btnOpenSuccess  = document.getElementById('btn-open-success');
const btnSuccessBack  = document.getElementById('btn-success-back');

const confirmModal    = document.getElementById('confirm-modal');
const confirmGiftName = document.getElementById('confirm-gift-name');
const btnModalCancel  = document.getElementById('btn-modal-cancel');
const btnModalConfirm = document.getElementById('btn-modal-confirm');

// ── State ──
let sessionToken = null;
let sessionData  = null;
let checkTimer   = null;
let lastCheckedName = '';
let isAvailable  = false;

// ── Helpers ──
function showAlert(el, msg, type = 'error') {
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.classList.remove('hidden');
}

function hideAlert(el) {
    el.classList.add('hidden');
}

function setLoading(btn, loading, originalText) {
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span>Memproses...`;
    } else {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function showView(view) {
    [viewLogin, viewDashboard, viewCreate, viewSuccess].forEach(v => v.classList.add('hidden'));
    view.classList.remove('hidden');
}

function slugify(val) {
    return val
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/g, ''); // Hanya hapus tanda strip di awal, biarkan di akhir saat mengetik.
}

// ── Session Persistence ──
function saveSession(token, data) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, data }));
}

function loadSession() {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
}

function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionToken = null;
    sessionData  = null;
}

// ── Render Dashboard ──
function renderDashboard(data) {
    sessionData = data;
    const used  = data.used || 0;
    const limit = data.max_limit || 5;
    const sisa  = Math.max(0, limit - used);

    tokenDisplay.textContent = `Token: ${sessionToken}`;
    quotaDisplay.innerHTML   = `${sisa} <span>/ ${limit}</span>`;

    // Disable button if no quota
    if (sisa === 0) {
        btnNewGift.disabled = true;
        btnNewGift.textContent = 'Kuota Habis';
        showAlert(quotaAlert, 'Kuota kado Anda sudah habis. Hubungi admin untuk pembelian token baru.', 'info');
    } else {
        btnNewGift.disabled = false;
        btnNewGift.textContent = '✦ Buat Gift Baru';
        hideAlert(quotaAlert);
    }

    // Render gift list
    const items = data.created_gifts || [];
    if (items.length === 0) {
        giftList.innerHTML = `<li class="empty-list">Anda belum membuat gift apapun.<br>Klik "Buat Gift Baru" untuk memulai.</li>`;
    } else {
        giftList.innerHTML = items.map(giftId => `
            <li class="gift-item">
                <div class="gift-icon">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path></svg>
                </div>
                <div class="gift-item-left">
                    <span class="gift-item-name">${giftId}</span>
                    <span class="gift-item-status">Tersimpan di Studio</span>
                </div>
                <div class="gift-actions">
                    <a href="${BASE_STUDIO_URL}${giftId}" target="_blank" class="btn-view">Buka</a>
                </div>
            </li>
        `).join('');
    }

    showView(viewDashboard);
}

// ── API: Login / Verify Token ──
async function doLogin(token) {
    setLoading(btnLogin, true, 'Masuk Portal');
    hideAlert(loginAlert);

    try {
        const res = await fetch(`${WORKER_URL}/api/bundle/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.trim().toUpperCase() })
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
            showAlert(loginAlert, json.error || 'Token tidak valid. Coba lagi.', 'error');
        } else {
            sessionToken = token.trim().toUpperCase();
            saveSession(sessionToken, json.data);
            renderDashboard(json.data);
        }
    } catch (err) {
        showAlert(loginAlert, 'Tidak dapat terhubung ke server. Periksa koneksi Anda.', 'error');
    } finally {
        setLoading(btnLogin, false, 'Masuk Portal');
    }
}

// ── API: Check Availability ──
async function checkAvailability(name) {
    if (!name || name.length < 2) {
        availStatus.innerHTML = '';
        btnClaim.disabled = true;
        isAvailable = false;
        return;
    }

    availStatus.innerHTML = `<div class="avail-indicator avail-checking"><span class="avail-dot"></span>Mengecek ketersediaan...</div>`;
    btnClaim.disabled = true;
    isAvailable = false;

    try {
        const res = await fetch(`${WORKER_URL}/api/bundle/check-name?name=${encodeURIComponent(name)}`);
        const json = await res.json();

        if (json.available) {
            availStatus.innerHTML = `<div class="avail-indicator avail-ok"><span class="avail-dot"></span>Nama tersedia! Link ini bisa Anda gunakan.</div>`;
            btnClaim.disabled = false;
            isAvailable = true;
        } else {
            availStatus.innerHTML = `<div class="avail-indicator avail-err"><span class="avail-dot"></span>Nama ini sudah dipakai. Coba nama lain.</div>`;
            btnClaim.disabled = true;
            isAvailable = false;
        }
    } catch {
        availStatus.innerHTML = `<div class="avail-indicator avail-err"><span class="avail-dot"></span>Gagal mengecek. Coba lagi.</div>`;
        btnClaim.disabled = true;
        isAvailable = false;
    }
}

// ── API: Claim Link ──
async function doClaim() {
    let rawName = inputGiftName.value.trim();
    rawName = rawName.replace(/-+$/g, ''); // buang strip di akhir saat tombol diklik
    const giftName = slugify(rawName);

    if (!giftName || giftName.length < 2) {
        showAlert(createAlert, 'Nama kado minimal 2 karakter.', 'error');
        return;
    }

    if (!isAvailable) {
        showAlert(createAlert, 'Nama ini belum terverifikasi tersedia. Tunggu sebentar atau ganti nama.', 'error');
        return;
    }

    // Tampilkan Modal Custom
    confirmGiftName.textContent = giftName;
    confirmModal.classList.remove('hidden');

    btnModalCancel.onclick = () => {
        confirmModal.classList.add('hidden');
    };

    btnModalConfirm.onclick = () => {
        confirmModal.classList.add('hidden');
        processClaim(giftName);
    };
}

async function processClaim(giftName) {
    setLoading(btnClaim, true, 'Pesan Link Ini');
    hideAlert(createAlert);

    try {
        const res = await fetch(`${WORKER_URL}/api/bundle/claim-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: sessionToken, giftId: giftName })
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
            showAlert(createAlert, json.error || 'Gagal membuat kado. Coba lagi.', 'error');
        } else {
            saveSession(sessionToken, json.data);
            
            // Render the dashboard data in the background
            renderDashboard(json.data);

            // Setup Success View
            const studioUrl = `${BASE_STUDIO_URL}${giftName}`;
            successGiftUrl.textContent = studioUrl;
            
            btnCopySuccess.onclick = () => {
                navigator.clipboard.writeText(studioUrl);
                const ori = btnCopySuccess.innerHTML;
                btnCopySuccess.innerHTML = '✅ Berhasil Disalin';
                setTimeout(() => btnCopySuccess.innerHTML = ori, 2000);
            };
            
            btnOpenSuccess.onclick = () => {
                window.open(studioUrl, '_blank');
            };
            
            btnSuccessBack.onclick = () => {
                showView(viewDashboard);
            };

            showView(viewSuccess);
            
            // clear form
            inputGiftName.value = '';
            availStatus.innerHTML = '';
        }
    } catch (err) {
        showAlert(createAlert, 'Tidak dapat terhubung ke server.', 'error');
    } finally {
        setLoading(btnClaim, false, 'Pesan Link Ini');
    }
}

// ── Live Name Input ──
inputGiftName.addEventListener('input', () => {
    const raw = inputGiftName.value;
    const slug = slugify(raw);
    // Show slugified preview if different
    if (raw !== slug && raw.length > 0) {
        inputGiftName.value = slug;
    }

    const name = slug;
    lastCheckedName = name;

    availStatus.innerHTML = '';
    btnClaim.disabled = true;
    isAvailable = false;

    clearTimeout(checkTimer);
    
    // Jangan lakukan pengecekan worker jika nama diakhiri dengan '-'
    // Tunggu sampai user selesai mengetik huruf berikutnya
    if (name.length >= 2 && !name.endsWith('-')) {
        checkTimer = setTimeout(() => {
            if (inputGiftName.value === name) {
                checkAvailability(name);
            }
        }, 600);
    }
});

// ── Event Listeners ──
btnLogin.addEventListener('click', () => {
    const t = inputToken.value.trim();
    if (!t) { showAlert(loginAlert, 'Masukkan kode token Anda.', 'error'); return; }
    doLogin(t);
});

inputToken.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnLogin.click();
});

btnNewGift.addEventListener('click', () => {
    inputGiftName.value = '';
    availStatus.innerHTML = '';
    btnClaim.disabled = true;
    isAvailable = false;
    hideAlert(createAlert);
    showView(viewCreate);
    setTimeout(() => inputGiftName.focus(), 100);
});

btnClaim.addEventListener('click', doClaim);

btnCancelCreate.addEventListener('click', () => {
    hideAlert(createAlert);
    showView(viewDashboard);
});

btnLogout.addEventListener('click', () => {
    clearSession();
    inputToken.value = '';
    hideAlert(loginAlert);
    showView(viewLogin);
});

// ── Init: Check existing session ──
(function init() {
    const session = loadSession();
    if (session && session.token && session.data) {
        sessionToken = session.token;
        renderDashboard(session.data);
    } else {
        showView(viewLogin);
    }
})();
