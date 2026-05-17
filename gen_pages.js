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
    { file: 'js/game_data/action.js', dir: 'Action', label: 'Action', navLabel: 'New' },
    { file: 'js/game_data/battleRoyale.js', dir: 'BattleRoyale', label: 'Battle Royale', navLabel: 'Survival' },
    { file: 'js/game_data/fps.js', dir: 'FPS', label: 'FPS', navLabel: 'Shooter Games' },
    { file: 'js/game_data/multiplayer.js', dir: 'Multiplayer', label: 'Multiplayer', navLabel: 'Popular' },
    { file: 'js/game_data/sniper.js', dir: 'Sniper', label: 'Sniper', navLabel: 'Sniper' }
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

function buildStructuredDataScript(data) {
    return `<script type="application/ld+json">\n${JSON.stringify(data, null, 4)}\n    </script>`;
}

function getCategorySlug(categoryLabel) {
    const normalized = normalizeText(categoryLabel).toLowerCase();
    return normalized === 'battle royale' ? 'battle-royale' : normalized.replace(/\s+/g, '-');
}

function makeShortDescription(game) {
    const description = normalizeText(game.description);
    if (!description) {
        return `Play ${game.name} instantly in your browser on veck io.`;
    }
    const firstSentence = description.match(/.*?[.!?](\s|$)/);
    const summary = firstSentence ? firstSentence[0].trim() : description;
    return summary.length > 160 ? `${summary.slice(0, 157)}...` : summary;
}

function buildGameKeywordContent(game) {
    const parts = [
        'veck io',
        game.name,
        normalizeText(game.keywords || ''),
        game.gameType,
        'browser game',
        'online game'
    ];

    return normalizeText(parts.filter(Boolean).join(', '));
}

function buildCombatProfile(game, categoryLabel) {
    const category = normalizeText(categoryLabel).toLowerCase();
    const text = normalizeText(game.description).toLowerCase();
    const tags = Array.isArray(game.tags) ? game.tags : [];

    let gameType = 'Shooter / Browser Combat';
    let controls = 'Mouse + Keyboard';
    let mode = 'Instant Browser Match';
    let style = 'Competitive / Tactical';
    let bestFor = 'Players who enjoy pressure, quick reactions, and direct combat.';

    if (category.includes('battle royale')) {
        gameType = 'Survival / Shooter / Battle Royale';
        mode = 'Last-player-standing loops';
        style = 'Tactical / Survival / High Pressure';
        bestFor = 'Players who want map pressure, survival pacing, and elimination tension.';
    } else if (category.includes('sniper')) {
        gameType = 'Sniper / Precision / FPS';
        style = 'Controlled / Tactical / Long-range';
        bestFor = 'Players who prefer clean shots, patience, and positioning over chaos.';
    } else if (category.includes('multiplayer')) {
        gameType = 'Multiplayer / Arena / Competitive';
        mode = 'Online repeat rounds';
        style = 'Competitive / Reactive / Social';
        bestFor = 'Players who enjoy repeatable sessions and active online pressure.';
    } else if (category.includes('action')) {
        gameType = 'Action / Arcade / Combat';
        controls = text.includes('puzzle') ? 'Mouse / Touch' : 'Mouse + Keyboard';
        style = 'Fast / Aggressive / Pick-up-and-play';
        bestFor = 'Players who want direct energy, shorter sessions, and easy entry.';
    } else if (category.includes('fps')) {
        gameType = 'FPS / Shooting / Combat';
        mode = 'Browser firefight';
        style = 'Fast / Tactical / Competitive';
        bestFor = 'Players who want sharp aiming, movement pressure, and instant gunplay.';
    }

    if (text.includes('multiplayer') || tags.some((tag) => String(tag).toLowerCase().includes('multiplayer'))) {
        mode = 'Online / Multiplayer';
    }

    return {
        gameType,
        platform: 'Browser',
        controls,
        mode,
        style,
        bestFor
    };
}

function buildHighlights(game, categoryLabel) {
    const profile = buildCombatProfile(game, categoryLabel);
    return [
        profile.gameType,
        profile.style,
        profile.mode
    ];
}

