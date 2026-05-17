const CATEGORY_DEFINITIONS = [
    {
        key: 'all',
        label: 'All Games',
        icon: 'fa-gamepad',
        accent: 'var(--accent)',
        summary: 'Every playable page currently available on the site.'
    },
    {
        key: 'fps',
        label: 'FPS',
        icon: 'fa-crosshairs',
        accent: 'var(--fps)',
        match: 'FPS',
        summary: 'Fast combat, tight aim, and direct browser gunplay.'
    },
    {
        key: 'battle-royale',
        label: 'Battle Royale',
        icon: 'fa-mountain-sun',
        accent: 'var(--battle-royale)',
        match: 'Battle Royale',
        summary: 'Drop-in survival loops and last-player-standing chaos.'
    },
    {
        key: 'multiplayer',
        label: 'Multiplayer',
        icon: 'fa-users',
        accent: 'var(--multiplayer)',
        match: 'Multiplayer',
        summary: 'Repeatable rounds, shared lobbies, and social pressure.'
    },
    {
        key: 'sniper',
        label: 'Sniper',
        icon: 'fa-bullseye',
        accent: 'var(--sniper)',
        match: 'Sniper',
        summary: 'Precision shots, slower pacing, and cleaner lines of sight.'
    },
    {
        key: 'action',
        label: 'Action',
        icon: 'fa-bolt',
        accent: 'var(--action)',
        match: 'Action',
        summary: 'Arcade energy, obstacle runs, racing, and quick-play variety.'
    }
];

function getAllSiteGames() {
    return [
        ...(window.gamesData || []),
        ...(window.actionGames || []),
        ...(window.battleRoyaleData || []),
        ...(window.fpsData || []),
        ...(window.multiplayerGames || []),
        ...(window.sniperData || [])
    ].filter((game) => game && game.link);
}

function getPlayableGames() {
    return getAllSiteGames().filter((game) => game.link && game.link !== 'index.html');
}

