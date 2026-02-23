const fs = require('fs');
const path = require('path');

const themes = ['gift-pinky', 'gift-beige', 'gift-blanc', 'gift-sage'];

themes.forEach(theme => {
    const cssPath = path.join(__dirname, theme, 'style.css');
    if (fs.existsSync(cssPath)) {
        let css = fs.readFileSync(cssPath, 'utf8');

        // 1. Update .password-card
        css = css.replace(/(\.password-card\s*\{[^}]*?)border-radius:\s*48px;([^}]*?\})/s, '$1border-radius: 2px;\n  text-align: center;$2');
        css = css.replace(/(\.password-card\s*\{[^}]*?)max-width:\s*380px;([^}]*?\})/s, '$1max-width: 440px;$2');

        // 2. Update .unlock-btn
        css = css.replace(/(\.unlock-btn\s*\{[^}]*?)background:\s*var\(--primary\);([^}]*?\})/s, '$1background: transparent;$2');
        css = css.replace(/(\.unlock-btn\s*\{[^}]*?)color:\s*#fff;([^}]*?\})/s, '$1color: var(--primary);$2');
        css = css.replace(/(\.unlock-btn\s*\{[^}]*?)border:\s*none;([^}]*?\})/s, '$1border: 1px solid var(--primary);$2');
        css = css.replace(/(\.unlock-btn\s*\{[^}]*?)border-radius:\s*12px;([^}]*?\})/s, '$1border-radius: 0;$2');
        css = css.replace(/(\.unlock-btn\s*\{[^}]*?)font-size:\s*10px;([^}]*?\})/s, '$1font-size: 9px;$2');

        css = css.replace(/(\.unlock-btn:hover\s*\{[^}]*?)color:\s*#fff;([^}]*?\})/s, '$1color: var(--bg);$2'); // Assuming background becomes var(--accent) or var(--primary)

        fs.writeFileSync(cssPath, css);
        console.log(`Updated ${theme}`);
    }
});
