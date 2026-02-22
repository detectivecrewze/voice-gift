/**
 * admin.js
 * Logic for fetching and displaying published gifts.
 */

const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
    const btnRefresh = document.getElementById('btn-refresh');
    const adminSecretInput = document.getElementById('admin-secret');
    const tableBody = document.getElementById('gift-table-body');

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

        try {
            const response = await fetch(`${API_BASE_URL}/admin/list-gifts`, {
                headers: {
                    'Authorization': `Bearer ${secret}`
                }
            });

            const data = await response.json();

            if (data.success) {
                renderTable(data.gifts);
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

    const renderTable = (gifts) => {
        if (!gifts || gifts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-gray-400 text-xs italic">Belum ada kado yang dipublikasikan.</td></tr>`;
            return;
        }

        // Sort by date descending
        gifts.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

        tableBody.innerHTML = gifts.map(gift => {
            const date = gift.publishedAt ? new Date(gift.publishedAt).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '-';

            // ── Smart Generator Detection ──
            // Camera themes use gift-camera/* folders & studio
            // Gift-pages themes use gift*/ folders & main studio
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

            // Format theme badge colors based on theme name
            let themeBadgeClass = 'bg-gray-100 text-gray-700';
            let displayTheme = 'Original';

            // Protect against non-string values
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

            // Smart URL: route to correct gift folder & studio
            const giftFolder = isCamera
                ? (CAMERA_THEME_FOLDERS[theme] || 'gift-camera')
                : (GIFT_PAGE_THEME_FOLDERS[theme] || 'gift');
            const studioPath = isCamera ? 'gift-camera/studio' : 'studio';
            const giftUrl = `${window.location.origin}/${giftFolder}/index.html?to=${gift.giftId}`;
            const editorUrl = `../${studioPath}/index.html?token=${gift.giftId}`;
            const productLabel = isCamera ? '📷 Digicam' : '📝 Gift Pages';
            const productClass = isCamera ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600';

            // Format ambient text
            let ambientText = 'Tanpa SFX';
            const ambient = String(gift.ambient || 'none').toLowerCase();
            if (ambient !== 'none') {
                if (ambient === 'rain') ambientText = '🌧️ Rain';
                else if (ambient === 'cafe') ambientText = '☕ Cafe';
                else if (ambient === 'waves') ambientText = '🌊 Waves';
                else if (ambient === 'fireplace') ambientText = '🔥 Fireplace';
                else if (ambient === 'forest') ambientText = '🌲 Forest';
                else if (ambient === 'nadin-ah') ambientText = '🎵 Nadin - Taruh';
                else if (ambient === 'daniel') ambientText = '🎵 Daniel - Always';
                else if (ambient === 'mitski') ambientText = '🎵 Mitski - My Love';
                else ambientText = `🎵 ${gift.ambient}`;
            }

            return `
                <tr>
                    <td class="p-6">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold font-mono tracking-tight">${gift.giftId}</span>
                            <a href="${giftUrl}" target="_blank" class="text-[9px] text-[#d4a373] hover:underline mt-1">Buka Link Publik ↗</a>
                        </div>
                    </td>
                    <td class="p-6">
                        <span class="text-xs font-medium">${gift.recipientName || '(Tanpa Nama)'}</span>
                    </td>
                    <td class="p-6">
                        <div class="flex flex-col gap-1.5 items-start">
                            <span class="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold ${themeBadgeClass}">${displayTheme}</span>
                            <span class="text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full font-semibold ${productClass}">${productLabel}</span>
                            <span class="text-[10px] text-gray-500">${ambientText}</span>
                        </div>
                    </td>
                    <td class="p-6">
                        <div class="flex gap-2">
                            <span class="text-[9px] bg-gray-100 px-2 py-1 rounded">📸 ${gift.photosCount} Foto</span>
                            ${gift.hasVoice ? '<span class="text-[9px] bg-gray-100 px-2 py-1 rounded">🎙️ Ada Suara</span>' : ''}
                        </div>
                    </td>
                    <td class="p-6">
                        <span class="text-[9px] text-gray-500 font-medium">${date}</span>
                    </td>
                    <td class="p-6">
                        <a href="${editorUrl}" target="_blank" 
                           class="text-[9px] border border-gray-200 px-4 py-2 rounded-full hover:bg-black hover:text-white transition-all whitespace-nowrap">
                           Cek Editor
                        </a>
                    </td>
                </tr>
            `;
        }).join('');
    };

    btnRefresh.addEventListener('click', fetchGifts);

    // Allow pressing enter on secret input
    adminSecretInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') fetchGifts();
    });
});
