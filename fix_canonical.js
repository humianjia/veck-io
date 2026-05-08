const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://veckio.space';
const STATIC_PAGE_ROUTES = {
    'index.html': '/',
    'categories.html': '/categories',
    'about.html': '/about',
    'contact.html': '/contact',
    'privacy.html': '/privacy',
    'terms.html': '/terms',
    'browser-fps-guide.html': '/browser-fps-guide',
    'how-we-select-browser-games.html': '/how-we-select-browser-games',
    'browser-game-safety-guide.html': '/browser-game-safety-guide',
    'editorial-review-and-updates.html': '/editorial-review-and-updates'
};

function toCleanRoutePath(value) {
    const normalized = String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
    if (STATIC_PAGE_ROUTES[normalized]) {
        return STATIC_PAGE_ROUTES[normalized];
    }

    return `/${normalized.replace(/\.html$/, '')}`;
}

function normalizeSiteUrl(value) {
    return String(value || '')
        .replace(/https:\/\/veck\.io\//g, `${SITE_URL}/`)
        .replace(/https:\/\/vortex\.io\//g, `${SITE_URL}/`)
        .replace(/^https:\/\/veckio\.space\/(.+?\.html)$/g, (_, pagePath) => `${SITE_URL}${toCleanRoutePath(pagePath)}`);
}

function fixCanonical(filePath) {
    if (!filePath.endsWith('.html')) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;

    content = content.replace(
        /(<link rel="canonical" href=")(https:\/\/[^"]+)(")/g,
        (_, start, url, end) => `${start}${normalizeSiteUrl(url)}${end}`
    );

    content = content.replace(
        /(<meta property="og:url" content=")(https:\/\/[^"]+)(")/g,
        (_, start, url, end) => `${start}${normalizeSiteUrl(url)}${end}`
    );

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Fixed:', filePath);
    }
}

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else if (stat.isFile() && file.endsWith('.html')) {
            fixCanonical(fullPath);
        }
    }
}

scanDirectory(__dirname);
console.log('\nCanonical and og:url normalized in all HTML files!');
