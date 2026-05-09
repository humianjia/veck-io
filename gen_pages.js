const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://veckio.space';
const ROOT = __dirname;
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

const DATASETS = [
    { file: 'js/game_data/action.js', dir: 'Action', label: 'Action' },
    { file: 'js/game_data/battleRoyale.js', dir: 'BattleRoyale', label: 'Battle Royale' },
    { file: 'js/game_data/fps.js', dir: 'FPS', label: 'FPS' },
    { file: 'js/game_data/multiplayer.js', dir: 'Multiplayer', label: 'Multiplayer' },
    { file: 'js/game_data/sniper.js', dir: 'Sniper', label: 'Sniper' }
];

function parseGameData(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/=\s*(\[[\s\S]*\]);?\s*$/);
    if (!match) {
        return [];
    }

    return eval(match[1]);
}

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function sanitizeAdFriendlyText(value) {
    return normalizeText(value)
        .replace(/\bterrorist\b/gi, 'enemy')
        .replace(/\bassassination\b/gi, 'mission objective')
        .replace(/\bcriminal underworld\b/gi, 'crime-fiction setting')
        .replace(/\bgang-themed\b/gi, 'urban-themed')
        .replace(/\bgangs?\b/gi, 'factions')
        .replace(/\bweapons\b/gi, 'loadout options');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function toCleanRoute(filePath) {
    const normalized = String(filePath || '').replace(/\\/g, '/');
    if (STATIC_PAGE_ROUTES[normalized]) {
        return STATIC_PAGE_ROUTES[normalized];
    }

    return `/${normalized.replace(/\.html$/, '')}`;
}

function toSiteUrl(filePath) {
    return `${SITE_URL}${toCleanRoute(filePath)}`;
}

function toRelativeRoute(filePath, relativePrefix = '') {
    const route = toCleanRoute(filePath);
    if (route === '/') {
        return relativePrefix || '/';
    }

    return `${relativePrefix}${route.replace(/^\//, '')}`;
}

function buildCategoryHref(category, relativePrefix = '') {
    return `${toRelativeRoute('categories.html', relativePrefix)}?category=${category}`;
}

function makeShortDescription(game) {
    const description = normalizeText(game.description);
    if (!description) {
        return `Open ${game.name} in your browser with no download required.`;
    }

    const firstSentence = description.match(/.*?[.!?](\s|$)/);
    const summary = firstSentence ? firstSentence[0].trim() : description;
    return summary.length > 150 ? `${summary.slice(0, 147)}...` : summary;
}

function buildHighlights(game, categoryLabel) {
    const tags = (Array.isArray(game.tags) ? game.tags : []).map((tag) => sanitizeAdFriendlyText(tag));
    const highlights = [];

    if (game.gameType) {
        highlights.push(`${game.gameType} browser gameplay`);
    }

    if (tags.length > 0) {
        highlights.push(`Themes include ${tags.slice(0, 3).join(', ')}`);
    }

    highlights.push(`Playable from the ${categoryLabel} section on veck io`);
    return highlights.slice(0, 3);
}

function buildTips(game) {
    const category = normalizeText(game.gameType).toLowerCase();

    if (category.includes('fps') || category.includes('sniper')) {
        return [
            'Use fullscreen for a cleaner aiming area if your device supports it.',
            'Expect the first load to depend on the external game provider.',
            'If the game feels too intense for the moment, use the related picks section to jump to another page.'
        ];
    }

    if (category.includes('multiplayer')) {
        return [
            'Match quality and load speed may depend on current third-party service availability.',
            'Try a stable connection first if a multiplayer session takes longer to start.',
            'Use related picks to quickly compare similar pages in the same category.'
        ];
    }

    return [
        'This page is designed for quick browser access with no local install step.',
        'If the embed needs a moment to load, the overview below still gives context before you commit.',
        'Use the related picks section to continue browsing without returning to the homepage.'
    ];
}

function sanitizeGameDescription(description) {
    return sanitizeAdFriendlyText(description)
        .replace(/\benemy\b/gi, 'hostile enemy')
        .replace(/\bmission objective\b/gi, 'mission-based objective');
}

function getRelatedGames(currentGame, allGames, limit = 8) {
    return allGames
        .filter((game) => game.link && game.link !== currentGame.link)
        .filter((game) => game.gameType === currentGame.gameType)
        .slice(0, limit);
}

function buildFooter(relativePrefix) {
    return `
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>About veck io</h3>
                    <p>veck io organizes browser game pages with short context, clear navigation, and visible review and support signals.</p>
                </div>
                <div class="footer-section">
                    <h3>Browse</h3>
                    <ul>
                        <li><a href="${toRelativeRoute('index.html', relativePrefix)}">Homepage</a></li>
                        <li><a href="${buildCategoryHref('all', relativePrefix)}">All Games</a></li>
                        <li><a href="${buildCategoryHref('fps', relativePrefix)}">FPS Games</a></li>
                        <li><a href="${buildCategoryHref('multiplayer', relativePrefix)}">Multiplayer Games</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h3>Policies</h3>
                    <ul>
                        <li><a href="${toRelativeRoute('about.html', relativePrefix)}">About</a></li>
                        <li><a href="${toRelativeRoute('contact.html', relativePrefix)}">Contact</a></li>
                        <li><a href="${toRelativeRoute('privacy.html', relativePrefix)}">Privacy Policy</a></li>
                        <li><a href="${toRelativeRoute('terms.html', relativePrefix)}">Terms of Service</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h3>Guides</h3>
                    <ul>
                        <li><a href="${toRelativeRoute('browser-fps-guide.html', relativePrefix)}">Choosing a Browser FPS</a></li>
                        <li><a href="${toRelativeRoute('how-we-select-browser-games.html', relativePrefix)}">How We Select Games</a></li>
                        <li><a href="${toRelativeRoute('editorial-review-and-updates.html', relativePrefix)}">Editorial Review and Updates</a></li>
                        <li><a href="${toRelativeRoute('browser-game-safety-guide.html', relativePrefix)}">Safety and Privacy Guide</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">Copyright 2026 veck io. All rights reserved.</div>
        </footer>
    `;
}

function buildPage(game, categoryDir, categoryLabel, allGames) {
    const pageUrl = toSiteUrl(game.link);
    const relativePrefix = '../';
    const imageUrl = (game.imageUrl || 'img/icon/veckIo.jpg').replace(/^img\//, '../img/');
    const description = sanitizeGameDescription(game.description || `${game.name} is playable in your browser on veck io.`);
    const shortDescription = makeShortDescription({ description });
    const highlights = buildHighlights(game, categoryLabel);
    const tips = buildTips(game);
    const tags = (Array.isArray(game.tags) ? game.tags : []).map((tag) => sanitizeAdFriendlyText(tag));
    const relatedGames = getRelatedGames(game, allGames);
    const keywordContent = sanitizeAdFriendlyText(game.keywords || `${game.name}, ${game.gameType}, browser game`);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-GHQS0XRZ6D"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-GHQS0XRZ6D');
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(game.name)} - Play Online on veck io</title>
    <meta name="description" content="${escapeHtml(shortDescription)} Read a quick overview, browser notes, and related picks on veck io.">
    <meta name="keywords" content="${escapeHtml(keywordContent)}">
    <meta name="robots" content="index, follow">
    <meta name="author" content="veck io">
    <meta name="google-adsense-account" content="ca-pub-7534347140708021">
    <link rel="canonical" href="${pageUrl}">
    <meta property="og:title" content="${escapeHtml(game.name)} - Play Online on veck io">
    <meta property="og:description" content="${escapeHtml(shortDescription)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${pageUrl}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(game.name)} - Play Online on veck io">
    <meta name="twitter:description" content="${escapeHtml(shortDescription)}">
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../css/css.css">
</head>
<body>
    <div class="particles" id="particles"></div>
    <div class="cursor-glow" id="cursorGlow"></div>
    <div class="site-shell">
        <header class="header">
            <a href="${toRelativeRoute('index.html', relativePrefix)}" class="logo" aria-label="veck io home">
                <svg class="logo-icon" viewBox="0 0 50 50" width="45" height="45" aria-hidden="true">
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#78c4ff;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#5df0c1;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="url(#grad1)" stroke-width="3"/>
                    <circle cx="25" cy="25" r="12" fill="none" stroke="url(#grad1)" stroke-width="2"/>
                    <circle cx="25" cy="25" r="4" fill="#5df0c1"/>
                </svg>
                <span class="logo-text">veck <span class="logo-io">io</span></span>
            </a>
            <nav class="nav-categories" aria-label="Primary">
                <a href="${buildCategoryHref('all', relativePrefix)}" class="nav-item">All Games</a>
                <a href="${buildCategoryHref('fps', relativePrefix)}" class="nav-item">FPS</a>
                <a href="${buildCategoryHref('battle-royale', relativePrefix)}" class="nav-item">Battle Royale</a>
                <a href="${buildCategoryHref('sniper', relativePrefix)}" class="nav-item">Sniper</a>
                <a href="${buildCategoryHref('multiplayer', relativePrefix)}" class="nav-item">Multiplayer</a>
                <a href="${buildCategoryHref('action', relativePrefix)}" class="nav-item">Action</a>
            </nav>
            <div class="search-bar">
                <label class="visually-hidden" for="site-search">Search games</label>
                <input id="site-search" type="text" placeholder="Search games" data-site-search data-search-base="../">
                <i class="fas fa-search" aria-hidden="true"></i>
            </div>
        </header>

        <main class="main-container">
            <section class="page-card">
                <span class="eyebrow"><i class="fas fa-location-dot"></i> ${escapeHtml(categoryLabel)} Page</span>
                <h1 class="page-title">${escapeHtml(game.name)}</h1>
                <p class="page-subtitle">${escapeHtml(shortDescription)}</p>
                <div class="metric-grid page-section">
                    ${highlights.map((item) => `
                    <div class="metric-card">
                        <div class="metric-value"><i class="fas fa-check"></i></div>
                        <div class="metric-label">${escapeHtml(item)}</div>
                    </div>`).join('')}
                </div>
            </section>

            <section class="game-showcase page-section">
                <div class="game-frame">
                    <iframe id="game-iframe" src="${escapeHtml(game.iframeUrl || '')}" title="Play ${escapeHtml(game.name)}" allowfullscreen loading="lazy"></iframe>
                    <div class="game-overlay-note">
                        <div class="game-frame-badge">
                            <strong>Quick note:</strong> this page adds a short overview and related picks so the game is easier to evaluate before and after loading.
                        </div>
                        <div class="game-frame-badge">
                            <strong>Third-party content:</strong> gameplay runs through an external provider and may load at a different speed depending on region and device.
                        </div>
                    </div>
                </div>
                <div class="game-controls">
                    <div class="game-title-section">
                        <img src="${escapeHtml(imageUrl)}" id="game-icon" class="game-icon" alt="${escapeHtml(game.name)}">
                        <div>
                            <span class="game-title" id="current-game-title">${escapeHtml(game.name)}</span>
                            <span class="game-subtitle">${escapeHtml(categoryLabel)} browser game page</span>
                        </div>
                    </div>
                    <div class="game-actions">
                        <button class="action-btn" id="fullscreen-btn" type="button" title="Fullscreen">
                            <i class="fas fa-expand" aria-hidden="true"></i>
                        </button>
                        <button class="action-btn" id="refresh-btn" type="button" title="Reload game">
                            <i class="fas fa-rotate-right" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </section>

            <section class="content-section">
                <div class="game-info">
                    <div class="info-header">This page is part of the veck io ${escapeHtml(categoryLabel.toLowerCase())} library and is meant to help visitors understand the game quickly before relying on the embedded experience alone.</div>
                    <div class="info-content">
                        <h2>About ${escapeHtml(game.name)}</h2>
                        <p>${escapeHtml(description)}</p>
                        <h3>Why this page exists</h3>
                        <p>veck io adds a lightweight editorial layer around browser games so visitors can scan the title, category, and broad play style before opening an external embed.</p>
                        <h3>Browser play notes</h3>
                        <ul>
                            ${tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="tags">
                        <span class="tag"><i class="fas fa-folder-open"></i> ${escapeHtml(categoryLabel)}</span>
                        ${tags.slice(0, 5).map((tag) => `<span class="tag"><i class="fas fa-tag"></i> ${escapeHtml(tag)}</span>`).join('')}
                    </div>
                </div>
                <div class="success-card">
                    <strong>Editorial review note:</strong> veck io reviews summaries, category placement, support links, and external play access when a page changes, breaks, or is reported. <a href="${toRelativeRoute('editorial-review-and-updates.html', relativePrefix)}">See how pages are reviewed and updated</a>.
                </div>
            </section>

            <section class="related-games">
                <h2 class="section-title">Related game pages</h2>
                <p class="section-lead">More picks from the same site that may suit a similar mood or play style.</p>
                <div class="games-grid" id="related-games-container">
                    ${relatedGames.map((relatedGame) => `
                    <article class="game-card" tabindex="0" data-link="${toRelativeRoute(relatedGame.link, relativePrefix)}">
                        <div class="game-card-image">
                            <img src="${escapeHtml((relatedGame.imageUrl || 'img/icon/veckIo.jpg').replace(/^img\//, '../img/'))}" alt="${escapeHtml(relatedGame.name)}" loading="lazy">
                        </div>
                        <div class="game-card-info">
                            <div class="game-card-category">${escapeHtml(relatedGame.gameType || 'Game')}</div>
                            <h3 class="game-card-title">${escapeHtml(relatedGame.name)}</h3>
                            <p class="game-card-desc">${escapeHtml(makeShortDescription(relatedGame))}</p>
                        </div>
                    </article>`).join('')}
                </div>
            </section>
        </main>

        ${buildFooter(relativePrefix)}
    </div>

    <script src="../js/game_data/games.js"></script>
    <script src="../js/game_data/action.js"></script>
    <script src="../js/game_data/battleRoyale.js"></script>
    <script src="../js/game_data/fps.js"></script>
    <script src="../js/game_data/multiplayer.js"></script>
    <script src="../js/game_data/sniper.js"></script>
    <script src="../init.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const iframe = document.getElementById('game-iframe');
            const fullscreenButton = document.getElementById('fullscreen-btn');
            const refreshButton = document.getElementById('refresh-btn');

            fullscreenButton.addEventListener('click', function () {
                if (iframe.requestFullscreen) {
                    iframe.requestFullscreen();
                }
            });

            refreshButton.addEventListener('click', function () {
                iframe.src = iframe.src;
            });

            document.querySelectorAll('[data-link]').forEach((card) => {
                const open = function () {
                    window.location.href = card.dataset.link;
                };

                card.addEventListener('click', open);
                card.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        open();
                    }
                });
            });
        });
    </script>
