const fs = require('fs');
const path = require('path');

const themes = ['gift', 'gift-pinky', 'gift-beige', 'gift-blanc', 'gift-sage'];

const targetCode = `            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 48;
            canvas.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;opacity:0.6;';
            overlay.appendChild(canvas);
            const ctx2d = canvas.getContext('2d');

            const staticStartTime = Date.now();
            const draw = () => {
              const data = ctx2d.createImageData(64, 48);
              for (let i = 0; i < data.data.length; i += 4) {
                const v = Math.random() * 255;
                data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
                data.data[i + 3] = 255;
              }
              ctx2d.putImageData(data, 0, 0);

              if (Date.now() - staticStartTime < stepMs) {
                requestAnimationFrame(draw);
              } else {
                overlay.remove();
                autoPlayLoop();
              }
            };
            draw();`;

const replacementCode = `            const video = document.createElement('video');
            video.src = 'https://dl.dropboxusercontent.com/scl/fi/wyyrz4764k2oilganvgfm/TV-Static-and-Color-Bars-Effect_Transition-4K-Second-Place-Productions-360p-h264.mp4?rlkey=qs0banrpnw0fmizp97p5bf16b&st=7r18t3g2&dl=1';
            video.crossOrigin = 'anonymous';
            video.playsInline = true;
            video.muted = true;
            video.autoplay = true;
            video.style.cssText = 'width: 100%; height: 100%; object-fit: cover; opacity: 0.85; mix-blend-mode: screen;';
            overlay.appendChild(video);

            let videoFinished = false;

            const finishCountdown = () => {
              if (videoFinished) return;
              videoFinished = true;
              overlay.remove();
              autoPlayLoop();
            };

            video.addEventListener('ended', finishCountdown);
            video.addEventListener('error', finishCountdown);
            
            // Failsafe timeout (2500ms should be enough for a 2s video)
            setTimeout(finishCountdown, 2500);

            video.play().catch(e => {
              console.log('Video transition playback blocked/failed:', e);
              finishCountdown();
            });`;

themes.forEach(theme => {
    const filePath = path.join(__dirname, '../', theme, 'js', 'player.js');
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Normalize line endings
        content = content.replace(/\r\n/g, '\n');
        const normalizedTarget = targetCode.replace(/\r\n/g, '\n');

        if (content.indexOf(normalizedTarget) !== -1) {
            content = content.replace(normalizedTarget, replacementCode);
            fs.writeFileSync(filePath, content);
            console.log(\`Successfully updated video transition in \${theme}\`);
    } else {
      console.log(\`Could not find target block in \${theme}\`);
    }
  }
});
