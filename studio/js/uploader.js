// ============================================================
// uploader.js — Photo Upload & Management
// ============================================================
// Bertanggung jawab untuk:
//   1. Menangani drag-and-drop dan klik pilih foto
//   2. Validasi file (tipe, ukuran, jumlah)
//   3. Konversi HEIC → JPEG untuk foto iPhone
//   4. Kompresi foto besar (Canvas API, maks 2000px)
//   5. Upload ke API POST /api/upload
//   6. Render thumbnail grid dengan state (uploading/success/error)
//   7. Hapus foto individual
//   8. Drag-to-reorder via Sortable.js
//   9. Sinkronisasi dengan state global di studio.js
// ============================================================
// DEPENDENCY: Sortable.js (CDN), heic2any (CDN)
// DIPANGGIL OLEH: studio.js
// ============================================================

const Uploader = (() => {

  // ── Config ──────────────────────────────────────────────
  const MAX_PHOTOS = 15;
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  const MAX_DIMENSION = 1080; // Reduced from 1600 for performance
  const QUALITY = 0.6;        // Reduced from 0.75 for speed

  // ── State lokal ─────────────────────────────────────────
  // Array of: { id, url, order, status: 'uploading'|'success'|'error', localPreview }
  let _photos = [];
  let _sortableInstance = null;

  // ── DOM Elements ─────────────────────────────────────────
  const dropzone = () => document.getElementById('photo-dropzone');
  const grid = () => document.getElementById('photo-grid');
  const fileInput = () => document.getElementById('file-input-photos');
  const btnAddPhoto = () => document.getElementById('btn-pick-photos');
  const countLabel = () => document.getElementById('photo-count-label');

  // ── Init ─────────────────────────────────────────────────
  const init = (initialPhotos = []) => {
    _photos = initialPhotos.map((p, i) => ({ ...p, status: 'success', caption: p.caption || '' }));

    _bindEvents();
    _render();

    // 4. Inisialisasi Sortable.js & Static Event Listeners
    const g = grid();
    if (g) {
      // Pasang listener caption sekali saja (Bug #5 Fix: jangan dipasang ulang tiap _render)
      let _captionSaveTimer = null;

      g.addEventListener('input', (e) => {
        if (!e.target.classList.contains('caption-input')) return;
        _updatePhoto(e.target.dataset.id, { caption: e.target.value });
        clearTimeout(_captionSaveTimer);
        _captionSaveTimer = setTimeout(() => {
          Studio.onPhotosChanged(_photos.filter(p => p.status === 'success'));
        }, 800);
      });

      g.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('caption-input')) e.stopPropagation();
      });

      g.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('caption-input')) e.stopPropagation();
      }, { passive: true });

      // Init Sortable list
      if (typeof Sortable !== 'undefined') {
        _sortableInstance = new Sortable(g, { // Assign to _sortableInstance
          animation: 150,
          handle: '.photo-item',
          ghostClass: 'opacity-50',
          onEnd: (evt) => {
            if (evt.oldIndex === evt.newIndex) return;
            // Pindahkan elemen di array
            const item = _photos.splice(evt.oldIndex, 1)[0];
            _photos.splice(evt.newIndex, 0, item);
            // Update UI & callback
            _render();
            // Beri tahu studio.js bahwa foto berubah
            Studio.onPhotosChanged(_photos.filter(p => p.status === 'success'));
          },
        });
      }
    }
  };

  // ── Bind Events ──────────────────────────────────────────
  const _bindEvents = () => {
    const dz = dropzone();
    const fi = fileInput();
    const btn = btnAddPhoto();

    if (!dz || !fi) return;

    // Klik pada dropzone atau tombol "Tambah Foto"
    dz.addEventListener('click', () => fi.click());
    if (btn) btn.addEventListener('click', () => fi.click());

    // File dipilih via file picker
    fi.addEventListener('change', (e) => {
      _handleFiles(Array.from(e.target.files));
      fi.value = ''; // Reset agar bisa pilih file yang sama lagi
    });

    // Drag-and-drop events
    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      dz.classList.add('drag-over');
    });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.heic'));
      _handleFiles(files);
    });
  };

  // ── Handle File Selection ─────────────────────────────────
  const _handleFiles = async (files) => {
    for (const file of files) {
      // Cek batas maksimum
      const successCount = _photos.filter(p => p.status === 'success' || p.status === 'uploading').length;
      if (successCount >= MAX_PHOTOS) {
        Studio.showToast(`Batas maksimal foto tercapai. Silakan hapus foto untuk menambah yang baru.`);
        break;
      }

      // Cek tipe file
      const isImage = file.type.startsWith('image/');
      const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
      if (!isImage && !isHeic) {
        Studio.showToast(`"${file.name}" bukan file foto yang valid.`);
        continue;
      }

      // Buat ID sementara
      const tempId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // Tambahkan ke state dengan status uploading
      _photos.push({ id: tempId, url: null, order: _photos.length, status: 'uploading', localPreview: null, caption: '' });
      _render();

      // Proses dan upload file
      await _processAndUpload(file, tempId);
    }
  };

  // ── Process & Upload Single File ─────────────────────────
  const _processAndUpload = async (file, tempId) => {
    try {
      let processedFile = file;

      // 1. Konversi HEIC ke JPEG (untuk foto iPhone)
      const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
      if (isHeic && typeof heic2any === 'function') {
        try {
          const blob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8
          });
          processedFile = new File(
            [Array.isArray(blob) ? blob[0] : blob],
            file.name.replace(/\.[^/.]+$/, "") + ".jpg",
            { type: 'image/jpeg' }
          );
        } catch (heicErr) {
          console.warn('[Uploader] HEIC conversion failed, trying original', heicErr);
        }
      }

      // 2. Kompres & Resize dengan Canvas API jika terlalu besar
      // Kita kompres semua foto untuk menghemat bandwidth R2 dan mempercepat load
      processedFile = await _compressImage(processedFile);

      // 4. Buat local preview URL sebelum upload (untuk tampil instan)
      const localPreviewUrl = URL.createObjectURL(processedFile);
      _updatePhoto(tempId, { localPreview: localPreviewUrl });
      _render();

      // 5. Upload ke API
      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('type', 'photo');

      // HARDCODED FIX: Bypass APP_CONFIG cache issues
      const API_BASE_URL = 'https://valentine-upload.aldoramadhan16.workers.dev';

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      }).catch(err => {
        console.error('[Uploader] Network error:', err);
        throw new Error('Koneksi ke server gagal. Pastikan API menyala.');
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Uploader] Server error:', response.status, errorText);
        throw new Error(`Server error (${response.status})`);
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Upload gagal');

      // 6. Update state dengan URL dari R2
      const photo = _photos.find(p => p.id === tempId);
      if (photo && photo.localPreview) {
        URL.revokeObjectURL(photo.localPreview);
      }
      _updatePhoto(tempId, { url: result.url, status: 'success', localPreview: null });
      _render();

      // 7. Beri tahu studio.js
      Studio.onPhotosChanged(_photos.filter(p => p.status === 'success'));

    } catch (err) {
      console.error('[Uploader] Error:', err);
      _updatePhoto(tempId, { status: 'error', errorMsg: err.message });
      _render();
    }
  };

  // ── Compress Image via Canvas API ─────────────────────────
  const _compressImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Resize sisi terpanjang ke MAX_DIMENSION (2000px)
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file); // Fallback jika gagal
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.75 // Quality: 75% (Optimasi Cloud)
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file); // Fallback ke file asli jika error load
      };

      img.src = url;
    });
  };

  // ── Delete Photo ──────────────────────────────────────────
  const deletePhoto = (photoId) => {
    // Revoke local preview URL if exists to prevent memory leak
    const photo = _photos.find(p => p.id === photoId);
    if (photo && photo.localPreview) {
      URL.revokeObjectURL(photo.localPreview);
    }

    _photos = _photos.filter(p => p.id !== photoId);
    _syncOrder();
    _render();
    Studio.onPhotosChanged(_photos.filter(p => p.status === 'success'));
  };

  // ── Retry Upload ──────────────────────────────────────────
  const retryUpload = (photoId) => {
    // TODO: Simpan file original untuk retry
    // Untuk sekarang, hapus saja item yang error
    deletePhoto(photoId);
    Studio.showToast('Silakan tambahkan foto tersebut lagi.');
  };

  // ── Internal Helpers ──────────────────────────────────────
  const _updatePhoto = (id, updates) => {
    const idx = _photos.findIndex(p => p.id === id);
    if (idx !== -1) _photos[idx] = { ..._photos[idx], ...updates };
  };

  const _syncOrder = () => {
    _photos.forEach((p, i) => p.order = i);
  };

  const _syncOrderFromDOM = () => {
    const items = grid()?.querySelectorAll('.photo-item');
    if (!items) return;

    // Create new array based on DOM order
    const orderedPhotos = [];
    items.forEach((el) => {
      const id = el.dataset.id;
      const photo = _photos.find(p => p.id === id);
      if (photo) orderedPhotos.push(photo);
    });

    // Update local state and sync numeric order property
    _photos = orderedPhotos;
    _syncOrder();
  };

  // ── Helpers ─────────────────────────────────────────────
  const isUploading = () => _photos.some(p => p.status === 'uploading');

  // ── Render ────────────────────────────────────────────────
  const _render = () => {
    const dz = dropzone();
    const g = grid();
    const label = countLabel();

    if (!dz || !g) return;

    const hasPhotos = _photos.length > 0;
    const successCount = _photos.filter(p => p.status === 'success').length;

    // Toggle dropzone vs grid
    dz.classList.toggle('hidden', hasPhotos);
    g.classList.toggle('hidden', !hasPhotos);
    if (label) label.textContent = `(${successCount} / ${MAX_PHOTOS})`;

    // Toggle Hints
    const reorderHint = document.getElementById('reorder-hint');
    if (reorderHint) reorderHint.classList.toggle('hidden', !hasPhotos);

    const captionHint = document.getElementById('caption-hint');
    if (captionHint) captionHint.classList.toggle('hidden', !hasPhotos);

    // Render thumbnail grid
    g.innerHTML = _photos.map(photo => _renderThumbnail(photo)).join('');

    // Re-bind events for dynamic buttons (delete & retry)
    g.querySelectorAll('.btn-delete-photo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deletePhoto(btn.dataset.id);
      });
    });
    g.querySelectorAll('.btn-retry-photo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        retryUpload(btn.dataset.id);
      });
    });
  };

  const _renderThumbnail = (photo) => {
    // SHIMMER / LOADING
    if (photo.status === 'uploading') {
      return `
        <div class="photo-item shimmer" data-id="${photo.id}">
          <div class="h-full w-full bg-gray-50 flex items-center justify-center">
            <span class="text-[8px] uppercase tracking-[0.2em] text-gray-300">Curating...</span>
          </div>
        </div>
      `;
    }

    // ERROR
    if (photo.status === 'error') {
      return `
        <div class="photo-item border-rose-100 bg-rose-50 flex flex-col items-center justify-center p-4 text-center" data-id="${photo.id}">
          <p class="text-[8px] text-rose-400 uppercase tracking-widest leading-relaxed mb-4">${photo.errorMsg || 'Upload Gagal'}</p>
          <div class="flex gap-4">
            <button class="btn-retry-photo text-[8px] font-bold underline uppercase tracking-widest" data-id="${photo.id}">Retry</button>
            <button class="btn-delete-photo text-[8px] text-gray-400 uppercase tracking-widest" data-id="${photo.id}">Hapus</button>
          </div>
        </div>
      `;
    }

    // SUCCESS (Polaroid Style)
    // Find index to show number
    const index = _photos.findIndex(p => p.id === photo.id) + 1;
    const captionVal = (photo.caption || '').replace(/"/g, '&quot;');

    return `
      <div class="photo-item group relative flex flex-col" data-id="${photo.id}" style="aspect-ratio: unset; height: auto;">
        <!-- Foto area dengan rasio 4/5 -->
        <div class="relative w-full" style="aspect-ratio: 4/5; overflow: hidden; border-radius: 2px;">
          <!-- Sequence Number Tag -->
          <div class="photo-number absolute top-2 left-2 w-5 h-5 bg-[#d4a373] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm z-20">
            ${index}
          </div>

          <!-- Drag Handle -->
          <div class="drag-handle absolute top-2 left-9 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing shadow-sm z-10">
            <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
            </svg>
          </div>

          <img src="${photo.url || photo.localPreview}" class="animate-in fade-in duration-700 w-full h-full object-cover" alt="" />
          <button 
            class="btn-delete-photo absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white shadow-sm z-10"
            data-id="${photo.id}"
            title="Hapus Memo"
          >
            ✕
          </button>
        </div>

        <!-- Styled Caption Field (Multiline Textarea) -->
        <div class="relative mt-3 px-1">
          <textarea
            class="caption-input w-full px-1 py-1 text-[11px] text-center text-gray-700 bg-transparent border-b border-gray-100 focus:border-[#d4a373] focus:text-gray-900 focus:outline-none placeholder-gray-300 transition-all leading-relaxed font-serif italic resize-none overflow-hidden"
            placeholder="Tambah cerita..."
            maxlength="120"
            rows="2"
            data-id="${photo.id}"
          >${captionVal}</textarea>
          <div class="absolute right-0 bottom-2 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536M9 11l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
            </svg>
          </div>
        </div>
      </div>
    `;
  };

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    getPhotos: () => _photos.filter(p => p.status === 'success'),
    loadFromConfig: (photos) => init(photos),
    remove: deletePhoto,
    retry: retryUpload,
    isUploading
  };

})();