</body>
</html>`;
}

function writeGamePages() {
    const allGames = DATASETS.flatMap(({ file }) => parseGameData(path.join(ROOT, file)));
    const expectedLinks = new Set();
    let total = 0;

    DATASETS.forEach(({ file, dir, label }) => {
        const games = parseGameData(path.join(ROOT, file));
        const outputDir = path.join(ROOT, dir);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        games.forEach((game) => {
            if (!game.link) {
                return;
            }

            const outputPath = path.join(ROOT, game.link);
            expectedLinks.add(game.link.replaceAll('/', path.sep));

            const page = buildPage(game, dir, label, allGames);
            fs.writeFileSync(outputPath, page, 'utf8');
            total += 1;
        });

        const existingFiles = fs.readdirSync(outputDir).filter((name) => name.endsWith('.html'));
        existingFiles.forEach((fileName) => {
            const relativePath = path.join(dir, fileName);
            if (!expectedLinks.has(relativePath)) {
                fs.unlinkSync(path.join(ROOT, relativePath));
            }
        });
    });

    return { total, allGames };
}

function buildSitemap(allGames) {
    const urls = [
        { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
        { loc: `${SITE_URL}/categories`, priority: '0.9', changefreq: 'weekly' },
        { loc: `${SITE_URL}/about`, priority: '0.4', changefreq: 'monthly' },
        { loc: `${SITE_URL}/contact`, priority: '0.4', changefreq: 'monthly' },
        { loc: `${SITE_URL}/privacy`, priority: '0.3', changefreq: 'monthly' },
        { loc: `${SITE_URL}/terms`, priority: '0.3', changefreq: 'monthly' },
        { loc: `${SITE_URL}/browser-fps-guide`, priority: '0.6', changefreq: 'monthly' },
        { loc: `${SITE_URL}/how-we-select-browser-games`, priority: '0.6', changefreq: 'monthly' },
        { loc: `${SITE_URL}/browser-game-safety-guide`, priority: '0.6', changefreq: 'monthly' },
        { loc: `${SITE_URL}/editorial-review-and-updates`, priority: '0.6', changefreq: 'monthly' },
        ...allGames
            .filter((game) => game.link && game.link !== 'index.html')
            .map((game) => ({
                loc: toSiteUrl(game.link),
                priority: '0.7',
                changefreq: 'monthly'
            }))
    ];

    const today = new Date().toISOString().slice(0, 10);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
}

function main() {
    const { total, allGames } = writeGamePages();
    buildSitemap(allGames);
    console.log(`Generated ${total} game pages and refreshed sitemap.xml`);
}

main();
