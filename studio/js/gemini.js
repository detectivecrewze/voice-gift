/**
 * gemini.js — Studio AI Generator for Pesan Rahasia
 * Calls POST /generate-ai on the Cloudflare Worker.
 * The actual Gemini API key NEVER touches the browser.
 */

const GeminiAI = (() => {

  // Worker endpoint (same base as the rest of the Studio)
  const WORKER_URL = window.APP_CONFIG?.apiBaseUrl || 'https://valentine-upload.aldoramadhan16.workers.dev';

  let currentTone = 'romantis'; // Default tone

  // ── Open modal ────────────────────────────────────────────
  function openModal() {
    const modal = document.getElementById('modal-ai-generator');
    if (!modal) return;

    // Reset state
    _setView('input');
    document.getElementById('ai-prompt-input').value = '';
    document.getElementById('ai-result-text').textContent = '';
    document.getElementById('ai-error-msg').textContent = '';

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      modal.querySelector('.ai-modal-card').classList.remove('scale-95', 'opacity-0');
      modal.querySelector('.ai-modal-card').classList.add('scale-100', 'opacity-100');
    });

    setTimeout(() => document.getElementById('ai-prompt-input')?.focus(), 300);
  }

  // ── Close modal ───────────────────────────────────────────
  function closeModal() {
    const modal = document.getElementById('modal-ai-generator');
    if (!modal) return;
    const card = modal.querySelector('.ai-modal-card');
    card.classList.add('scale-95', 'opacity-0');
    card.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => modal.classList.add('hidden'), 250);
  }

  // ── Switch between views: 'input' | 'loading' | 'result' ─
  function _setView(view) {
    document.getElementById('ai-view-input').classList.toggle('hidden', view !== 'input');
    document.getElementById('ai-view-loading').classList.toggle('hidden', view !== 'loading');
    document.getElementById('ai-view-result').classList.toggle('hidden', view !== 'result');
    document.getElementById('ai-error-msg').textContent = '';
  }

  // ── Generate ──────────────────────────────────────────────
  async function generate() {
    const prompt = document.getElementById('ai-prompt-input')?.value?.trim();
    if (!prompt) {
      document.getElementById('ai-error-msg').textContent = 'Tuliskan dulu instruksinya ya 😊';
      return;
    }

    _setView('loading');

    try {
      const response = await fetch(`${WORKER_URL}/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, tone: currentTone, maxWords: 800 })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Terjadi kesalahan. Coba lagi.');
      }

      document.getElementById('ai-result-text').textContent = data.text;
      _setView('result');

    } catch (err) {
      _setView('input');
      document.getElementById('ai-error-msg').textContent = err.message || 'Gagal menghubungi AI. Coba lagi.';
    }
  }

  // ── Apply result to textarea ──────────────────────────────
  function applyResult() {
    const resultText = document.getElementById('ai-result-text')?.textContent?.trim();
    const textarea = document.getElementById('polaroid-letter-input');
    if (!textarea || !resultText) return;

    // Animate typing the text
    textarea.style.transition = 'background-color 0.3s ease';
    textarea.style.backgroundColor = '#fffbf5';
    textarea.value = resultText;
    textarea.dispatchEvent(new Event('input', { bubbles: true })); // trigger char count update
    setTimeout(() => { textarea.style.backgroundColor = ''; }, 600);

    closeModal();

    // Show a small toast if Studio.showToast is available
    if (typeof Studio !== 'undefined' && Studio.showToast) {
      Studio.showToast('✨ Pesan AI berhasil diterapkan!');
    }
  }

  // ── Try again from result view ────────────────────────────
  function tryAgain() {
    _setView('input');
    document.getElementById('ai-prompt-input')?.focus();
  }

  // ── Bind all events once DOM is ready ─────────────────────
  function init() {
    document.getElementById('btn-open-ai-generator')?.addEventListener('click', openModal);
    document.getElementById('btn-ai-close')?.addEventListener('click', closeModal);
    document.getElementById('btn-ai-generate')?.addEventListener('click', generate);
    document.getElementById('btn-ai-apply')?.addEventListener('click', applyResult);
    document.getElementById('btn-ai-retry')?.addEventListener('click', tryAgain);

    // Close on backdrop click
    document.getElementById('modal-ai-generator')?.addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });

    // Allow Enter key to trigger generate
    document.getElementById('ai-prompt-input')?.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generate();
      }
    });

    // Tone selector logic
    const toneButtons = document.querySelectorAll('#ai-tone-selector button');
    toneButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Reset all buttons
        toneButtons.forEach(b => {
          b.className = 'px-4 py-2 text-[10px] rounded-full border border-gray-200 bg-white text-gray-500 font-bold transition-all hover:border-[#d4a373] hover:text-[#d4a373]';
        });

        // Active button styling
        btn.className = 'px-4 py-2 text-[10px] rounded-full border border-[#d4a373] bg-[#d4a373] text-white font-bold transition-all';
        currentTone = btn.dataset.tone;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { openModal, closeModal, generate, applyResult };
})();