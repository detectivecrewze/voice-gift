const fs = require('fs');
const path = require('path');

const paths = [
    'gift/style.css',
    'gift-pinky/style.css',
    'gift-beige/style.css',
    'gift-blanc/style.css',
    'gift-sage/style.css'
];

const appendText = `
/* ── Idle Overlay (PRESS PLAY) ── */
.lcd-idle-overlay {
  position: absolute;
  inset: 0;
  background: #080706; /* Solid black to cover photos completely */
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: opacity 0.8s ease;
}

.lcd-idle-overlay.hidden {
  opacity: 0;
  pointer-events: none;
}

.lcd-idle-line {
  width: 32px;
  height: 1px;
  background: rgba(255, 255, 255, 0.18);
}

.lcd-idle-label {
  font-family: var(--font-mono);
  font-size: 6px;
  letter-spacing: 0.28em;
  color: rgba(255, 255, 255, 0.22);
  text-transform: uppercase;
}
`;

paths.forEach(p => {
    const fullPath = path.join(__dirname, p);
    if (fs.existsSync(fullPath)) {
        fs.appendFileSync(fullPath, appendText);
        console.log('Appended to', fullPath);
    } else {
        console.error('File not found:', fullPath);
    }
});