function sanitizeDisplayText(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function toCleanPath(value) {
    const input = String(value || '');
    const match = input.match(/^([^?#]+)(\?[^#]*)?(#.*)?$/);
    if (!match) {
        return input;
    }

    let [, pathPart, query = '', hash = ''] = match;

    if (pathPart === 'index.html') {
        pathPart = '/';
    } else if (pathPart.endsWith('/index.html')) {
        pathPart = pathPart.slice(0, -'index.html'.length);
    } else {
        pathPart = pathPart.replace(/\.html$/, '');
    }

    return `${pathPart}${query}${hash}`;
}

function getRelativePageLink(pageName) {
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    const prefix = depth > 1 ? '../' : '';
    return toCleanPath(`${prefix}${pageName}`);
}

function getCategorySlug(gameType) {
    const normalized = String(gameType || '').trim().toLowerCase();
    if (normalized === 'battle royale') {
        return 'battle-royale';
    }
    return normalized.replace(/\s+/g, '-');
}

function getCategoryMeta(categoryKey) {
    return CATEGORY_DEFINITIONS.find((item) => item.key === categoryKey) || CATEGORY_DEFINITIONS[0];
}

function getCategoryCounts() {
    const playableGames = getPlayableGames();
    return {
        fps: playableGames.filter((game) => game.gameType === 'FPS').length,
        'battle-royale': playableGames.filter((game) => game.gameType === 'Battle Royale').length,
        sniper: playableGames.filter((game) => game.gameType === 'Sniper').length,
        multiplayer: playableGames.filter((game) => game.gameType === 'Multiplayer').length,
        action: playableGames.filter((game) => game.gameType === 'Action').length,
        all: playableGames.length
    };
}

function filterGamesByCategory(games, categoryKey) {
    if (!categoryKey || categoryKey === 'all') {
        return [...games];
    }

    const meta = getCategoryMeta(categoryKey);
    if (!meta.match) {
        return [...games];
    }

    return games.filter((game) => game.gameType === meta.match);
}

function buildSearchableText(game) {
    return [
        game.name,
        game.description,
        game.shortDescription,
        game.gameType,
        ...(game.tags || [])
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

function getGameDescription(game) {
    return sanitizeDisplayText(
        game.shortDescription
        || game.description
        || 'Open this game page and jump straight into browser play.'
    );
}

function createGameCard(game, options = {}) {
    const targetHref = game.link
        ? toCleanPath(options.prefixLink ? options.prefixLink + game.link : game.link)
        : '';
    const category = game.gameType || 'Game';
    const categorySlug = getCategorySlug(category);
    const categoryMeta = getCategoryMeta(categorySlug);
    const card = document.createElement(targetHref ? 'a' : 'article');
    const variantClass = options.variant ? ` game-card-${options.variant}` : '';
    card.className = `${options.className || 'game-card'}${targetHref ? ' game-card-link' : ''}${variantClass}`;
    card.dataset.gameCategory = categorySlug;

    if (targetHref) {
        card.href = targetHref;
        card.setAttribute('aria-label', `${game.name} game page`);
    } else {
        card.tabIndex = 0;
    }

    const imageUrl = options.imageUrlTransform ? options.imageUrlTransform(game.imageUrl) : game.imageUrl;
    const description = getGameDescription(game);
    const showDescription = options.showDescription !== false;
    const ratingValue = Number(game.rating || 0);
    const ratingLabel = Number.isFinite(ratingValue) && ratingValue > 0 ? ratingValue.toFixed(1) : 'Play';
    const cardSummary = options.summary || description;
    const cardTags = (game.tags || []).slice(0, options.tagLimit || 2);
    const spotlightLabel = options.label || categoryMeta.label || category;
    const imageLoading = options.eager ? 'eager' : 'lazy';
    const minimalClass = !showDescription ? ' game-card-minimal' : '';

    card.className += minimalClass;

    card.innerHTML = `
        <div class="game-card-cover">
            <img src="${imageUrl}" alt="${game.name}" loading="${imageLoading}">
            <div class="game-card-overlay">
                <span class="game-card-pill">${spotlightLabel}</span>
                <span class="game-card-score"><i class="fas fa-star" aria-hidden="true"></i> ${ratingLabel}</span>
            </div>
        </div>
        <div class="game-card-body">
            <div class="game-card-topline">
                <span class="game-card-category">${category}</span>
                <span class="game-card-route">${categorySlug}</span>
            </div>
            <h3 class="game-card-title">${game.name}</h3>
            ${showDescription ? `<p class="game-card-desc">${cardSummary}</p>` : ''}
            <div class="game-card-bottom">
                <div class="game-card-tags">
                    ${cardTags.map((tag) => `<span class="game-card-tag">${sanitizeDisplayText(tag)}</span>`).join('')}
                </div>
                <span class="game-card-cta">${options.ctaLabel || 'Open Game'} <i class="fas fa-arrow-right" aria-hidden="true"></i></span>
            </div>
        </div>
    `;

    if (!targetHref) {
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
            }
        });
    }

    return card;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function formatGameCount(value) {
    return `${value} game${value === 1 ? '' : 's'}`;
}

function initSiteSearch() {
    const searchInputs = document.querySelectorAll('[data-site-search]');
    if (!searchInputs.length) {
        return;
    }

    const allGames = getPlayableGames();
    searchInputs.forEach((input) => {
        input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
                return;
            }

            const query = input.value.trim().toLowerCase();
            if (!query) {
                window.location.href = toCleanPath(`${input.dataset.searchBase || ''}categories.html?category=all`);
                return;
            }

            const match = allGames.find((game) => buildSearchableText(game).includes(query));

            if (match && match.link) {
                window.location.href = toCleanPath(`${input.dataset.searchBase || ''}${match.link}`);
                return;
            }

            window.location.href = toCleanPath(`${input.dataset.searchBase || ''}categories.html?category=all&search=${encodeURIComponent(query)}`);
        });
    });
}

function initCookieNotice() {
    const storageKey = 'veckio_cookie_notice_dismissed_v1';
    if (localStorage.getItem(storageKey) === '1') {
        return;
    }

    const banner = document.createElement('div');
    banner.className = 'consent-banner';
    banner.innerHTML = `
        <div class="consent-banner__text">
            veck io may use analytics, cookies, and third-party game embeds to run the site.
            <a href="${getRelativePageLink('privacy.html')}">Learn more</a>.
        </div>
        <button class="consent-banner__button" type="button">OK</button>
    `;

    const button = banner.querySelector('button');
    button.addEventListener('click', () => {
        localStorage.setItem(storageKey, '1');
        banner.remove();
    });

    document.body.appendChild(banner);
}

function initParticles() {
    const container = document.getElementById('particles');
    if (!container || container.childElementCount > 0) {
        return;
    }

    for (let i = 0; i < 26; i += 1) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 16}s`;
        particle.style.animationDuration = `${14 + Math.random() * 8}s`;
        particle.style.width = `${3 + Math.random() * 4}px`;
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

function initCursorGlow() {
    const glow = document.getElementById('cursorGlow');
    if (!glow) {
        return;
    }

    document.addEventListener('mousemove', (event) => {
        glow.style.left = `${event.clientX}px`;
        glow.style.top = `${event.clientY}px`;
    });

    document.addEventListener('mouseleave', () => {
        glow.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
        glow.style.opacity = '1';
    });
}

function initTopbarState() {
    const syncState = () => {
        if (window.scrollY > 12) {
            document.body.classList.add('is-scrolled');
        } else {
            document.body.classList.remove('is-scrolled');
        }
    };

    syncState();
    window.addEventListener('scroll', syncState, { passive: true });
}

function initCombatFrame(options = {}) {
    const iframe = document.getElementById(options.iframeId || 'game-iframe');
    const stage = document.getElementById(options.stageId || 'frame-stage');
    const loading = document.getElementById(options.loadingId || 'frame-loading');

    if (!iframe || !stage) {
        return;
    }

    let resolved = false;
    const markReady = () => {
        if (resolved) {
            return;
        }
        resolved = true;
        stage.classList.remove('is-loading');
        stage.classList.add('is-live');
        if (loading) {
            loading.setAttribute('hidden', 'hidden');
        }
    };

    stage.classList.add('is-loading');
    stage.classList.add('is-live');
    if (loading) {
        loading.removeAttribute('hidden');
    }
    iframe.addEventListener('load', markReady, { once: true });
    window.setTimeout(markReady, options.fallbackDelay || 1200);
}

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCursorGlow();
    initTopbarState();
    initSiteSearch();
    initCookieNotice();
});
