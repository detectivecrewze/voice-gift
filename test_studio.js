const puppeteer = require('C:/Users/aldor/AppData/Roaming/npm/node_modules/puppeteer');

(async () => {
    console.log('Starting browser...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log(`[PAGE LOG] ${msg.type().toUpperCase()}:`, msg.text());
    });

    page.on('pageerror', err => {
        console.log('[PAGE ERROR]', err.toString());
    });

    console.log('Navigating to studio...');
    await page.goto('http://localhost:9005/studio/index.html', { waitUntil: 'networkidle2' });

    await browser.close();
    console.log('Done.');
})();
