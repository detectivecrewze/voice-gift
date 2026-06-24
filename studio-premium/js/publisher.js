// ============================================================
// publisher.js — Studio Premium: VIP Config + Submit Regular
// ============================================================
// Bertanggung jawab untuk:
//   [VIP]     POST /submit-premium → Telegram → Admin deploy manual
//   [Regular] POST /save-config    → KV live  → Customer dapat link langsung
//
// Kedua flow berjalan 100% independen. Tidak ada shared state.
// ============================================================

const Publisher = (() => {

  let validatedPayload = null;

  const init = () => {
    // ── VIP: Bind publish buttons ──
    ['btn-publish', 'btn-publish-desktop'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', handlePreSubmit);
    });
    document.getElementById('btn-confirm-name')
      ?.addEventListener('click', _handlePublish);
    document.getElementById('btn-cancel-name')
      ?.addEventListener('click', () => _toggleModal('modal-name', false));

    // ── Regular: Bind new submit button ──
    document.getElementById('btn-submit-regular')
      ?.addEventListener('click', _handleSubmitRegular);

    // ── Regular: Copy link ──
    document.getElementById('btn-copy-link-regular')
      ?.addEventListener('click', _handleCopyLinkRegular);
  };

  const _toggleModal = (id, show) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !show);
  };

  // ════════════════════════════════════════════════════════════
  // VIP FLOW — Tidak berubah sama sekali
  // ════════════════════════════════════════════════════════════

  const handlePreSubmit = () => {
    const state = Studio.getState();
    const token = Auth.getToken();
    const hasEnoughPhotos = state.photos?.length >= 6;

    if (Uploader.isUploading()) {
      Studio.showToast('Tunggu sebentar ya, foto kamu sedang diupload ke cloud... ⏳');
      return;
    }
    if (!hasEnoughPhotos) {
      Studio.showToast(`Hampir siap! Kamu perlu menambahkan minimal 6 foto (sekarang: ${state.photos?.length || 0}). 📸`);
      return;
    }
    if (!token) {
      Studio.showToast('Token studio tidak ditemukan. Gunakan link resmi.');
      return;
    }

    validatedPayload = {
      id: token,
      recipientName: state.recipientName || '',
      theme: state.theme,
      occasion: state.occasion,
      message: state.message,
      photos: state.photos,
      voiceNote: state.voiceNote,
      ambient: state.ambient,
      customAmbientUrl: state.customAmbientUrl,
      ambientVolume: state.ambientVolume,
      voiceVolume: state.voiceVolume,
      polaroid_photo: state.polaroid_photo,
      polaroid_letter: state.polaroid_letter,
      silentDuration: state.silentDuration,
      password: state.password || null,
      passwordHint: state.passwordHint || '',
      requestDomain: state.requestDomain || '',
      studioPassword: state.studioPassword || null,
      _meta: {
        generatedAt: new Date().toISOString(),
        theme_folder: Studio.getThemeConfig(state.theme)?.folder || 'gift',
        studioVersion: 'premium-v1'
      }
    };

    _toggleModal('modal-name', true);
  };

  const _handlePublish = async () => {
    const state = Studio.getState();
    const domainInput = document.getElementById('input-request-domain');
    const domainValue = domainInput ? domainInput.value.trim() : (state.requestDomain || '').trim();

    if (!domainValue) {
      Studio.showToast('Nama domain Vercel wajib diisi agar kado bisa diproses! 🌐');
      return;
    }
    if (!validatedPayload) return;

    validatedPayload.requestDomain = domainValue;
    _toggleModal('modal-name', false);

    const btns = [document.getElementById('btn-publish'), document.getElementById('btn-publish-desktop')];
    btns.forEach(btn => {
      if (btn) { btn.classList.add('loading'); btn.textContent = 'Mengirim Data...'; btn.disabled = true; }
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

      if (!response.ok) throw new Error('Gagal mengirim data ke server.');
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Gagal mengirim data.');

      _showVipSuccessModal();
    } catch (err) {
      console.error('[Publisher] VIP Publish error:', err);
      Studio.showToast(err.message || 'Gagal memproses kado. Coba lagi.');
    } finally {
      btns.forEach(btn => {
        if (btn) { btn.classList.remove('loading'); btn.textContent = 'Publish VIP Config'; btn.disabled = false; }
      });
    }
  };

  const _showVipSuccessModal = () => {
    const modal = document.getElementById('modal-success');
    if (modal) {
      const state = Studio.getState();
      const token = Auth.getToken();
      const domainSuffix = state.requestDomain ? `%20.%20Domain%3A%20${state.requestDomain}.vercel.app` : '';
      const waMessage = `Halo%20admin%2C%20saya%20sudah%20publish%20kado%20VIP%20saya.%0AID%3A%20${token}${domainSuffix}`;
      const waBtn = document.getElementById('btn-contact-admin');
      if (waBtn) waBtn.href = `https://wa.me/6281936109076?text=${waMessage}`;
      modal.classList.remove('hidden');
    } else {
      Studio.showToast('Data berhasil dikirim! 🎁 Admin akan memproses kado kamu segera.');
    }
  };

  // ════════════════════════════════════════════════════════════
  // REGULAR FLOW — Submit langsung, customer dapat link seketika
  // ════════════════════════════════════════════════════════════

  const _handleSubmitRegular = async () => {
    const state = Studio.getState();
    const token = Auth.getToken();

    if (Uploader.isUploading()) {
      Studio.showToast('Tunggu sebentar ya, foto kamu sedang diupload ke cloud... ⏳');
      return;
    }
    if (!state.photos || state.photos.length < 6) {
      Studio.showToast(`Hampir siap! Kamu perlu menambahkan minimal 6 foto (sekarang: ${state.photos?.length || 0}). 📸`);
      return;
    }
    if (!token) {
      Studio.showToast('Token studio tidak ditemukan. Gunakan link resmi.');
      return;
    }

    // Gunakan token yang sudah ada sebagai gift ID (sama seperti autosave)
    const giftId = token;

    const btn = document.getElementById('btn-submit-regular');
    if (btn) { btn.textContent = 'Memproses...'; btn.disabled = true; }

    try {
      const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl || 'https://valentine-upload.aldoramadhan16.workers.dev';

      // Bangun payload — sama seperti autosave + status published
      const publishState = {
        ...state,
        status: 'published',
        publishedAt: new Date().toISOString(),
        originalToken: token
      };

      const response = await fetch(`${API_BASE_URL}/save-config?id=${giftId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishState)
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[Publisher] Non-JSON response:', text);
        throw new Error('Gagal memproses ke server. Coba lagi.');
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Gagal publish.');

      // Construct gift URL dari tema yang dipilih customer
      const themeConfig = Studio.getThemeConfig(state.theme);
      const folder = themeConfig ? themeConfig.folder : 'gift';
      const giftUrl = `${window.location.origin}/${folder}/${giftId}`;

      _showRegularSuccessModal(giftUrl);

    } catch (err) {
      console.error('[Publisher] Regular Submit error:', err);
      Studio.showToast(err.message || 'Gagal memproses kado. Coba lagi.');
    } finally {
      if (btn) { btn.textContent = 'Submit & Dapatkan Link Kado'; btn.disabled = false; }
    }
  };

  const _showRegularSuccessModal = (giftUrl) => {
    const modal = document.getElementById('modal-success-regular');
    const urlDisplay = document.getElementById('modal-gift-url-regular');
    const whatsappBtn = document.getElementById('btn-share-whatsapp-regular');
    const viewBtn = document.getElementById('btn-view-gift-regular');
    const qrContainer = document.getElementById('qr-code-box-regular');

    if (urlDisplay) urlDisplay.textContent = giftUrl;
    if (viewBtn) viewBtn.href = giftUrl;

    if (whatsappBtn) {
      const message = encodeURIComponent(`Untukmu, kenangan yang abadi. ✨\n\n${giftUrl}`);
      whatsappBtn.href = `https://wa.me/?text=${message}`;
    }

    // Generate QR Code
    if (qrContainer && typeof QRCode !== 'undefined') {
      qrContainer.innerHTML = '';
      new QRCode(qrContainer, {
        text: giftUrl,
        width: 128,
        height: 128,
        colorDark: '#1a1a1a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      const qrImg = qrContainer.querySelector('img');
      const qrCanvas = qrContainer.querySelector('canvas');
      if (qrImg) qrImg.style.borderRadius = '4px';
      if (qrCanvas) qrCanvas.style.borderRadius = '4px';
    }

    // Bind download QR button
    const downloadBtn = document.getElementById('btn-download-qr-regular');
    if (downloadBtn) {
      const newBtn = downloadBtn.cloneNode(true);
      downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);
      newBtn.addEventListener('click', _handleDownloadQRRegular);
    }

    if (modal) modal.classList.remove('hidden');
  };

  const _handleDownloadQRRegular = async () => {
    const exportNode = document.getElementById('qr-export-container-regular');
    const btn = document.getElementById('btn-download-qr-regular');
    if (!exportNode || typeof html2canvas === 'undefined') {
      Studio.showToast('Fitur download belum siap. Silakan screenshot manual.');
      return;
    }
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span style="opacity:0.7">Memproses...</span>';
    btn.disabled = true;
    try {
      const canvas = await html2canvas(exportNode, {
        scale: 3,
        backgroundColor: '#fffaf5',
        useCORS: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `Gift-QR-${Date.now()}.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      Studio.showToast('Barcode berhasil didownload! 📲');
    } catch (err) {
      console.error('[Publisher] Download QR error:', err);
      Studio.showToast('Gagal download barcode. Coba lagi.');
    } finally {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  };

  const _handleCopyLinkRegular = () => {
    const urlText = document.getElementById('modal-gift-url-regular')?.textContent;
    if (!urlText) return;
    navigator.clipboard.writeText(urlText)
      .then(() => {
        const btn = document.getElementById('btn-copy-link-regular');
        if (btn) {
          btn.textContent = 'TERSALIN';
          setTimeout(() => btn.textContent = 'SALIN LINK', 2000);
        }
      })
      .catch(() => Studio.showToast('Gagal menyalin. Silakan coba manual.'));
  };

  return { init };

})();
