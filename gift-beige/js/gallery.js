// ============================================================
// gallery.js — Photo Gallery & Lightbox
// ============================================================

const Gallery = (() => {

  let _photos = [];
  let _currentIndex = 0;

  const init = (photos, containerEl) => {
    _photos = photos.sort((a, b) => a.order - b.order);
    _renderGrid(containerEl);
    _bindLightboxEvents();
  };

  const _renderGrid = (container) => {
    const grid = document.createElement('div');
    grid.className = 'photo-grid';

    grid.innerHTML = _photos.map((photo, index) => `
      <div class="photo-item" data-index="${index}">
        <img
          src="${photo.url}"
          alt="Foto kenangan ${index + 1}"
          loading="lazy"
          decoding="async"
        />
      </div>
    `).join('');

    container.appendChild(grid);

    // Bind klik untuk buka lightbox
    grid.querySelectorAll('.photo-item').forEach(item => {
      item.addEventListener('click', () => {
        _openLightbox(parseInt(item.dataset.index));
      });
    });
  };

  // ── Lightbox ──────────────────────────────────────────────
  const _openLightbox = (index) => {
    _currentIndex = index;
    _updateLightbox();
    document.getElementById('lightbox')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };

  const _closeLightbox = () => {
    document.getElementById('lightbox')?.classList.add('hidden');
    document.body.style.overflow = '';
  };

  const _updateLightbox = () => {
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');
    if (img) img.src = _photos[_currentIndex].url;
    if (counter) counter.textContent = `${_currentIndex + 1} / ${_photos.length}`;
  };

  const _bindLightboxEvents = () => {
    document.getElementById('lightbox-close')?.addEventListener('click', _closeLightbox);
    document.getElementById('lightbox-prev')?.addEventListener('click', () => {
      _currentIndex = (_currentIndex - 1 + _photos.length) % _photos.length;
      _updateLightbox();
    });
    document.getElementById('lightbox-next')?.addEventListener('click', () => {
      _currentIndex = (_currentIndex + 1) % _photos.length;
      _updateLightbox();
    });

    // Klik luar foto → tutup
    document.getElementById('lightbox')?.addEventListener('click', (e) => {
      if (e.target.id === 'lightbox') _closeLightbox();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      const lb = document.getElementById('lightbox');
      if (lb?.classList.contains('hidden')) return;
      if (e.key === 'ArrowLeft') {
        _currentIndex = (_currentIndex - 1 + _photos.length) % _photos.length;
        _updateLightbox();
      } else if (e.key === 'ArrowRight') {
        _currentIndex = (_currentIndex + 1) % _photos.length;
        _updateLightbox();
      } else if (e.key === 'Escape') {
        _closeLightbox();
      }
    });

    // Touch swipe untuk mobile
    let touchStartX = 0;
    const lb = document.getElementById('lightbox');
    lb?.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    lb?.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          _currentIndex = (_currentIndex + 1) % _photos.length;
        } else {
          _currentIndex = (_currentIndex - 1 + _photos.length) % _photos.length;
        }
        _updateLightbox();
      }
    }, { passive: true });
  };

  return { init };

})();
