// ============================================================
// publisher.js — Studio Premium: Submit VIP Config ke Server
// ============================================================
// Bertanggung jawab untuk:
//   1. Validasi state sebelum submit
//   2. Build payload VIP (data customer + meta)
//   3. POST ke /submit-premium endpoint di Worker
//   4. Tampilkan modal sukses sederhana (tanpa QR/link)
// ============================================================
// DIPANGGIL OLEH: studio.js
// ============================================================

const Publisher = (() => {

  let validatedPayload = null;

  const init = () => {
    // Bind both mobile and desktop publish buttons
    ['btn-publish', 'btn-publish-desktop'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', handlePreSubmit);
    });

    // Bind confirm/cancel di modal-name (jika masih ada di HTML)
    document.getElementById('btn-confirm-name')
      ?.addEventListener('click', _handlePublish);

    document.getElementById('btn-cancel-name')
      ?.addEventListener('click', () => _toggleModal('modal-name', false));
  };

  const _toggleModal = (id, show) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !show);
  };

  // ── Pre-Submit: Validasi + Build Payload ──────────────────
  const handlePreSubmit = () => {
    const state = Studio.getState();
    const token = Auth.getToken();
    const hasEnoughPhotos = state.photos?.length >= 6;

    // [GUARD] Ensure no active uploads are running
    if (Uploader.isUploading()) {
      Studio.showToast('Tunggu sebentar ya, foto kamu sedang diupload ke cloud... ⏳');
      return;
    }

    // Foto minimal 6 wajib
    if (!hasEnoughPhotos) {
      Studio.showToast(`Hampir siap! Kamu perlu menambahkan minimal 6 foto (sekarang: ${state.photos?.length || 0}). 📸`);
      return;
    }

    // Token harus ada
    if (!token) {
      Studio.showToast('Token studio tidak ditemukan. Gunakan link resmi.');
      return;
    }

    // Build validated payload sesuai planning.md
    validatedPayload = {
      id: token,

      // Data utama Voice Gift
      recipientName: state.recipientName || '',
      theme: state.theme,
      occasion: state.occasion,
      message: state.message,
      photos: state.photos,
      voiceNote: state.voiceNote,
      ambient: state.ambient,
      ambientVolume: state.ambientVolume,
      voiceVolume: state.voiceVolume,
      polaroid_photo: state.polaroid_photo,
      polaroid_letter: state.polaroid_letter,

      // Password
      password: state.password || null,
      requestDomain: state.requestDomain || '',

      // Internal (akan di-strip oleh Worker sebelum dikirim ke Telegram)
      studioPassword: state.studioPassword || null,

      // Meta untuk config.js
      _meta: {
        generatedAt: new Date().toISOString(),
        theme_folder: Studio.getThemeConfig(state.theme)?.folder || 'gift',
        studioVersion: 'premium-v1'
      }
    };

    // Tampilkan modal konfirmasi sebelum benar-benar publish
    _toggleModal('modal-name', true);
  };

  // ── Handle Publish: POST ke Worker /submit-premium ────────
  const _handlePublish = async () => {
    const state = Studio.getState();
    
    // [VALIDASI] Domain Vercel wajib diisi
    if (!state.requestDomain || !state.requestDomain.trim()) {
      Studio.showToast('Nama domain Vercel wajib diisi agar kado bisa diproses! 🌐');
      return;
    }

    if (!validatedPayload) return;

    // [PENTING] Update payload dengan domain yang baru diinput di modal
    validatedPayload.requestDomain = state.requestDomain.trim();

    _toggleModal('modal-name', false);

    const btns = [document.getElementById('btn-publish'), document.getElementById('btn-publish-desktop')];
    btns.forEach(btn => {
      if (btn) {
        btn.classList.add('loading');
        btn.textContent = 'Mengirim Data...';
        btn.disabled = true;
      }
    });

    try {
      const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl || 'https://valentine-upload.aldoramadhan16.workers.dev';

      const response = await fetch(`${API_BASE_URL}/submit-premium?id=${validatedPayload.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validatedPayload.studioPassword || ''}`
        },
        body: JSON.stringify(validatedPayload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Publisher] Server error:', response.status, errText);
        throw new Error('Gagal mengirim data ke server.');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Gagal mengirim data.');
      }

      // Sukses — tampilkan modal sederhana
      _showSuccessModal();

    } catch (err) {
      console.error('[Publisher] Publish error:', err);
      Studio.showToast(err.message || 'Gagal memproses kado. Coba lagi.');
    } finally {
      btns.forEach(btn => {
        if (btn) {
          btn.classList.remove('loading');
          btn.textContent = 'Publish VIP Config';
          btn.disabled = false;
        }
      });
    }
  };

  // ── Modal Sukses (Disederhanakan) ─────────────────────────
  const _showSuccessModal = () => {
    const modal = document.getElementById('modal-success');
    if (modal) {
      // Update WhatsApp link dengan data kustom
      const state = Studio.getState();
      const token = Auth.getToken();
      const domainSuffix = state.requestDomain ? `%20.%20Domain%3A%20${state.requestDomain}.vercel.app` : '';
      const waMessage = `Halo%20admin%2C%20saya%20sudah%20publish%20kado%20VIP%20saya.%0AID%3A%20${token}${domainSuffix}`;
      
      const waBtn = document.getElementById('btn-contact-admin');
      if (waBtn) {
        waBtn.href = `https://wa.me/6281381543981?text=${waMessage}`;
      }

      modal.classList.remove('hidden');
    } else {
      Studio.showToast('Data berhasil dikirim! 🎁 Admin akan memproses kado kamu segera.');
    }
  };

  return { init };

})();