function buildTacticalNotes(game, categoryLabel) {
    const category = normalizeText(categoryLabel).toLowerCase();
    const description = normalizeText(game.description);
    const base = [
        'Use fullscreen if you want the cleanest possible battlefield view.',
        'The match loads through an external provider, so startup speed may vary by region and device.'
    ];

    if (category.includes('sniper')) {
        base.push('Slow down on the first round and learn your sightlines before forcing aggressive shots.');
    } else if (category.includes('battle royale')) {
        base.push('Stay mobile early and treat the first minutes as a positioning phase, not a panic sprint.');
    } else if (category.includes('multiplayer')) {
        base.push('If lobby timing feels slow, reload once and check another related match while the provider catches up.');
    } else if (category.includes('action') && description.toLowerCase().includes('puzzle')) {
        base.push('Scan the rules first and use the lower-pressure loop as a cooldown between heavier shooter sessions.');
    } else {
        base.push('Warm up with one round before deciding whether to stay on this page or hop to another shooter.');
    }

    return base;
}

function buildOverviewText(game, categoryLabel) {
    const description = normalizeText(game.description || '');
    if (description) {
        return description;
    }
    return `${game.name} is part of the veck io ${categoryLabel} collection and opens directly in your browser with no install step.`;
}

function buildGameIntel(game, categoryLabel) {
    const profile = buildCombatProfile(game, categoryLabel);
    const rating = Number(game.rating || 0);
    const ratingLabel = Number.isFinite(rating) && rating > 0 ? `${rating.toFixed(1)} / 5` : 'Live';
    return {
        profile,
        ratingLabel,
        updated: 'May 16, 2026',
        overview: buildOverviewText(game, categoryLabel),
        highlights: buildHighlights(game, categoryLabel),
        tacticalNotes: buildTacticalNotes(game, categoryLabel)
    };
}

function getRelatedGames(currentGame, allGames, limit = 6) {
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
                    <h3>veck io</h3>
                    <p>A browser shooter hub built around quick deployment, competitive pressure, and cleaner tactical browsing.</p>
                </div>
                <div class="footer-section">
                    <h3>Combat Routes</h3>
                    <ul>
                        <li><a href="${buildCategoryHref('fps', relativePrefix)}">Shooter Games</a></li>
                        <li><a href="${buildCategoryHref('multiplayer', relativePrefix)}">Popular</a></li>
                        <li><a href="${buildCategoryHref('battle-royale', relativePrefix)}">Survival</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h3>Support</h3>
                    <ul>
                        <li><a href="${toRelativeRoute('about.html', relativePrefix)}">About</a></li>
                        <li><a href="${toRelativeRoute('contact.html', relativePrefix)}">Contact</a></li>
                        <li><a href="${toRelativeRoute('privacy.html', relativePrefix)}">Privacy Policy</a></li>
                        <li><a href="${toRelativeRoute('terms.html', relativePrefix)}">Terms of Service</a></li>
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
    const keywordContent = buildGameKeywordContent(game);
    const shortDescription = makeShortDescription(game);
    const intel = buildGameIntel(game, categoryLabel);
    const relatedGames = getRelatedGames(game, allGames);
    const tags = (Array.isArray(game.tags) ? game.tags : []).slice(0, 6);
    const categorySlug = getCategorySlug(categoryLabel);

    const breadcrumbData = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: `${SITE_URL}/`
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: categoryLabel,
                item: `${SITE_URL}/categories?category=${encodeURIComponent(categorySlug)}`
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: game.name,
                item: pageUrl
            }
        ]
    };

    const gameData = {
        '@context': 'https://schema.org',
        '@type': 'VideoGame',
        name: game.name,
        url: pageUrl,
        image: `${SITE_URL}/${imageUrl.replace(/^\.\.\//, '')}`,
        genre: categoryLabel,
        description: `${shortDescription} Play on veck io.`,
        publisher: {
            '@type': 'Organization',
            name: 'veck io',
            url: `${SITE_URL}/`
        }
    };

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
    <title>${escapeHtml(game.name)} | Play on veck io</title>
    <meta name="description" content="Play ${escapeHtml(game.name)} on veck io. ${escapeHtml(shortDescription)} Browse more ${escapeHtml(categoryLabel)} games without leaving the veck io collection.">
    <meta name="keywords" content="${escapeHtml(keywordContent)}">
    <meta name="robots" content="index, follow">
    <meta name="author" content="veck io">
    <meta name="google-adsense-account" content="ca-pub-7534347140708021">
    <meta name="theme-color" content="#05080d">
    <link rel="canonical" href="${pageUrl}">
    <meta property="og:title" content="${escapeHtml(game.name)} | Play on veck io">
    <meta property="og:description" content="Play ${escapeHtml(game.name)} on veck io. ${escapeHtml(shortDescription)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:site_name" content="veck io">
    <meta property="og:image" content="${SITE_URL}/${imageUrl.replace(/^\.\.\//, '')}">
    <meta property="og:image:alt" content="${escapeHtml(game.name)} on veck io">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(game.name)} | Play on veck io">
    <meta name="twitter:description" content="Play ${escapeHtml(game.name)} on veck io. ${escapeHtml(shortDescription)}">
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../css/css.css">
    ${buildStructuredDataScript(gameData)}
    ${buildStructuredDataScript(breadcrumbData)}
