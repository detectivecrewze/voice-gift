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
    if (localStorage.getItem('admin_secret') && adminSecretInput) {
        adminSecretInput.value = localStorage.getItem('admin_secret');
    }

    const fetchGifts = async () => {
        const secret = adminSecretInput ? adminSecretInput.value.trim() : '';
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
                updatePillCounts(data.gifts);
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
        const themeNames = {
            'rose': 'Original', 'original': 'Original', 'pinky': 'Magenta',
            'beige': 'Rosewood', 'rosewood': 'Rosewood',
            'blanc': 'Midnight', 'midnight': 'Midnight',
            'sage': 'Mossy', 'mossy': 'Mossy',
            'silver': 'Silver', 'magenta': 'Magenta',
            'gift': 'Gift-Original', 'gift-pinky': 'Gift-Pinky',
            'gift-beige': 'Gift-Beige', 'gift-blanc': 'Gift-Blanc',
            'gift-sage': 'Gift-Sage'
        };
        document.getElementById('stat-theme').innerText = themeNames[topTheme] || topTheme.toUpperCase();

        // 4. Top Song (new logic — reads musicMode, libMusicTitle, uplMusicTitle)
        const songCounts = {};
        gifts.forEach(g => {
            let songLabel = null;
            if (g.musicMode === 'library' && g.libMusicTitle) {
                songLabel = g.libMusicTitle;
            } else if (g.musicMode === 'upload' && g.uplMusicTitle) {
                songLabel = g.uplMusicTitle;
            } else if (g.ambient && g.ambient !== 'none' && g.ambient !== 'custom') {
                songLabel = g.ambient;
            }
            if (songLabel) {
                songCounts[songLabel] = (songCounts[songLabel] || 0) + 1;
            }
        });
        const topSongKeys = Object.keys(songCounts);
        const topSong = topSongKeys.length > 0
            ? topSongKeys.reduce((a, b) => songCounts[a] > songCounts[b] ? a : b)
            : null;
        document.getElementById('stat-audio').innerText = topSong
            ? (topSong.length > 18 ? topSong.substring(0, 18) + '…' : topSong)
            : 'Hening';

        // 5. Render Song Popularity Chart
        renderSongChart(songCounts);
    };

    const renderSongChart = (songCounts) => {
        const chartSection = document.getElementById('song-chart-section');
        const chartBody = document.getElementById('song-chart-body');
        if (!chartSection || !chartBody) return;

        const sorted = Object.entries(songCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (sorted.length === 0) {
            chartSection.classList.add('hidden');
            return;
        }
        chartSection.classList.remove('hidden');
        const max = sorted[0][1];
        chartBody.innerHTML = sorted.map(([title, count], i) => {
            const pct = Math.round((count / max) * 100);
            const rankColors = ['#ff4d6d', '#ff8c69', '#ffc069', '#a78bfa', '#60d394'];
            const color = rankColors[i] || '#ffffff40';
            return `
            <div class="song-chart-row flex items-center gap-4 group">
                <span class="text-[10px] font-black text-white/30 w-5 shrink-0">#${i + 1}</span>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-1.5">
                        <span class="text-[11px] font-semibold text-white/80 truncate pr-2">${title}</span>
                        <span class="text-[10px] font-black shrink-0" style="color:${color}">${count}×</span>
                    </div>
                    <div class="w-full bg-white/5 rounded-full h-1.5">
                        <div class="h-1.5 rounded-full transition-all duration-700" style="width:${pct}%;background:${color}"></div>
                    </div>
                </div>
            </div>`;
        }).join('');
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

            // ── Theme badge ──
            let themeBadgeClass = 'bg-white/10 text-white/80';
            let displayTheme = gift.theme || 'Original';
            const theme = String(gift.theme || 'rose').toLowerCase();
            if (theme === 'pinky' || theme === 'gift-pinky') { themeBadgeClass = 'bg-pink-500/20 text-pink-400 border border-pink-500/30'; displayTheme = 'Gift Magenta'; }
            else if (theme === 'rose' || theme === 'original' || theme === 'gift') { themeBadgeClass = 'bg-rose-500/20 text-rose-300 border border-rose-500/30'; displayTheme = 'Gift Original'; }
            else if (theme === 'beige' || theme === 'rosewood' || theme === 'gift-beige') { themeBadgeClass = 'bg-orange-500/20 text-orange-400 border border-orange-500/30'; displayTheme = 'Gift Rosewood'; }
            else if (theme === 'blanc' || theme === 'midnight' || theme === 'gift-blanc') { themeBadgeClass = 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'; displayTheme = 'Gift Midnight'; }
            else if (theme === 'sage' || theme === 'mossy' || theme === 'gift-sage') { themeBadgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'; displayTheme = 'Gift Mossy'; }
            else if (theme.includes('silver')) { themeBadgeClass = 'bg-slate-500/20 text-slate-300 border border-slate-500/30'; displayTheme = 'Cam Silver'; }
            else if (theme.includes('midnight')) { themeBadgeClass = 'bg-indigo-600/20 text-indigo-200 border border-indigo-400/30'; displayTheme = 'Cam Midnight'; }
            else if (theme.includes('mossy')) { themeBadgeClass = 'bg-green-600/20 text-green-300 border border-green-500/30'; displayTheme = 'Cam Mossy'; }
            else if (theme.includes('rosewood')) { themeBadgeClass = 'bg-orange-600/20 text-orange-300 border border-orange-500/30'; displayTheme = 'Cam Rosewood'; }
            else if (theme.includes('magenta')) { themeBadgeClass = 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30'; displayTheme = 'Cam Magenta'; }
            else { displayTheme = theme; }

            // ── Music / Audio badge (new musicMode-aware logic) ──
            let sfxBadgeClass = 'text-white/20';
            let sfxText = 'Hening';
            const musicMode = gift.musicMode || 'upload';
            const ambient = String(gift.ambient || 'none').toLowerCase();

            if (musicMode === 'library' && gift.libMusicTitle) {
                sfxBadgeClass = 'text-green-400 font-bold';
                sfxText = `🎵 ${gift.libMusicTitle}`;
            } else if (musicMode === 'upload' && gift.uplMusicTitle) {
                sfxBadgeClass = 'text-emerald-400 font-semibold';
                sfxText = `⬆️ ${gift.uplMusicTitle}`;
            } else if (musicMode === 'upload' && gift.customAmbientUrl) {
                sfxBadgeClass = 'text-emerald-400/70';
                sfxText = `⬆️ Custom Upload`;
            } else if (ambient !== 'none') {
                // Legacy fallback
                const legacyMap = { rain: 'Rain', cafe: 'Cafe', waves: 'Waves', fireplace: 'Fire', forest: 'Forest', 'nadin-ah': 'Nadin', daniel: 'Daniel', mitski: 'Mitski' };
                sfxText = legacyMap[ambient] || ambient;
                if (sfxText !== 'Hening') sfxBadgeClass = 'text-yellow-400/70';
            }

            const giftUrl = `${window.location.origin}/${theme.includes('camera') ? theme : ('gift' + (theme === 'rose' || theme === 'original' ? '' : '-' + theme.replace('gift-','')))}/${gift.giftId}`;
            const editorUrl = `../studio/index.html?token=${gift.giftId}`;

            return `
                <tr class="${isSelected ? 'bg-white/5' : ''} transition-all border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td class="p-6" data-label="Select">
                        <input type="checkbox" data-id="${gift.giftId}" ${isSelected ? 'checked' : ''}
                                class="gift-checkbox rounded-md border-white/10 bg-white/5 text-[#ff4d6d] focus:ring-[#ff4d6d] cursor-pointer w-4 h-4">
                    </td>
                    <td class="p-6" data-label="Gift ID">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold font-mono tracking-tight text-white">${gift.giftId}</span>
                            <a href="${giftUrl}" target="_blank" class="text-[9px] text-[#ff4d6d] hover:underline mt-1 font-bold tracking-widest uppercase">Inspect Link ↗</a>
                        </div>
                    </td>
                    <td class="p-6" data-label="Recipient">
                        <span class="text-xs font-semibold text-white/90">${gift.recipientName || '(Tanpa Nama)'}</span>
                    </td>
                    <td class="p-6" data-label="Config">
                        <div class="flex flex-col gap-2 items-start">
                            <span class="text-[9px] uppercase tracking-[0.1em] px-2.5 py-0.5 rounded-full font-bold ${themeBadgeClass}">${displayTheme}</span>
                            <span class="text-[10px] ${sfxBadgeClass} font-medium flex items-center gap-1.5 mt-1 max-w-[140px] truncate">
                                ${sfxText}
                            </span>
                        </div>
                    </td>
                    <td class="p-6" data-label="Media">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10 shadow-lg">
                                ${gift.firstPhotoUrl
                    ? `<img src="${gift.firstPhotoUrl}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/80x80?text=?'">`
                    : `<div class="w-full h-full flex items-center justify-center text-[10px] text-white/20 font-bold">?</div>`
                }
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <span class="text-[9px] bg-white/5 text-white/50 border border-white/5 px-2.5 py-1 rounded-lg w-fit font-bold">📸 ${gift.photosCount} PHOTOS</span>
                                ${gift.hasVoice ? '<span class="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit font-extrabold tracking-tighter uppercase">🎙️ VOICE</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td class="p-6" data-label="Published">
                        <span class="text-[10px] text-white/40 font-mono tracking-tighter">${date}</span>
                    </td>
                    <td class="p-6" data-label="Actions">
                        <a href="${editorUrl}" target="_blank"
                           class="text-[9px] font-bold tracking-[0.2em] bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl hover:bg-[#ff4d6d] hover:border-[#ff4d6d] transition-all whitespace-nowrap uppercase">
                           Configure
                        </a>
                    </td>
                </tr>
            `;
        }).join('');
    };

    let _activePillTheme = 'all';

    // ── Pill count helper ────────────────────────────────────────
    const updatePillCounts = (gifts) => {
        // Build a canonical theme key for each gift
        const themeKey = (gift) => {
            const t = String(gift.theme || 'rose').toLowerCase();
            if (t === 'rose' || t === 'original') return 'gift';
            if (t === 'pinky') return 'gift-pinky';
            if (t === 'beige' || t === 'rosewood') return 'gift-beige';
            if (t === 'blanc' || t === 'midnight') return 'gift-blanc';
            if (t === 'sage' || t === 'mossy') return 'gift-sage';
            // camera themes from _meta theme_folder or raw theme value
            if (t.includes('silver')) return 'camera-silver';
            if (t.includes('midnight')) return 'camera-midnight';
            if (t.includes('mossy')) return 'camera-mossy';
            if (t.includes('rosewood')) return 'camera-rosewood';
            if (t.includes('magenta')) return 'camera-magenta';
            return 'gift'; // default fallback
        };

        const counts = {};
        gifts.forEach(g => {
            const k = themeKey(g);
            counts[k] = (counts[k] || 0) + 1;
        });

        document.getElementById('pill-count-all').textContent = gifts.length;
        const pillKeys = ['gift', 'gift-pinky', 'gift-beige', 'gift-blanc', 'gift-sage',
            'camera-silver', 'camera-midnight', 'camera-mossy', 'camera-rosewood', 'camera-magenta'];
        pillKeys.forEach(k => {
            const el = document.getElementById(`pill-count-${k}`);
            if (el) el.textContent = (counts[k] || 0);
        });
    };

    // ── Theme pill → themeKey mapper (same logic as updatePillCounts) ──
    const giftThemeKey = (gift) => {
        const t = String(gift.theme || 'rose').toLowerCase();
        if (t === 'rose' || t === 'original') return 'gift';
        if (t === 'pinky') return 'gift-pinky';
        if (t === 'beige' || t === 'rosewood') return 'gift-beige';
        if (t === 'blanc' || t === 'midnight') return 'gift-blanc';
        if (t === 'sage' || t === 'mossy') return 'gift-sage';
        if (t.includes('silver')) return 'camera-silver';
        if (t.includes('midnight')) return 'camera-midnight';
        if (t.includes('mossy')) return 'camera-mossy';
        if (t.includes('rosewood')) return 'camera-rosewood';
        if (t.includes('magenta')) return 'camera-magenta';
        return 'gift';
    };

    const applyFilters = () => {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const voiceFilter = filterVoice ? filterVoice.value : 'all';
        const statusFilter = filterStatus ? filterStatus.value : 'all';

        const filtered = allGiftsRaw.filter(gift => {
            // 1. Search Query (ID or Recipient)
            const matchesSearch = gift.giftId.toLowerCase().includes(query) ||
                (gift.recipientName || '').toLowerCase().includes(query);

            // 2. Theme Filter via pills
            const matchesTheme = _activePillTheme === 'all' || giftThemeKey(gift) === _activePillTheme;

            // 3. Voice Filter
            let matchesVoice = true;
            if (voiceFilter === 'voice') matchesVoice = gift.hasVoice;
            else if (voiceFilter === 'no-voice') matchesVoice = !gift.hasVoice;

            // 4. Activity Status Filter (lastOpened intentionally not tracked — KV write cost)
            let matchesStatus = true;

            return matchesSearch && matchesTheme && matchesVoice && matchesStatus;
        });

        renderTable(filtered);
    };

    // ── Theme pill click ─────────────────────────────────────────
    document.getElementById('theme-pills')?.addEventListener('click', (e) => {
        const pill = e.target.closest('.theme-pill');
        if (!pill) return;
        document.querySelectorAll('.theme-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        _activePillTheme = pill.dataset.theme;
        applyFilters();
    });

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

        const namesList = ids.join('\n- ');
        const confirmMessage = `Apakah Anda yakin ingin menghapus ${ids.length} kado terpilih?\n\nDaftar Gift ID:\n- ${namesList}\n\nTindakan ini tidak dapat dibatalkan.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        const secret = adminSecretInput ? adminSecretInput.value.trim() : '';
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

    if (btnBulkDelete) btnBulkDelete.addEventListener('click', deleteSelectedGifts);

    if (btnRefresh) btnRefresh.addEventListener('click', fetchGifts);

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (filterVoice) filterVoice.addEventListener('change', applyFilters);
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);

    // Allow pressing enter on secret input
    if (adminSecretInput) {
        adminSecretInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') fetchGifts();
        });
    }

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
