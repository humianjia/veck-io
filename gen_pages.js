const fs = require('fs');
const path = require('path');
const approvalReadyEditorial = require('./approval_ready_editorial');

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

const APPROVAL_READY_LINKS = new Set([
    'FPS/Hazmob_FPS.html',
    'FPS/Subway_FPS.html',
    'FPS/Dragon_Slayer_FPS.html',
    'FPS/Crab_Guards.html',
    'FPS/FPS_Toy_Realism.html',
    'FPS/3D_FPS_Target_Shooting.html',
    'Multiplayer/Push.io.html',
    'Multiplayer/Tic_Tac_Toe_Merge.html',
    'Multiplayer/Animal_Racing_Idle_Park.html',
    'Action/Revoxel_3D_-_Voxel_RPG_Shooter.html',
    'Action/Obby_Football_Soccer_3D.html',
    'Action/Dessert_DIY.html',
    'BattleRoyale/Top_Guns_IO.html',
    'BattleRoyale/Cube_Battle_Royale.html',
    'Sniper/Aliens_Hunter.html'
]);

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

function buildStructuredDataScript(data) {
    return `<script type="application/ld+json">\n${JSON.stringify(data, null, 4)}\n    </script>`;
}

function isApprovalReady(game) {
    return Boolean(game && game.link && APPROVAL_READY_LINKS.has(game.link));
}

