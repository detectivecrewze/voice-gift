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

            let themeBadgeClass = 'bg-gray-100 text-gray-700';
            let displayTheme = 'Original';

            const theme = String(gift.theme || 'rose').toLowerCase();
            const isCamera = CAMERA_THEMES.includes(theme);

            if (theme === 'pinky') { themeBadgeClass = 'bg-pink-100 text-pink-700'; displayTheme = 'Magenta'; }
            else if (theme === 'rose' || theme === 'original') { themeBadgeClass = 'bg-stone-100 text-stone-700'; displayTheme = 'Original'; }
            else if (theme === 'beige') { themeBadgeClass = 'bg-orange-100 text-orange-800'; displayTheme = 'Rosewood'; }
            else if (theme === 'blanc' || theme === 'white') { themeBadgeClass = 'bg-indigo-100 text-indigo-700'; displayTheme = 'Midnight'; }
            else if (theme === 'sage') { themeBadgeClass = 'bg-emerald-100 text-emerald-700'; displayTheme = 'Mossy'; }
            else if (theme === 'camera') { themeBadgeClass = 'bg-gray-100 text-gray-700'; displayTheme = 'Silver'; }
            else if (theme === 'midnight') { themeBadgeClass = 'bg-indigo-100 text-indigo-700'; displayTheme = 'Midnight'; }
            else if (theme === 'rosewood') { themeBadgeClass = 'bg-orange-100 text-orange-800'; displayTheme = 'Rosewood'; }
            else if (theme === 'mossy') { themeBadgeClass = 'bg-emerald-100 text-emerald-700'; displayTheme = 'Mossy'; }
            else { displayTheme = theme; }

            const giftFolder = isCamera
                ? (CAMERA_THEME_FOLDERS[theme] || 'gift-camera')
                : (GIFT_PAGE_THEME_FOLDERS[theme] || 'gift');
            const studioPath = isCamera ? 'gift-camera/studio' : 'studio';
            const giftUrl = `${window.location.origin}/${giftFolder}/index.html?to=${gift.giftId}`;
            const editorUrl = `../${studioPath}/index.html?token=${gift.giftId}`;
            const productLabel = isCamera ? '📷 Gift Camera' : '📝 Gift Pages';
            const productClass = isCamera ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600';

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
            }) : '<span class="text-gray-300 italic">Belum dibuka</span>';

            // Check if kado is "Stale" (older than 30 days)
            const isStale = gift.lastOpened && (new Date() - new Date(gift.lastOpened)) > (30 * 24 * 60 * 60 * 1000);

            return `
                <tr class="${isSelected ? 'bg-rose-50/30' : ''} ${isStale ? 'opacity-60' : ''} transition-all border-b border-gray-50 last:border-0 hover:bg-gray-50/20">
                    <td class="p-6">
                        <input type="checkbox" data-id="${gift.giftId}" ${isSelected ? 'checked' : ''} 
                               class="gift-checkbox rounded border-gray-300 text-black focus:ring-black cursor-pointer">
                    </td>
                    <td class="p-6">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold font-mono tracking-tight">${gift.giftId}</span>
                            <a href="${giftUrl}" target="_blank" class="text-[9px] text-[#d4a373] hover:underline mt-1 font-bold">BUKA KADO ↗</a>
                        </div>
                    </td>
                    <td class="p-6">
                        <span class="text-xs font-medium text-gray-800">${gift.recipientName || '(Tanpa Nama)'}</span>
                    </td>
                    <td class="p-6">
                        <div class="flex flex-col gap-2 items-start">
                            <span class="text-[8px] uppercase tracking-[0.2em] px-2 py-1 rounded-md font-bold ${productClass}">${productLabel}</span>
                            <span class="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold ${themeBadgeClass}">${displayTheme}</span>
                            <span class="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                <span class="text-[10px]">🎵</span> ${sfxText}
                            </span>
                        </div>
                    </td>
                    <td class="p-6">
                        <div class="flex items-center gap-3">
                            <!-- Thumbnail Preview -->
                            <div class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-black/5 shadow-sm">
                                ${gift.firstPhotoUrl
                    ? `<img src="${gift.firstPhotoUrl}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/40x40?text=?'">`
                    : `<div class="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold">?</div>`
                }
                            </div>
                            <div class="flex flex-col gap-1">
                                <span class="text-[9px] bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full w-fit">📸 ${gift.photosCount} Foto</span>
                                ${gift.hasVoice ? '<span class="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full w-fit font-bold">🎙️ Ada Voice</span>' : ''}
                            </div>
                        </div>
                    </td>
                    <td class="p-6">
                        <span class="text-[10px] text-gray-400 font-mono">${date}</span>
                    </td>
                    <td class="p-6">
                        <div class="flex flex-col">
                            <span class="text-[10px] ${isStale ? 'text-rose-400 font-bold' : 'text-gray-400'} font-mono">${lastOpenedDate}</span>
                            ${isStale ? '<span class="text-[7px] uppercase tracking-tighter text-rose-300 font-bold mt-0.5">Sudah Lama Pasif</span>' : ''}
                        </div>
                    </td>
                    <td class="p-6">
                        <a href="${editorUrl}" target="_blank" 
                           class="text-[9px] font-bold tracking-widest bg-white border border-gray-100 shadow-sm px-4 py-2 rounded-full hover:bg-black hover:text-white transition-all whitespace-nowrap uppercase">
                           Editor
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
});
