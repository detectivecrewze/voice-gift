/**
 * generator.js
 * Logic for creating and accessing Studio projects.
 */

document.addEventListener('DOMContentLoaded', () => {
    const btnCreate = document.getElementById('btn-create');
    const formAccess = document.getElementById('form-access');
    const inputToken = document.getElementById('input-token');
    const btnRandomName = document.getElementById('btn-random-name');

    btnRandomName?.addEventListener('click', () => {
        const randomNum = Math.floor(10000000 + Math.random() * 90000000); // 8 digits
        const inputNewToken = document.getElementById('input-new-token');
        if (inputNewToken) {
            inputNewToken.value = 'auto-' + randomNum;
            inputNewToken.classList.add('bg-amber-50');
            setTimeout(() => inputNewToken.classList.remove('bg-amber-50'), 500);
        }
    });

    // ── Password Gate Logic ──────────────────────────────────
    const gate = document.getElementById('password-gate');
    const mainContent = document.getElementById('main-content');
    const btnUnlock = document.getElementById('btn-unlock-gate');
    const inputPass = document.getElementById('input-gate-pass');
    const gateError = document.getElementById('gate-error');

    const checkAuth = () => {
        if (sessionStorage.getItem('generator_unlocked') === 'true') {
            gate.classList.add('hidden');
            mainContent.classList.remove('hidden');
            document.getElementById('generator-tabs')?.classList.remove('hidden');
        }
    };

    const unlock = async () => {
        const pass = inputPass.value;
        if (!pass) return;

        btnUnlock.disabled = true;
        btnUnlock.innerText = 'MEMVERIFIKASI...';

        try {
            const response = await fetch(`${API_BASE_URL}/generator-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pass })
            });

            const result = await response.json();

            if (result.success) {
                sessionStorage.setItem('generator_unlocked', 'true');
                gate.classList.add('hidden');
                mainContent.classList.remove('hidden');
                document.getElementById('generator-tabs')?.classList.remove('hidden');
            } else {
                gateError.innerText = result.error || 'Password salah';
                gateError.classList.remove('hidden');
                inputPass.classList.add('border-red-400');
                setTimeout(() => inputPass.classList.remove('border-red-400'), 2000);
            }
        } catch (err) {
            console.error('[Generator] Auth error:', err);
            gateError.innerText = 'Gagal terhubung ke server';
            gateError.classList.remove('hidden');
        } finally {
            btnUnlock.disabled = false;
            btnUnlock.innerText = 'BUKA AKSES';
        }
    };

    btnUnlock?.addEventListener('click', unlock);
    inputPass?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') unlock();
    });

    // Check on load
    checkAuth();

    const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';

    // ── Helper: Show Status Message ──────────────────────────────
    const showStatus = (message, isError = false) => {
        const statusEl = document.getElementById('update-password-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.classList.remove('hidden', 'text-green-600', 'text-rose-500');
            statusEl.classList.add(isError ? 'text-rose-500' : 'text-green-600');
            if (!isError) {
                setTimeout(() => statusEl.classList.add('hidden'), 4000);
            }
        }
    };

    // 1. Create New Project (Reguler & Premium)
    const btnCreatePremium = document.getElementById('btn-create-premium');

    const handleCreateProject = async (isPremium, btnEl) => {
        const customName = document.getElementById('input-new-token')?.value.trim();
        const studioPass = document.getElementById('input-studio-pass')?.value.trim();
        const giftPass = document.getElementById('input-gift-pass')?.value.trim();
        const defaultTheme = 'rose';
        let finalId = '';

        if (customName) {
            // Sanitize: lowercase and replace non-alphanumeric with hyphen
            finalId = customName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

            // Minimal length check
            if (finalId.length < 3) {
                alert('Nama project minimal 3 karakter.');
                return;
            }
        } else {
            // Generate random ID: "project-xxxxxx"
            finalId = 'project-' + Math.random().toString(36).substr(2, 6);
        }

        // ── INITIAL PERSISTENCE ──────────────────────────────
        const originalText = btnEl.innerText;
        btnEl.innerText = 'Mengecek...';
        btnEl.style.opacity = '0.5';
        btnEl.disabled = true;

        try {
            // ── DUPLICATE CHECK: Cek apakah nama sudah ada ──────────────────
            const checkResponse = await fetch(`${API_BASE_URL}/get-config?id=${finalId}`);

            if (checkResponse.ok) {
                const existingData = await checkResponse.json();
                if (existingData && !existingData.error) {
                    // Project SUDAH ADA → Block dan beritahu user
                    alert(`Nama project "${finalId}" sudah digunakan!\n\nGunakan section "Update Password Project" di bawah untuk mengganti password project yang sudah ada.`);
                    btnEl.innerText = originalText;
                    btnEl.style.opacity = '1';
                    btnEl.disabled = false;
                    return;
                }
            }

            // Project TIDAK ADA → Lanjut create baru
            btnEl.innerText = 'Menyimpan...';

            // Initial state - REVISED: Include mandatory IDs and default values
            const initialState = {
                studioToken: finalId,
                giftId: finalId,
                occasion: 'romantic',
                theme: defaultTheme,
                recipientName: 'Someone Special',
                message: '',
                photos: [],
                voiceNote: { url: null, duration: null, mimeType: null },
                studioPassword: studioPass || null,
                password: giftPass || null,
                status: 'draft',
                createdAt: new Date().toISOString(),
                isPremium: isPremium
            };

            const response = await fetch(`${API_BASE_URL}/save-config?id=${finalId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(initialState)
            });

            if (response.ok) {
                const res = await response.json();
            } else {
                console.warn('[Generator] Save returned non-ok:', response.status);
            }
        } catch (err) {
            console.error('[Generator] Critical save error:', err);
        }

        // Delay to ensure KV propagation
        setTimeout(() => {
            const currentUrl = new URL(window.location.href);
            const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;
            const studioLink = isPremium ? `${baseUrl}/studio-premium/${finalId}` : `${baseUrl}/studio/${finalId}`;
            const giftLink = isPremium ? `${baseUrl}/gift-premium/?id=${finalId}` : `${baseUrl}/gift/?id=${finalId}`;

            document.getElementById('result-id').textContent = finalId;
            document.getElementById('result-studio').textContent = studioLink;
            document.getElementById('result-gift').textContent = giftLink;
            document.getElementById('btn-go-to-studio').href = studioLink;

            document.getElementById('main-content').classList.add('hidden');
            document.getElementById('form-access')?.classList.add('hidden');
            document.getElementById('section-update-password')?.classList.add('hidden');
            document.querySelectorAll('.relative.py-4').forEach(d => d.classList.add('hidden'));
            
            document.getElementById('result-card').classList.remove('hidden');
        }, 600);
    };

    btnCreate?.addEventListener('click', () => handleCreateProject(false, btnCreate));
    btnCreatePremium?.addEventListener('click', () => handleCreateProject(true, btnCreatePremium));

    // 2. Access Existing Project
    formAccess?.addEventListener('submit', (e) => {
        e.preventDefault();
        const token = inputToken.value.trim();
        if (token) {
            window.location.href = `../studio/${token}`;
        } else {
            inputToken.classList.add('border-red-300');
            setTimeout(() => inputToken.classList.remove('border-red-300'), 2000);
        }
    });

    // 3. Update Password for Existing Project
    const btnUpdatePassword = document.getElementById('btn-update-password');
    btnUpdatePassword?.addEventListener('click', async () => {
        const projectId = document.getElementById('input-update-project-name')?.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        const oldStudioPass = document.getElementById('input-old-studio-pass')?.value.trim();
        const newStudioPass = document.getElementById('input-new-studio-pass')?.value.trim();
        const newGiftPass = document.getElementById('input-new-gift-pass')?.value.trim();

        // Validasi input
        if (!projectId) {
            showStatus('Masukkan nama project!', true);
            return;
        }

        if (projectId.length < 3) {
            showStatus('Nama project minimal 3 karakter!', true);
            return;
        }

        // Set loading state
        btnUpdatePassword.innerText = 'Memproses...';
        btnUpdatePassword.style.opacity = '0.5';
        btnUpdatePassword.disabled = true;

        try {
            // 1. Fetch existing data
            const response = await fetch(`${API_BASE_URL}/get-config?id=${projectId}`);

            if (!response.ok) {
                showStatus('Project tidak ditemukan!', true);
                btnUpdatePassword.innerText = 'Update Password';
                btnUpdatePassword.style.opacity = '1';
                btnUpdatePassword.disabled = false;
                return;
            }

            const existingData = await response.json();

            if (!existingData || existingData.error) {
                showStatus('Project tidak ditemukan!', true);
                btnUpdatePassword.innerText = 'Update Password';
                btnUpdatePassword.style.opacity = '1';
                btnUpdatePassword.disabled = false;
                return;
            }

            // 2. Verify old password (jika project punya studioPassword)
            if (existingData.studioPassword && existingData.studioPassword.trim() !== '') {
                if (oldStudioPass !== existingData.studioPassword) {
                    showStatus('Password studio lama salah!', true);
                    btnUpdatePassword.innerText = 'Update Password';
                    btnUpdatePassword.style.opacity = '1';
                    btnUpdatePassword.disabled = false;
                    return;
                }
            }

            // 3. Merge: keep all existing data, only update passwords
            const updatedData = {
                ...existingData,
                studioPassword: newStudioPass || existingData.studioPassword,
                password: newGiftPass !== undefined ? (newGiftPass || existingData.password) : existingData.password,
                updatedAt: new Date().toISOString()
            };

            // 4. Save to API
            const saveResponse = await fetch(`${API_BASE_URL}/save-config?id=${projectId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (saveResponse.ok) {
                showStatus('✓ Password berhasil diupdate!', false);
                // Clear inputs
                document.getElementById('input-update-project-name').value = '';
                document.getElementById('input-old-studio-pass').value = '';
                document.getElementById('input-new-studio-pass').value = '';
                document.getElementById('input-new-gift-pass').value = '';
            } else {
                showStatus('Gagal menyimpan. Coba lagi.', true);
            }

        } catch (err) {
            console.error('[Generator] Update password error:', err);
            showStatus('Terjadi kesalahan. Coba lagi.', true);
        }

        // Reset button
        btnUpdatePassword.innerText = 'Update Password';
        btnUpdatePassword.style.opacity = '1';
        btnUpdatePassword.disabled = false;
    });

    // ── 4. Generate Bundle Token (Admin) ─────────────────────
    const btnCreateBundle    = document.getElementById('btn-create-bundle');
    const bundleResult       = document.getElementById('bundle-result');
    const bundleTokenDisplay = document.getElementById('bundle-token-display');
    const btnCopyBundle      = document.getElementById('btn-copy-bundle-token');
    const bundleError        = document.getElementById('bundle-error');

    btnCreateBundle?.addEventListener('click', async () => {
        const limit = parseInt(document.getElementById('input-bundle-limit')?.value || 5);
        const note  = document.getElementById('input-bundle-note')?.value.trim() || '';

        // Need the generator password that was already used to unlock, stored in sessionStorage
        // We'll use the GENERATOR_SECRET via the worker - pass it as Bearer token
        // Note: password is re-sent for the API call (user must know it)
        const pass = prompt('Masukkan password generator untuk generate token:');
        if (!pass) return;

        btnCreateBundle.innerText = 'Membuat Token...';
        btnCreateBundle.disabled = true;
        bundleResult.classList.add('hidden');
        bundleError.classList.add('hidden');

        try {
            const res = await fetch(`${API_BASE_URL}/api/bundle/create-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pass}`
                },
                body: JSON.stringify({ limit, note })
            });

            const json = await res.json();

            if (json.success) {
                bundleTokenDisplay.textContent = json.token;
                bundleResult.classList.remove('hidden');
                bundleError.classList.add('hidden');

                // Store for copy
                bundleResult.dataset.token = json.token;
            } else {
                bundleError.textContent = json.error || 'Gagal membuat token.';
                bundleError.classList.remove('hidden');
            }
        } catch (err) {
            bundleError.textContent = 'Tidak dapat terhubung ke server.';
            bundleError.classList.remove('hidden');
        } finally {
            btnCreateBundle.innerText = '🎟 Generate Token Bundle';
            btnCreateBundle.disabled = false;
        }
    });

    btnCopyBundle?.addEventListener('click', () => {
        const token = bundleResult?.dataset.token;
        if (!token) return;
        navigator.clipboard.writeText(token).then(() => {
            btnCopyBundle.textContent = '✓ Tersalin!';
            setTimeout(() => { btnCopyBundle.textContent = 'Salin Token'; }, 2000);
        }).catch(() => {
            prompt('Salin token ini:', token);
        });
    });

    // ── Tabs Navigation ──────────────────────────────────────
    const tabProject = document.getElementById('tab-btn-project');
    const tabQr = document.getElementById('tab-btn-qr');
    const panelStudio = document.getElementById('main-content');
    const panelQr = document.getElementById('panel-qr');
    const formAccessRef = document.getElementById('form-access');
    const sectionUpdateRef = document.getElementById('section-update-password');
    const dividers = document.querySelectorAll('.relative.py-4');

    const showQRCodes = () => {
        panelStudio.classList.add('hidden');
        if(formAccessRef) formAccessRef.classList.add('hidden');
        if(sectionUpdateRef) sectionUpdateRef.classList.add('hidden');
        dividers.forEach(d => d.classList.add('hidden'));
        document.getElementById('result-card').classList.add('hidden');
        
        panelQr.classList.remove('hidden');
        
        tabQr.classList.add('bg-[#fcfaf7]', 'border', 'border-[#d4a373]/20', 'text-[#b58756]', 'shadow-sm', 'pointer-events-none');
        tabQr.classList.remove('text-gray-400', 'hover:text-gray-900');
        
        tabProject.classList.remove('bg-[#fcfaf7]', 'border', 'border-[#d4a373]/20', 'text-[#b58756]', 'shadow-sm', 'pointer-events-none');
        tabProject.classList.add('text-gray-400', 'hover:text-gray-900');
    };

    const showProject = () => {
        panelQr.classList.add('hidden');
        document.getElementById('result-card').classList.add('hidden');
        
        panelStudio.classList.remove('hidden');
        if(formAccessRef) formAccessRef.classList.remove('hidden');
        if(sectionUpdateRef) sectionUpdateRef.classList.remove('hidden');
        dividers.forEach(d => d.classList.remove('hidden'));
        
        tabProject.classList.add('bg-[#fcfaf7]', 'border', 'border-[#d4a373]/20', 'text-[#b58756]', 'shadow-sm', 'pointer-events-none');
        tabProject.classList.remove('text-gray-400', 'hover:text-gray-900');
        
        tabQr.classList.remove('bg-[#fcfaf7]', 'border', 'border-[#d4a373]/20', 'text-[#b58756]', 'shadow-sm', 'pointer-events-none');
        tabQr.classList.add('text-gray-400', 'hover:text-gray-900');
    };

    tabQr?.addEventListener('click', showQRCodes);
    tabProject?.addEventListener('click', showProject);
    document.getElementById('btn-create-another')?.addEventListener('click', showProject);

    // ── QR Code Logic ────────────────────────────────────────
    let qrcodeInstance = null;
    document.getElementById('btn-create-qr')?.addEventListener('click', () => {
        const link = document.getElementById('qr-input-link').value.trim();
        if (!link) return alert('Masukkan link terlebih dahulu!');
        
        const qrBox = document.getElementById('qr-code-box');
        const qrContainer = document.getElementById('qr-result');
        
        // Clear previous QR
        qrBox.innerHTML = '';
        qrContainer.classList.remove('hidden');
        qrContainer.classList.add('flex');
        
        // Generate new
        qrcodeInstance = new QRCode(qrBox, {
            text: link,
            width: 128,
            height: 128,
            colorDark: "#1a1a1a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    });

    document.getElementById('btn-download-qr')?.addEventListener('click', async () => {
        const container = document.getElementById('qr-export-container');
        if (!container) return;
        
        try {
            const btn = document.getElementById('btn-download-qr');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Memproses...';
            
            const canvas = await html2canvas(container, {
                scale: 3,
                backgroundColor: null,
                logging: false,
                useCORS: true
            });
            
            const link = document.createElement('a');
            link.download = `polaroid-qr-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            btn.innerHTML = 'Berhasil Didownload! ✓';
            setTimeout(() => btn.innerHTML = originalText, 2000);
        } catch (err) {
            console.error('Download QR failed:', err);
            alert('Gagal mendownload QR code. Silakan coba lagi.');
        }
    });

    document.getElementById('btn-jump-to-qr')?.addEventListener('click', () => {
        const giftLink = document.getElementById('result-gift').textContent;
        document.getElementById('generator-tabs').classList.remove('hidden');
        showQRCodes();
        document.getElementById('qr-input-link').value = giftLink;
        document.getElementById('btn-create-qr').click();
    });

    // ── Utilities (Toast & Copy) ─────────────────────────────
    const showToast = (msg) => {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    };

    document.querySelectorAll('.btn-copy-link').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.getAttribute('data-target');
            const url = document.getElementById(targetId).textContent;
            navigator.clipboard.writeText(url).then(() => showToast('Link berhasil disalin!'));
        });
    });
});