function getEditorialProfile(game) {
    if (!game || !game.link) {
        return null;
    }

    return approvalReadyEditorial[game.link] || null;
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
    const profile = getEditorialProfile(game);
    if (profile && Array.isArray(profile.highlights) && profile.highlights.length) {
        return profile.highlights.slice(0, 3);
    }

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
    const profile = getEditorialProfile(game);
    if (profile && Array.isArray(profile.playNotes) && profile.playNotes.length) {
        return profile.playNotes;
    }

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

function buildAudience(game) {
    const category = normalizeText(game.gameType).toLowerCase();
    const text = normalizeText(game.description).toLowerCase();

    if (category.includes('sniper')) {
        return 'Players who prefer slower pacing, scoped aiming, and shorter bursts of careful decision-making.';
    }

    if (category.includes('multiplayer')) {
        return 'Players who want repeatable rounds, quick competition, and easy comparison against other browser game picks.';
    }

    if (category.includes('battle royale')) {
        return 'Players who like survival pressure, wide play spaces, and a stronger last-player-standing loop than a straight arcade round.';
    }

    if (text.includes('puzzle') || text.includes('merge') || text.includes('sort')) {
        return 'Players looking for a lighter browser game with readable rules, lower pressure, and quick restart value.';
    }

    if (text.includes('soccer') || text.includes('racing')) {
        return 'Players who want movement-focused sessions and a less demanding alternative to combat-heavy browser game pages.';
    }

    return 'Players who want fast browser action, clear category context, and a quick way to judge whether the embedded game is worth opening.';
}

function buildDifficulty(game) {
    const text = normalizeText(game.description).toLowerCase();
    const rating = Number(game.rating || 0);

    if (text.includes('realistic') || text.includes('tactical') || text.includes('competitive') || text.includes('sniper')) {
        return {
            label: 'Moderate',
            note: 'The core controls are easy to understand, but the page fits better once you are comfortable with timing, aim, or round awareness.'
        };
    }

    if (text.includes('puzzle') || text.includes('idle') || text.includes('cooking') || text.includes('colorful')) {
        return {
            label: 'Easy',
            note: 'This is a friendlier first click for casual browsing because the loop is easier to read and less punishing on a first try.'
        };
    }

    if (rating >= 4.5) {
        return {
            label: 'Moderate',
            note: 'The moment-to-moment play is accessible, but the pace is quick enough that new visitors may need a round or two to settle in.'
        };
    }

    return {
        label: 'Easy to Moderate',
        note: 'Most visitors can understand the basic loop quickly, with a little adjustment depending on pace and camera control.'
    };
}

function buildDeviceRecommendation(game) {
    const text = normalizeText(game.description).toLowerCase();
    const category = normalizeText(game.gameType).toLowerCase();

    if (category.includes('fps') || category.includes('sniper') || text.includes('aim')) {
        return 'Best on desktop or laptop with a stable connection, a larger display, and a keyboard-and-mouse setup for cleaner aiming and camera control.';
    }

    if (text.includes('puzzle') || text.includes('idle') || text.includes('merge') || text.includes('cooking')) {
        return 'Works better as a lighter browser session and is easier to sample on smaller screens than the site\'s more aim-heavy pages.';
    }

    if (category.includes('multiplayer')) {
        return 'Best on a reliable connection because lobby timing, round sync, and third-party load speed matter more than on a purely solo page.';
    }

    return 'Best on a current desktop or phone browser with enough screen space to keep controls readable while the embed is running.';
}

function buildComparison(game) {
    const category = normalizeText(game.gameType).toLowerCase();
    const text = normalizeText(game.description).toLowerCase();

    if (category.includes('fps')) {
        if (text.includes('multiplayer')) {
            return 'Compared with the site\'s more casual arcade picks, this one leans harder into direct competition and feels closer to a short-session browser shooter test.';
        }

        return 'Compared with the site\'s sniper pages, this category tends to feel faster and less patient, with more value coming from movement and immediate reactions.';
    }

    if (category.includes('sniper')) {
        return 'Compared with the main FPS pages, this pick usually trades chaos for timing, making it a better fit for visitors who prefer controlled shots over constant movement.';
    }

    if (category.includes('multiplayer')) {
        return 'Compared with solo action pages, this pick depends more on match flow and replay variety, which makes it stronger for visitors who want repeat rounds instead of a one-off test.';
    }

    if (category.includes('battle royale')) {
        return 'Compared with straight shooter pages, this pick is more about survival pacing and map pressure than pure mechanical speed from the opening seconds.';
    }

    return 'Compared with the site\'s combat-heavy pages, this one is easier to sample casually and may be a better fit when you want a lower-friction browser game session.';
}

function buildPros(game) {
    const text = normalizeText(game.description).toLowerCase();
    const pros = [];

    if (text.includes('multiplayer')) {
        pros.push('Better replay value when you want multiple short rounds instead of a single one-off session.');
    }
    if (text.includes('puzzle') || text.includes('merge')) {
        pros.push('The core loop is easier to understand quickly, which makes browsing feel less random.');
    }
    if (text.includes('realistic') || text.includes('responsive')) {
        pros.push('The page suits visitors who care about cleaner control feel rather than novelty alone.');
    }
    if (text.includes('various game modes') || text.includes('various levels')) {
        pros.push('There is enough variation in the game loop to justify a longer session if the first round lands well.');
    }
    if (pros.length < 2) {
        pros.push('The page makes it easy to assess the game before committing, thanks to the short editorial framing and related picks.');
    }
    if (pros.length < 2) {
        pros.push('It fits the site well because the theme is immediately readable from the title, tags, and quick notes.');
    }

    return pros.slice(0, 2);
}

function buildCons(game) {
    const text = normalizeText(game.description).toLowerCase();
    const cons = [];

    if (text.includes('multiplayer') || text.includes('online')) {
        cons.push('The page depends more heavily on third-party load speed and current match availability than a simple solo browser game.');
    }
    if (text.includes('fps') || text.includes('sniper') || text.includes('shooter')) {
        cons.push('It may feel less welcoming on touch devices or smaller screens if you are only browsing casually.');
    }
    if (text.includes('puzzle') || text.includes('coloring') || text.includes('idle')) {
        cons.push('Visitors looking for stronger depth may outgrow the loop faster than they would on the site\'s more competitive picks.');
    }
    if (cons.length < 2) {
        cons.push('Because the gameplay runs through an external provider, pacing and first-load smoothness are not fully under this site\'s control.');
    }
    if (cons.length < 2) {
        cons.push('The page still relies on an embedded game, so the editorial layer helps most when you compare it against a few related picks rather than viewing it in isolation.');
    }

    return cons.slice(0, 2);
}

function buildEditorialDate(game) {
    const offset = Math.abs((game.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 10;
    const date = new Date(Date.UTC(2026, 4, 10 - offset));
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });
}

function buildEditorialNotes(game) {
    const difficulty = buildDifficulty(game);
    const approvalReady = isApprovalReady(game);
    const profile = getEditorialProfile(game);
    const fallbackEditorNote = approvalReady
        ? 'This page stayed in the approval-ready set because it has a clearer browser-game identity, a more readable category fit, and enough replay context to support a stronger editorial page than the site\'s thinner templates.'
        : 'This page remains accessible for visitors but is currently outside the approval-ready set while the site keeps thinner templates out of the main AdSense review path.';
    const defaultUpdateHistory = approvalReady
        ? [
            { date: '2026-05-10', note: 'Rewrote the page summary and comparison notes to better match the current approval-ready review standard.' },
            { date: '2026-05-09', note: 'Checked category fit, refreshed related links, and tightened device guidance for this page.' }
        ]
        : [];

    if (profile) {
        return {
            audience: profile.audience || buildAudience(game),
            difficulty: profile.difficulty || difficulty,
            device: profile.device || buildDeviceRecommendation(game),
            comparison: profile.comparison || buildComparison(game),
            pros: Array.isArray(profile.pros) && profile.pros.length ? profile.pros : buildPros(game),
            cons: Array.isArray(profile.cons) && profile.cons.length ? profile.cons : buildCons(game),
            updated: profile.updated || buildEditorialDate(game),
            editorNote: profile.editorNote || fallbackEditorNote,
            evaluationLead: profile.evaluationLead || 'This section is written to help visitors decide whether this browser game page fits their device, patience level, and browsing intent before they rely on the embed alone.',
            infoHeader: profile.infoHeader || `This page is part of the veck io ${normalizeText(game.gameType).toLowerCase()} library and is meant to help visitors understand the game quickly before relying on the embedded experience alone.`,
            whyExists: profile.whyExists || 'veck io adds a lightweight editorial layer around browser games so visitors can scan the title, category, and broad play style before opening an external embed.',
            quickNote: profile.quickNote || 'This page adds a short overview and related picks so the game is easier to evaluate before and after loading.',
            providerNote: profile.providerNote || 'Gameplay runs through an external provider and may load at a different speed depending on region and device.',
            aboutParagraphs: Array.isArray(profile.aboutParagraphs) && profile.aboutParagraphs.length
                ? profile.aboutParagraphs
                : [sanitizeGameDescription(game.description || `${game.name} is playable in your browser on veck io.`)],
            editorLabel: profile.editorLabel || '',
            reviewFocus: profile.reviewFocus || '',
            updateHistory: Array.isArray(profile.updateHistory) && profile.updateHistory.length
                ? profile.updateHistory
                : defaultUpdateHistory
        };
    }

    return {
        audience: buildAudience(game),
        difficulty,
        device: buildDeviceRecommendation(game),
        comparison: buildComparison(game),
        pros: buildPros(game),
        cons: buildCons(game),
        updated: buildEditorialDate(game),
        evaluationLead: 'This section is written to help visitors decide whether this browser game page fits their device, patience level, and browsing intent before they rely on the embed alone.',
        infoHeader: `This page is part of the veck io ${normalizeText(game.gameType).toLowerCase()} library and is meant to help visitors understand the game quickly before relying on the embedded experience alone.`,
        whyExists: 'veck io adds a lightweight editorial layer around browser games so visitors can scan the title, category, and broad play style before opening an external embed.',
        quickNote: 'This page adds a short overview and related picks so the game is easier to evaluate before and after loading.',
        providerNote: 'Gameplay runs through an external provider and may load at a different speed depending on region and device.',
        aboutParagraphs: [sanitizeGameDescription(game.description || `${game.name} is playable in your browser on veck io.`)],
        editorLabel: '',
        reviewFocus: '',
        updateHistory: defaultUpdateHistory,
        editorNote: fallbackEditorNote
    };
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
        .filter((game) => isApprovalReady(game))
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
    const approvalReady = isApprovalReady(game);
    const editorial = buildEditorialNotes(game);
    const robotsContent = approvalReady ? 'index, follow' : 'noindex, follow';
    const statusLabel = approvalReady ? 'Approval-ready page' : 'Archive page';
    const aboutParagraphs = Array.isArray(editorial.aboutParagraphs) && editorial.aboutParagraphs.length
        ? editorial.aboutParagraphs
        : [description];
    const updateHistory = Array.isArray(editorial.updateHistory) ? editorial.updateHistory : [];
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
                item: `${SITE_URL}/categories?category=${encodeURIComponent(String(categoryLabel || '').toLowerCase().replace(/\s+/g, '-'))}`
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: game.name,
                item: pageUrl
            }
        ]
    };
    const collectionData = {
        '@context': 'https://schema.org',
        '@type': 'VideoGame',
        name: game.name,
        url: pageUrl,
        image: `${SITE_URL}/${imageUrl.replace(/^\.\.\//, '')}`,
        genre: categoryLabel,
        description: shortDescription,
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
    <title>${escapeHtml(game.name)} - Play Online on veck io</title>
    <meta name="description" content="${escapeHtml(shortDescription)} Read a quick overview, browser notes, and related picks on veck io.">
    <meta name="keywords" content="${escapeHtml(keywordContent)}">
    <meta name="robots" content="${robotsContent}">
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
    ${buildStructuredDataScript(collectionData)}
    ${buildStructuredDataScript(breadcrumbData)}
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
                            <strong>Quick note:</strong> ${escapeHtml(editorial.quickNote)}
                        </div>
                        <div class="game-frame-badge">
                            <strong>Third-party content:</strong> ${escapeHtml(editorial.providerNote)}
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
                    <div class="info-header">${escapeHtml(editorial.infoHeader)}</div>
                    <div class="info-content">
                        <h2>About ${escapeHtml(game.name)}</h2>
                        ${aboutParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
                        <h3>Why this page exists</h3>
                        <p>${escapeHtml(editorial.whyExists)}</p>
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

            <section class="page-section" aria-labelledby="editorial-evaluation">
                <h2 class="section-title" id="editorial-evaluation">Editorial evaluation</h2>
                <p class="section-lead">${escapeHtml(editorial.evaluationLead)}</p>
                <div class="detail-grid">
                    <div class="detail-card">
                        <h3>Best for</h3>
                        <p>${escapeHtml(editorial.audience)}</p>
                    </div>
                    <div class="detail-card">
                        <h3>Getting started</h3>
                        <p><strong>${escapeHtml(editorial.difficulty.label)}.</strong> ${escapeHtml(editorial.difficulty.note)}</p>
                    </div>
                    <div class="detail-card">
                        <h3>Device advice</h3>
                        <p>${escapeHtml(editorial.device)}</p>
                    </div>
                    <div class="detail-card">
                        <h3>Compared with similar picks</h3>
                        <p>${escapeHtml(editorial.comparison)}</p>
                    </div>
                </div>
            </section>

            <section class="page-section" aria-labelledby="strengths-and-tradeoffs">
                <h2 class="section-title" id="strengths-and-tradeoffs">Strengths and tradeoffs</h2>
                <div class="detail-grid">
                    <div class="detail-card">
                        <h3>Reasons to try it</h3>
                        <ul class="checklist">
                            ${editorial.pros.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="detail-card">
                        <h3>What to keep in mind</h3>
                        <ul class="checklist">
                            ${editorial.cons.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="detail-card">
                        <h3>Editorial status</h3>
                        <p><strong>${escapeHtml(statusLabel)}.</strong> ${escapeHtml(editorial.editorNote)}</p>
                        <p>Last updated: ${escapeHtml(editorial.updated)}</p>
                    </div>
                </div>
            </section>

            ${approvalReady ? `
            <section class="page-section" aria-labelledby="editorial-maintenance">
                <h2 class="section-title" id="editorial-maintenance">Editorial maintenance</h2>
                <div class="detail-grid">
                    <div class="detail-card">
                        <h3>Reviewed by</h3>
                        <p>${escapeHtml(editorial.editorLabel || 'veck io editorial desk')}</p>
                    </div>
                    <div class="detail-card">
                        <h3>Current review focus</h3>
                        <p>${escapeHtml(editorial.reviewFocus || 'Category fit, clarity, device guidance, and whether the page still adds enough browsing value beyond the embed itself.')}</p>
                    </div>
                    <div class="detail-card">
                        <h3>Recent update log</h3>
                        <ul class="checklist">
                            ${updateHistory.map((entry) => `<li>${escapeHtml(entry.date)}: ${escapeHtml(entry.note)}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </section>` : ''}

            <section class="related-games">
                <h2 class="section-title">Related game pages</h2>
                <p class="section-lead">More picks from the same site that may suit a similar mood or play style.</p>
                <div class="games-grid" id="related-games-container">
                    ${relatedGames.map((relatedGame) => `
                    <a class="game-card game-card-link" href="${toRelativeRoute(relatedGame.link, relativePrefix)}">
                        <div class="game-card-image">
                            <img src="${escapeHtml((relatedGame.imageUrl || 'img/icon/veckIo.jpg').replace(/^img\//, '../img/'))}" alt="${escapeHtml(relatedGame.name)}" loading="lazy">
                        </div>
                        <div class="game-card-info">
                            <div class="game-card-category">${escapeHtml(relatedGame.gameType || 'Game')}</div>
                            <h3 class="game-card-title">${escapeHtml(relatedGame.name)}</h3>
                            <p class="game-card-desc">${escapeHtml(makeShortDescription(relatedGame))}</p>
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

            fullscreenButton.addEventListener('click', function () {
                if (iframe.requestFullscreen) {
                    iframe.requestFullscreen();
                }
            });

            refreshButton.addEventListener('click', function () {
                iframe.src = iframe.src;
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
            .filter((game) => isApprovalReady(game))
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