</head>
<body class="detail-page">
    <div class="particles" id="particles"></div>
    <div class="cursor-glow" id="cursorGlow"></div>
    <div class="site-shell">
        <header class="topbar header">
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
            <nav class="nav-categories topbar-nav" aria-label="Primary">
                <a href="${buildCategoryHref('action', relativePrefix)}" class="nav-item${categorySlug === 'action' ? ' active' : ''}">Action</a>
                <a href="${buildCategoryHref('fps', relativePrefix)}" class="nav-item${categorySlug === 'fps' ? ' active' : ''}">FPS</a>
                <a href="${buildCategoryHref('battle-royale', relativePrefix)}" class="nav-item${categorySlug === 'battle-royale' ? ' active' : ''}">Battle Royale</a>
                <a href="${buildCategoryHref('multiplayer', relativePrefix)}" class="nav-item${categorySlug === 'multiplayer' ? ' active' : ''}">Multiplayer</a>
                <a href="${buildCategoryHref('sniper', relativePrefix)}" class="nav-item${categorySlug === 'sniper' ? ' active' : ''}">Sniper</a>
            </nav>
            <div class="topbar-actions">
                <div class="search-bar topbar-search">
                    <label class="visually-hidden" for="site-search">Search games</label>
                    <input id="site-search" type="text" placeholder="Search" data-site-search data-search-base="../">
                    <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
                </div>
            </div>
        </header>

        <main class="page-container combat-home">
            <section class="hero-info reveal-block">
                <div class="hero-copy compact">
                    <span class="eyebrow">
                        <i class="fas fa-crosshairs" aria-hidden="true"></i>
                        ${escapeHtml(categoryLabel)} Deployment
                    </span>
                    <h1 class="page-title">${escapeHtml(game.name)}</h1>
                    <p class="page-subtitle">Play ${escapeHtml(game.name)} on veck io. ${escapeHtml(shortDescription)}</p>
                    <div class="hero-actions">
                        <a class="hero-btn hero-btn-primary" href="#frame-stage">Play Instantly</a>
                        <a class="hero-btn hero-btn-secondary" href="${buildCategoryHref(categorySlug, relativePrefix)}">More ${escapeHtml(categoryLabel)}</a>
                    </div>
                </div>
                <aside class="hero-side-panel reveal-block">
                    <div class="status-card">
                        <div class="status-row">
                            <span class="status-label">Game Type</span>
                            <strong>${escapeHtml(intel.profile.gameType)}</strong>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Platform</span>
                            <strong>${escapeHtml(intel.profile.platform)}</strong>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Controls</span>
                            <strong>${escapeHtml(intel.profile.controls)}</strong>
                        </div>
                        <div class="status-row">
                            <span class="status-label">Mode</span>
                            <strong>${escapeHtml(intel.profile.mode)}</strong>
                        </div>
                    </div>
                </aside>
            </section>

            <section class="game-frame-section reveal-block">
                <div class="section-heading">
                    <div>
                        <span class="section-kicker">Live Combat Feed</span>
                        <h2 class="section-title">Launch ${escapeHtml(game.name)}</h2>
                        <p class="section-lead">Open the match immediately, then scan the tactical panel if you want extra context.</p>
                    </div>
                </div>

                <div class="frame-stage is-loading" id="frame-stage">
                    <div class="frame-loading" id="frame-loading">
                        <div class="radar-loader">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <p>Loading Battlefield...</p>
                        <div class="scan-bar"></div>
                    </div>
                    <iframe id="game-iframe" src="${escapeHtml(game.iframeUrl || '')}" title="Play ${escapeHtml(game.name)}" allowfullscreen loading="eager"></iframe>
                    <div class="frame-corner-actions">
                        <button class="action-btn frame-floating-btn" id="fullscreen-btn" type="button" title="Fullscreen">
                            <i class="fas fa-expand" aria-hidden="true"></i>
                            <span>Fullscreen</span>
                        </button>
                    </div>
                </div>

                <div class="frame-console">
                    <div class="frame-console-main">
                        <div class="game-title-section">
                            <img src="${escapeHtml(imageUrl)}" id="game-icon" class="game-icon" alt="${escapeHtml(game.name)}">
                            <div>
                                <span class="game-title">${escapeHtml(game.name)}</span>
                                <span class="game-subtitle">${escapeHtml(categoryLabel)} mission page</span>
                            </div>
                        </div>
                        <div class="console-actions">
                            <button class="action-btn" id="refresh-btn" type="button" title="Reload game">
                                <i class="fas fa-rotate-right" aria-hidden="true"></i>
                            </button>
                            <a class="action-link" href="${buildCategoryHref(categorySlug, relativePrefix)}">Back to ${escapeHtml(categoryLabel)}</a>
                        </div>
                    </div>
                    <div class="frame-meta-grid">
                        <div class="meta-chip"><span>Style</span><strong>${escapeHtml(intel.profile.style)}</strong></div>
                        <div class="meta-chip"><span>Best For</span><strong>${escapeHtml(intel.profile.bestFor)}</strong></div>
                        <div class="meta-chip"><span>Rating</span><strong>${escapeHtml(intel.ratingLabel)}</strong></div>
                        <div class="meta-chip"><span>Updated</span><strong>${escapeHtml(intel.updated)}</strong></div>
                    </div>
                </div>
            </section>

            <section class="game-meta reveal-block">
                <div class="meta-story">
                    <span class="section-kicker">Combat Briefing</span>
                    <h2 class="section-title">About ${escapeHtml(game.name)}</h2>
                    <p>${escapeHtml(intel.overview)}</p>
                    <div class="tags">
                        <span class="tag"><i class="fas fa-folder-open" aria-hidden="true"></i> ${escapeHtml(categoryLabel)}</span>
                        ${tags.map((tag) => `<span class="tag"><i class="fas fa-tag" aria-hidden="true"></i> ${escapeHtml(tag)}</span>`).join('')}
                    </div>
                </div>
                <div class="intel-grid">
                    ${intel.highlights.map((item) => `
                    <article class="intel-card">
                        <span class="intel-label">Highlight</span>
                        <strong>${escapeHtml(item)}</strong>
                    </article>`).join('')}
                    <article class="intel-card">
                        <span class="intel-label">Access</span>
                        <strong>Instant browser play</strong>
                    </article>
                </div>
            </section>

            <section class="page-section reveal-block">
                <div class="section-heading">
                    <div>
                        <span class="section-kicker">Tactical Notes</span>
                        <h2 class="section-title">Before you commit to the match</h2>
                    </div>
                </div>
                <div class="detail-grid">
                    ${intel.tacticalNotes.map((item) => `
                    <article class="detail-card">
                        <h3>Operator Note</h3>
                        <p>${escapeHtml(item)}</p>
                    </article>`).join('')}
                </div>
            </section>

            <section class="related-games reveal-block">
                <div class="section-heading">
                    <div>
                        <span class="section-kicker">Related Targets</span>
                        <h2 class="section-title">More from ${escapeHtml(categoryLabel)}</h2>
                        <p class="section-lead">Stay inside the same category if you want to compare another battlefield right away.</p>
                    </div>
                </div>
                <div class="games-grid">
                    ${relatedGames.map((relatedGame) => `
                    <a class="game-card game-card-link" href="${toRelativeRoute(relatedGame.link, relativePrefix)}">
                        <div class="game-card-cover">
                            <img src="${escapeHtml((relatedGame.imageUrl || 'img/icon/veckIo.jpg').replace(/^img\//, '../img/'))}" alt="${escapeHtml(relatedGame.name)}" loading="lazy">
                        </div>
                        <div class="game-card-body">
                            <span class="game-card-category">${escapeHtml(relatedGame.gameType || 'Game')}</span>
                            <h3 class="game-card-title">${escapeHtml(relatedGame.name)}</h3>
                        </div>
                    </a>`).join('')}
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

            initCombatFrame({
                iframeId: 'game-iframe',
                stageId: 'frame-stage',
                loadingId: 'frame-loading',
                fallbackDelay: 1200
            });

            fullscreenButton.addEventListener('click', function () {
                if (iframe.requestFullscreen) {
                    iframe.requestFullscreen();
                }
            });

            refreshButton.addEventListener('click', function () {
                const stage = document.getElementById('frame-stage');
                const loading = document.getElementById('frame-loading');
                if (stage) {
                    stage.classList.remove('is-live');
                    stage.classList.add('is-loading');
                }
                if (loading) {
                    loading.removeAttribute('hidden');
                }
                iframe.src = iframe.src;
                initCombatFrame({
                    iframeId: 'game-iframe',
                    stageId: 'frame-stage',
                    loadingId: 'frame-loading',
                    fallbackDelay: 1200
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
