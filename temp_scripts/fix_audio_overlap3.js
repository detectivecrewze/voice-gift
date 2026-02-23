const fs = require('fs');
const path = require('path');
const themes = ['gift', 'gift-sage'];

themes.forEach(theme => {
    const filePath = path.join(__dirname, theme, 'js', 'player.js');
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/\r\n/g, '\n');

    const searchBlock = `      audio.play().then(() => {
        if (!isPlaying) {
          audio.pause();
          audio.currentTime = 0;
        }
        audio.muted = prevMuted;
      }).catch(() => {
        audio.muted = prevMuted;
      });`;

    const replacementBlock = `      // DO NOT call audio.play() here! It bypasses countdown waiting!
      // We only load it. iOS recognizes any interaction event for later playbacks anyway.
      try { audio.load(); } catch(e) {}
      audio.muted = prevMuted;`;

    if (content.includes(searchBlock)) {
        content = content.replace(searchBlock, replacementBlock);
        console.log('Fixed early play on: ' + theme);
    } else {
        console.log('Early play target not found on: ' + theme);
    }

    const startPlayingSearch = `    const startPlaying = () => {
      if (!isPlaying) {
        if (audio.ended) audio.currentTime = 0;
        audio.play().catch(() => { });
        isPlaying = true;`;

    const startPlayingReplace = `    const startPlaying = () => {
      if (!isPlaying) {
        if (audio.ended) audio.currentTime = 0;
        audio.muted = false; // Ensure unmuted
        audio.play().catch(() => { });
        isPlaying = true;`;

    if (content.includes(startPlayingSearch)) {
        content = content.replace(startPlayingSearch, startPlayingReplace);
    }

    fs.writeFileSync(filePath, content);
});
