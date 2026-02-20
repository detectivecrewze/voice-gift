// ============================================================
// preview.js — Live Preview Sync
// ============================================================
// Bertanggung jawab untuk:
//   1. Menerima state terbaru dari studio.js
//   2. Me-render preview gift page langsung di #preview-frame
//      (bukan iframe — render DOM langsung untuk performa)
//   3. Menerapkan tema visual yang dipilih
//   4. Update real-time saat user mengetik / upload foto
// ============================================================
// DIPANGGIL OLEH: studio.js via Preview.update(state)
// ============================================================

const Preview = (() => {

  // ── Render preview berdasarkan state terkini ──────────────
  const update = (state) => {
    const frame = document.getElementById('preview-frame');
    if (!frame) return;

    // Terapkan tema sebagai data attribute
    frame.setAttribute('data-theme', state.theme || 'pinky');

    frame.innerHTML = _buildPreviewHTML(state);
  };

  // ── Build HTML preview ────────────────────────────────────
  const _buildPreviewHTML = (state) => {
    const hasPhotos = state.photos?.length > 0;
    const hasVoice = state.voiceNote?.url;

    if (!hasPhotos && !hasVoice) {
      return `
        <div class="flex items-center justify-center h-64 text-gray-300 text-[10px] uppercase tracking-widest text-center p-6">
          Isi konten untuk melihat preview
        </div>
      `;
    }

    const voiceHtml = hasVoice ? `
      <div class="voice-preview-bubble bg-[#fcfaf7] border border-gray-100 rounded-3xl p-6 mb-8">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white text-[10px]">▶</div>
          <div class="flex-1">
            <div class="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-black w-0"></div>
            </div>
          </div>
          <span class="text-[9px] text-gray-400 tabular-nums">${_formatDuration(state.voiceNote.duration)}</span>
        </div>
      </div>
    ` : '';

    const photosHtml = hasPhotos ? `
      <div class="grid grid-cols-2 gap-3">
        ${state.photos
        .sort((a, b) => a.order - b.order)
        .slice(0, 4)
        .map(p => `
            <div class="aspect-[4/5] rounded-lg overflow-hidden bg-gray-100 shadow-sm border border-gray-50">
              <img src="${p.url}" class="w-full h-full object-cover" alt="" />
            </div>
          `).join('')}
        ${state.photos.length > 4 ? `
          <div class="aspect-[4/5] rounded-lg bg-gray-50 flex items-center justify-center border border-dashed border-gray-200">
            <span class="text-[9px] text-gray-400 uppercase tracking-widest">+${state.photos.length - 4}</span>
          </div>
        ` : ''}
      </div>
    ` : '';

    return `
      <div class="p-8">
        <div class="mb-12 text-center">
          <h1 class="text-2xl italic font-serif text-gray-800">Kenangan Spesial</h1>
          <div class="w-8 h-px bg-gray-100 mx-auto mt-6"></div>
        </div>

        <div class="space-y-4">
          ${voiceHtml}
          ${photosHtml}
        </div>
      </div>
    `;
  };

  const _escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const _formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')} `;
  };

  return { update };

})();
