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
            console.error('[Admin] Fetch error:', err);
            alert('Terjadi kesalahan koneksi.');
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

            const giftUrl = `${window.location.origin}/gift/?to=${gift.giftId}`;

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
                        <div class="flex gap-2">
                            <span class="text-[9px] bg-gray-100 px-2 py-1 rounded">📸 ${gift.photosCount} Foto</span>
                            ${gift.hasVoice ? '<span class="text-[9px] bg-gray-100 px-2 py-1 rounded">🎙️ Ada Suara</span>' : ''}
                        </div>
                    </td>
                    <td class="p-6">
                        <span class="text-[9px] text-gray-500 font-medium">${date}</span>
                    </td>
                    <td class="p-6">
                        <a href="../studio/index.html?token=${gift.giftId}" target="_blank" 
                           class="text-[9px] border border-gray-200 px-4 py-2 rounded-full hover:bg-black hover:text-white transition-all">
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
