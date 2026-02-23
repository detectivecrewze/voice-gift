/**
 * admin.js
 * Logic for fetching and displaying published gifts.
 */

const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
    const btnRefresh = document.getElementById('btn-refresh');
    const adminSecretInput = document.getElementById('admin-secret');
    const tableBody = document.getElementById('gift-table-body');
    const bulkActions = document.getElementById('bulk-actions');
    const selectedCount = document.getElementById('selected-count');
    const btnBulkDelete = document.getElementById('btn-bulk-delete');
    const selectAllCheckbox = document.getElementById('select-all');
    const searchInput = document.getElementById('search-input');
    const filterTheme = document.getElementById('filter-theme');
    const filterVoice = document.getElementById('filter-voice');
    const filterStatus = document.getElementById('filter-status');

    let allGiftsRaw = [];
    let allGifts = [];
    let selectedIds = new Set();

    const updateBulkActionsUI = () => {
        if (selectedIds.size > 0) {
            bulkActions.classList.remove('hidden');
            selectedCount.innerText = `${selectedIds.size} Item Terpilih`;
        } else {
            bulkActions.classList.add('hidden');
        }

        if (allGifts.length > 0) {
            selectAllCheckbox.checked = selectedIds.size === allGifts.length;
            selectAllCheckbox.indeterminate = selectedIds.size > 0 && selectedIds.size < allGifts.length;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    };

    // Load secret from localStorage if exists
    if (localStorage.getItem('admin_secret')) {
        adminSecretInput.value = localStorage.getItem('admin_secret');
    }

    const fetchGifts = async () => {
        const secret = adminSecretInput.value.trim();
        if (!secret) {
            alert('Masukkan Admin Secret dulu!');
            return;
        }

        // Save for convenience
        localStorage.setItem('admin_secret', secret);

        btnRefresh.innerText = 'MEMUAT...';
        btnRefresh.disabled = true;
        selectedIds.clear();
        updateBulkActionsUI();

        try {
            const response = await fetch(`${API_BASE_URL}/admin/list-gifts`, {
                headers: {
                    'Authorization': `Bearer ${secret}`
                }
            });

            const data = await response.json();

            if (data.success) {
                allGiftsRaw = data.gifts;
                renderSummary(data.gifts);
                applyFilters(); // This will call renderTable internally
            } else {
                alert('Gagal mengambil data: ' + (data.error || 'Unknown error'));
                tableBody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-red-400 text-xs font-bold">Error: ${data.error}</td></tr>`;
            }
        } catch (err) {
            console.error('[Admin] Fetch error detail:', err);
            alert('Terjadi kesalahan koneksi. Silakan cek Console (F12) untuk detailnya.');
        } finally {
            btnRefresh.innerText = 'REFRESH DATA';
            btnRefresh.disabled = false;
        }
    };

    const renderSummary = (gifts) => {
        const summarySection = document.getElementById('summary-section');
        if (!gifts || gifts.length === 0) {
            summarySection.classList.add('hidden');
            return;
        }

        summarySection.classList.remove('hidden');

        // 1. Total Gifts
        document.getElementById('stat-total').innerText = gifts.length;

        // 2. New Today
        const now = new Date();
        const oneDayAgo = now.getTime() - (24 * 60 * 60 * 1000);
        const newToday = gifts.filter(g => new Date(g.publishedAt).getTime() > oneDayAgo).length;
        document.getElementById('stat-today').innerText = newToday;

        // 3. Top Theme
        const themeCounts = {};
        gifts.forEach(g => {
            const t = String(g.theme || 'rose').toLowerCase();
            themeCounts[t] = (themeCounts[t] || 0) + 1;
        });
        const topTheme = Object.keys(themeCounts).reduce((a, b) => themeCounts[a] > themeCounts[b] ? a : b);

        // Pretty name mapping
        const themeNames = {
            'rose': 'Original', 'original': 'Original', 'pinky': 'Magenta',
            'beige': 'Rosewood', 'blanc': 'Midnight', 'white': 'Midnight',
            'sage': 'Mossy', 'camera': 'Silver', 'midnight': 'Midnight',
            'rosewood': 'Rosewood', 'mossy': 'Mossy'
        };
        document.getElementById('stat-theme').innerText = themeNames[topTheme] || topTheme.toUpperCase();

        // 4. Top Audio
        const audioCounts = {};
        gifts.forEach(g => {
            const a = String(g.ambient || 'none').toLowerCase();
            audioCounts[a] = (audioCounts[a] || 0) + 1;
        });
        const topAudioRaw = Object.keys(audioCounts).reduce((a, b) => audioCounts[a] > audioCounts[b] ? a : b);

        // Pretty audio mapping
        const audioNames = {
            'none': 'Hening', 'rain': 'Rain', 'cafe': 'Cafe', 'waves': 'Waves',
            'fireplace': 'Fire', 'forest': 'Forest', 'nadin-ah': 'Nadin',
            'daniel': 'Daniel', 'mitski': 'Mitski'
        };
        document.getElementById('stat-audio').innerText = audioNames[topAudioRaw] || topAudioRaw.toUpperCase();
    };

    const renderTable = (gifts) => {
        allGifts = gifts;
        if (!gifts || gifts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="p-12 text-center text-gray-400 text-xs italic">Belum ada kado yang sesuai kriteria pencarian.</td></tr>`;
            return;
        }

        // Sort by date descending
        gifts.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

        tableBody.innerHTML = gifts.map(gift => {
            const isSelected = selectedIds.has(gift.giftId);
            const date = gift.publishedAt ? new Date(gift.publishedAt).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '-';

            const CAMERA_THEMES = ['camera', 'midnight', 'rosewood', 'mossy'];
            const GIFT_PAGE_THEME_FOLDERS = {
                'rose': 'gift', 'original': 'gift', 'pinky': 'gift-pinky',
                'beige': 'gift-beige', 'blanc': 'gift-blanc', 'white': 'gift-blanc',
                'sage': 'gift-sage'
            };
            const CAMERA_THEME_FOLDERS = {
                'camera': 'gift-camera', 'midnight': 'gift-camera-midnight',
                'rosewood': 'gift-camera-rosewood', 'mossy': 'gift-camera-mossy'
            };

            let themeBadgeClass = 'bg-white/10 text-white/80';
            let displayTheme = 'Original';

            const theme = String(gift.theme || 'rose').toLowerCase();
            const isCamera = CAMERA_THEMES.includes(theme);

            if (theme === 'pinky') { themeBadgeClass = 'bg-pink-500/20 text-pink-400 border border-pink-500/30'; displayTheme = 'Magenta'; }
            else if (theme === 'rose' || theme === 'original') { themeBadgeClass = 'bg-rose-500/20 text-rose-300 border border-rose-500/30'; displayTheme = 'Original'; }
            else if (theme === 'beige') { themeBadgeClass = 'bg-orange-500/20 text-orange-400 border border-orange-500/30'; displayTheme = 'Rosewood'; }
            else if (theme === 'blanc' || theme === 'white') { themeBadgeClass = 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'; displayTheme = 'Midnight'; }
            else if (theme === 'sage') { themeBadgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'; displayTheme = 'Mossy'; }
            else if (theme === 'camera') { themeBadgeClass = 'bg-gray-500/20 text-gray-300 border border-gray-500/30'; displayTheme = 'Silver'; }
            else if (theme === 'midnight') { themeBadgeClass = 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'; displayTheme = 'Midnight'; }
            else if (theme === 'rosewood') { themeBadgeClass = 'bg-orange-500/20 text-orange-400 border border-orange-500/30'; displayTheme = 'Rosewood'; }
            else if (theme === 'mossy') { themeBadgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'; displayTheme = 'Mossy'; }
            else { displayTheme = theme; }

            const giftFolder = isCamera
                ? (CAMERA_THEME_FOLDERS[theme] || 'gift-camera')
                : (GIFT_PAGE_THEME_FOLDERS[theme] || 'gift');
            const studioPath = isCamera ? 'gift-camera/studio' : 'studio';
            const giftUrl = `${window.location.origin}/${giftFolder}/index.html?to=${gift.giftId}`;
            const editorUrl = `../${studioPath}/index.html?token=${gift.giftId}`;
            const productLabel = isCamera ? '📷 Gift Camera' : '📝 Gift Pages';
            const productClass = isCamera ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

            let sfxText = 'Hening';
            const ambient = String(gift.ambient || 'none').toLowerCase();
            if (ambient !== 'none') {
                if (ambient === 'rain') sfxText = 'Rain';
                else if (ambient === 'cafe') sfxText = 'Cafe';
                else if (ambient === 'waves') sfxText = 'Waves';
                else if (ambient === 'fireplace') sfxText = 'Fire';
                else if (ambient === 'forest') sfxText = 'Forest';
                else if (ambient === 'nadin-ah') sfxText = 'Nadin';
                else if (ambient === 'daniel') sfxText = 'Daniel';
                else if (ambient === 'mitski') sfxText = 'Mitski';
                else sfxText = gift.ambient;
            }

            const lastOpenedDate = gift.lastOpened ? new Date(gift.lastOpened).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '<span class="text-white/20 italic">Belum dibuka</span>';

            const isStale = gift.lastOpened && (new Date() - new Date(gift.lastOpened)) > (30 * 24 * 60 * 60 * 1000);

            return `
                <tr class="${isSelected ? 'bg-white/5' : ''} ${isStale ? 'opacity-40' : ''} transition-all border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td class="p-6">
                        <input type="checkbox" data-id="${gift.giftId}" ${isSelected ? 'checked' : ''} 
                               class="gift-checkbox rounded-md border-white/10 bg-white/5 text-[#ff4d6d] focus:ring-[#ff4d6d] cursor-pointer w-4 h-4">
                    </td>
                    <td class="p-6">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold font-mono tracking-tight text-white">${gift.giftId}</span>
                            <a href="${giftUrl}" target="_blank" class="text-[9px] text-[#ff4d6d] hover:underline mt-1 font-bold tracking-widest uppercase">Inspect Link ↗</a>
                        </div>
                    </td>
                    <td class="p-6">
                        <span class="text-xs font-semibold text-white/90">${gift.recipientName || '(Tanpa Nama)'}</span>
                    </td>
                    <td class="p-6">
                        <div class="flex flex-col gap-2 items-start">
                            <span class="text-[8px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg font-bold ${productClass}">${productLabel}</span>
                            <span class="text-[9px] uppercase tracking-[0.1em] px-2.5 py-0.5 rounded-full font-bold ${themeBadgeClass}">${displayTheme}</span>
                            <span class="text-[10px] text-white/30 font-medium flex items-center gap-1.5 mt-1">
                                <span class="opacity-50">🎵</span> ${sfxText}
                            </span>
                        </div>
                    </td>
                    <td class="p-6">
                        <div class="flex items-center gap-4">
                            <!-- Thumbnail Preview -->
                            <div class="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10 shadow-lg">
                                ${gift.firstPhotoUrl
                    ? `<img src="${gift.firstPhotoUrl}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/80x80?text=?'">`
                    : `<div class="w-full h-full flex items-center justify-center text-[10px] text-white/20 font-bold">?</div>`
                }
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <span class="text-[9px] bg-white/5 text-white/50 border border-white/5 px-2.5 py-1 rounded-lg w-fit font-bold">📸 ${gift.photosCount} PHOTOS</span>
                                ${gift.hasVoice ? '<span class="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit font-extrabold tracking-tighter uppercase">🎙️ VOICE ID TRANSMITTED</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td class="p-6">
                        <span class="text-[10px] text-white/40 font-mono tracking-tighter">${date}</span>
                    </td>
                    <td class="p-6">
                        <div class="flex flex-col">
                            <span class="text-[10px] ${isStale ? 'text-rose-400 font-bold' : 'text-white/40'} font-mono">${lastOpenedDate}</span>
                            ${isStale ? '<span class="text-[7px] uppercase tracking-[0.1em] text-rose-500/60 font-bold mt-1">Anomaly: Stale Content</span>' : ''}
                        </div>
                    </td>
                    <td class="p-6">
                        <a href="${editorUrl}" target="_blank" 
                           class="text-[9px] font-bold tracking-[0.2em] bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl hover:bg-[#ff4d6d] hover:border-[#ff4d6d] transition-all whitespace-nowrap uppercase">
                           Configure
                        </a>
                    </td>
                </tr>
            `;
        }).join('');
    };

    const applyFilters = () => {
        const query = searchInput.value.toLowerCase().trim();
        const themeFilter = filterTheme.value;
        const voiceFilter = filterVoice.value;
        const statusFilter = filterStatus.value;

        const filtered = allGiftsRaw.filter(gift => {
            // 1. Search Query (ID or Recipient)
            const matchesSearch = gift.giftId.toLowerCase().includes(query) ||
                (gift.recipientName || '').toLowerCase().includes(query);

            // 2. Theme Filter
            let matchesTheme = true;
            if (themeFilter !== 'all') {
                const themeVal = String(gift.theme || 'rose').toLowerCase();
                const themeMap = {
                    'rose': 'original', 'original': 'original',
                    'pinky': 'magenta',
                    'beige': 'rosewood', 'rosewood': 'rosewood',
                    'blanc': 'midnight', 'white': 'midnight', 'midnight': 'midnight',
                    'sage': 'mossy', 'mossy': 'mossy',
                    'camera': 'silver'
                };
                matchesTheme = themeMap[themeVal] === themeFilter;
            }

            // 3. Voice Filter
            let matchesVoice = true;
            if (voiceFilter === 'voice') matchesVoice = gift.hasVoice;
            else if (voiceFilter === 'no-voice') matchesVoice = !gift.hasVoice;

            // 4. Activity Status Filter
            let matchesStatus = true;
            if (statusFilter !== 'all') {
                const now = new Date();
                const lastOpened = gift.lastOpened ? new Date(gift.lastOpened) : null;
                const daysDiff = lastOpened ? (now - lastOpened) / (1000 * 60 * 60 * 24) : null;

                if (statusFilter === 'active') matchesStatus = (lastOpened && daysDiff <= 30);
                else if (statusFilter === 'stale') matchesStatus = (lastOpened && daysDiff > 30);
                else if (statusFilter === 'never') matchesStatus = !lastOpened;
            }

            return matchesSearch && matchesTheme && matchesVoice && matchesStatus;
        });

        renderTable(filtered);
    };
    // ── Interaction Logic ──

    selectAllCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            allGifts.forEach(g => selectedIds.add(g.giftId));
        } else {
            selectedIds.clear();
        }
        renderTable(allGifts);
        updateBulkActionsUI();
    });

    tableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('gift-checkbox')) {
            const id = e.target.dataset.id;
            if (e.target.checked) {
                selectedIds.add(id);
            } else {
                selectedIds.delete(id);
            }
            renderTable(allGifts);
            updateBulkActionsUI();
        }
    });

    const deleteSelectedGifts = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        if (!confirm(`Apakah Anda yakin ingin menghapus ${ids.length} kado terpilih? Tindakan ini tidak dapat dibatalkan.`)) {
            return;
        }

        const secret = adminSecretInput.value.trim();
        btnBulkDelete.innerText = 'MENGHAPUS...';
        btnBulkDelete.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/admin/delete-gifts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${secret}`
                },
                body: JSON.stringify({ ids })
            });

            const result = await response.json();
            if (result.success) {
                alert(result.message);
                fetchGifts(); // Refresh table
            } else {
                alert(`Gagal menghapus: ${result.error}`);
            }
        } catch (error) {
            alert('Terjadi kesalahan jaringan saat menghapus kado.');
            console.error(error);
        } finally {
            btnBulkDelete.innerText = 'Hapus Terpilih';
            btnBulkDelete.disabled = false;
        }
    };

    btnBulkDelete.addEventListener('click', deleteSelectedGifts);

    btnRefresh.addEventListener('click', fetchGifts);

    searchInput.addEventListener('input', applyFilters);
    filterTheme.addEventListener('change', applyFilters);
    filterVoice.addEventListener('change', applyFilters);
    filterStatus.addEventListener('change', applyFilters);

    // Allow pressing enter on secret input
    adminSecretInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') fetchGifts();
    });

    // --- Particle System Implementation ---
    const canvas = document.getElementById('particles-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];

        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 1.5 + 0.5;
                this.speedX = Math.random() * 0.5 - 0.25;
                this.speedY = Math.random() * 0.5 - 0.25;
                this.opacity = Math.random() * 0.5 + 0.1;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > canvas.width || this.x < 0 || this.y > canvas.height || this.y < 0) {
                    this.reset();
                }
            }
            draw() {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const initParticles = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particles = [];
            for (let i = 0; i < 80; i++) {
                particles.push(new Particle());
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        };

        window.addEventListener('resize', initParticles);
        initParticles();
        animate();
    }
});
