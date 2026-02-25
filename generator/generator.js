/**
 * generator.js
 * Logic for creating and accessing Studio projects.
 */

document.addEventListener('DOMContentLoaded', () => {
    const btnCreate = document.getElementById('btn-create');
    const formAccess = document.getElementById('form-access');
    const inputToken = document.getElementById('input-token');

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
        }
    };

    const unlock = () => {
        const pass = inputPass.value;
        if (pass === '12345') {
            sessionStorage.setItem('generator_unlocked', 'true');
            gate.classList.add('hidden');
            mainContent.classList.remove('hidden');
        } else {
            gateError.classList.remove('hidden');
            inputPass.classList.add('border-red-400');
            setTimeout(() => inputPass.classList.remove('border-red-400'), 2000);
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

    // 1. Create New Project
    btnCreate?.addEventListener('click', async () => {
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
        btnCreate.innerText = 'Mengecek...';
        btnCreate.style.opacity = '0.5';
        btnCreate.disabled = true;

        try {
            // ── DUPLICATE CHECK: Cek apakah nama sudah ada ──────────────────
            const checkResponse = await fetch(`${API_BASE_URL}/get-config?id=${finalId}`);

            if (checkResponse.ok) {
                const existingData = await checkResponse.json();
                if (existingData && !existingData.error) {
                    // Project SUDAH ADA → Block dan beritahu user
                    alert(`Nama project "${finalId}" sudah digunakan!\n\nGunakan section "Update Password Project" di bawah untuk mengganti password project yang sudah ada.`);
                    btnCreate.innerText = 'Buat Project Sekarang';
                    btnCreate.style.opacity = '1';
                    btnCreate.disabled = false;
                    return;
                }
            }

            // Project TIDAK ADA → Lanjut create baru
            btnCreate.innerText = 'Menyimpan...';

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
                createdAt: new Date().toISOString()
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
            window.location.href = `../studio/index.html?token=${finalId}`;
        }, 600);
    });

    // 2. Access Existing Project
    formAccess?.addEventListener('submit', (e) => {
        e.preventDefault();
        const token = inputToken.value.trim();
        if (token) {
            window.location.href = `../studio/index.html?token=${token}`;
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
});
