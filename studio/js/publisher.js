// ============================================================
// publisher.js — Publish Gift & Tampilkan Link
// ============================================================
// Bertanggung jawab untuk:
//   1. Menangani klik tombol "Publish Gift"
//   2. Validasi state sebelum publish
//   3. Kirim POST /api/studio/:token/publish
//   4. Tampilkan modal sukses dengan gift URL
//   5. Tombol copy link dan share WhatsApp
// ============================================================
// DIPANGGIL OLEH: studio.js
// ============================================================

const Publisher = (() => {

  const init = () => {
    // Bind both mobile and desktop publish buttons
    ['btn-publish', 'btn-publish-desktop'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', _showNameModal);
    });

    document.getElementById('btn-confirm-name')
      ?.addEventListener('click', _handlePublish);

    document.getElementById('btn-cancel-name')
      ?.addEventListener('click', () => _toggleModal('modal-name', false));

    document.getElementById('btn-copy-link')
      ?.addEventListener('click', _handleCopyLink);

    // Slug validation on input
    document.getElementById('input-gift-name')?.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      e.target.value = val;
    });
  };

  const _toggleModal = (id, show) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !show);
  };

  const _showNameModal = () => {
    const state = Studio.getState();
    const token = Auth.getToken();
    const hasPhotos = state.photos?.length > 0;
    const hasVoice = (state.voiceNote?.url);

    if (!hasPhotos && !hasVoice) {
      Studio.showToast('Wah, kado kamu masih kosong. Tambahkan foto atau suara dulu ya!');
      return;
    }

    // Pre-fill input with token (sanitized) to help the user
    const input = document.getElementById('input-gift-name');
    if (input && token) {
      // Remove 'project-' prefix if it exists to make it cleaner
      input.value = token.replace('project-', '');
    }

    _toggleModal('modal-name', true);
    input?.focus();
  };

  // ── Handle klik Publish ───────────────────────────────────
  const _handlePublish = async () => {
    const customId = document.getElementById('input-gift-name')?.value.trim();

    if (!customId || customId.length < 2) {
      const error = document.getElementById('name-error');
      if (error) error.classList.remove('hidden');
      return;
    }

    _toggleModal('modal-name', false);

    const btns = [document.getElementById('btn-publish'), document.getElementById('btn-publish-desktop')];
    btns.forEach(btn => {
      if (btn) {
        btn.classList.add('loading');
        btn.textContent = 'Memproses...';
        btn.disabled = true;
      }
    });

    try {
      const token = Auth.getToken();

      // ERROR FIX: Jika tidak ada token (Mock Mode), ingatkan user
      if (!token) {
        console.warn('[Publisher] No token found. Token is required for cloud publishing.');
        Studio.showToast('Token studio tidak ditemukan. Gunakan link resmi untuk publikasi cloud.');
        return;
      }

      // VALENTINE API COMPATIBILITY: "Publishing" is just saving to a new ID
      const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';
      console.log(`[Publisher] Attempting publish for token: ${token} as ID: ${customId}`);

      // 1. Get current state
      const state = Studio.getState();

      // 2. Mark as published
      const publishState = {
        ...state,
        status: 'published',
        publishedAt: new Date().toISOString(),
        originalToken: token
      };

      // 3. Save to NEW ID (the custom slug)
      const response = await fetch(`${API_BASE_URL}/save-config?id=${customId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishState)
      });

      // Validasi response JSON sebelum diparse
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error('[Publisher] Non-JSON response:', text);
        throw new Error('Gagal memproses ke server Cloudflare. Pastikan kado sudah disimpan.');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Gagal publish');
      }

      // ── Sukses: tampilkan modal ────────────────────────
      // Construct gift URL manually since backend might not return it in this format
      const giftUrl = `${window.location.origin}/gift/index.html?to=${customId}`;
      _showSuccessModal(giftUrl);

    } catch (err) {
      console.error('[Publisher] Publish error:', err);
      Studio.showToast(err.message || 'Gagal memproses kado. Coba lagi.');
    } finally {
      btns.forEach(btn => {
        if (btn) {
          btn.classList.remove('loading');
          btn.textContent = 'Publikasikan Kado';
          btn.disabled = false;
        }
      });
    }
  };

  // ── Tampilkan modal sukses ────────────────────────────────
  const _showSuccessModal = (giftUrl) => {
    const modal = document.getElementById('modal-success');
    const urlDisplay = document.getElementById('modal-gift-url');
    const whatsappBtn = document.getElementById('btn-share-whatsapp');
    const viewBtn = document.getElementById('btn-view-gift');

    if (urlDisplay) urlDisplay.textContent = giftUrl;
    if (viewBtn) viewBtn.href = giftUrl;

    // Generate WhatsApp share link
    if (whatsappBtn) {
      const message = encodeURIComponent(`Untukmu, kenangan yang abadi. ✨\n\n${giftUrl}`);
      whatsappBtn.href = `https://wa.me/?text=${message}`;
    }

    if (modal) modal.classList.remove('hidden');
  };

  // ── Copy link ke clipboard ────────────────────────────────
  const _handleCopyLink = () => {
    const urlText = document.getElementById('modal-gift-url')?.textContent;
    if (!urlText) return;

    navigator.clipboard.writeText(urlText)
      .then(() => {
        const btn = document.getElementById('btn-copy-link');
        if (btn) {
          btn.textContent = 'TERSALIN';
          setTimeout(() => btn.textContent = 'SALIN LINK', 2000);
        }
      })
      .catch(() => {
        Studio.showToast('Gagal menyalin. Silakan coba manual.');
      });
  };

  return { init };

})();
