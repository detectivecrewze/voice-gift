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

    // 1. Create New Project
    btnCreate?.addEventListener('click', () => {
        const customName = document.getElementById('input-new-token')?.value.trim();
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

        // Premium transition effect (optional)
        btnCreate.innerText = 'Mempersiapkan...';
        btnCreate.style.opacity = '0.5';

        setTimeout(() => {
            window.location.href = `../studio/index.html?token=${finalId}`;
        }, 800);
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
});
