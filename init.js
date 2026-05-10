function getAllSiteGames() {
    return [
        ...(window.gamesData || []),
        ...(window.actionGames || []),
        ...(window.battleRoyaleData || []),
        ...(window.fpsData || []),
        ...(window.multiplayerGames || []),
        ...(window.sniperData || [])
    ];
}

const approvalReadyLinks = new Set([
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

function getApprovalReadyGames() {
    return getAllSiteGames().filter((game) => approvalReadyLinks.has(game.link));
}

function sanitizeDisplayText(value) {
    return String(value || '')
        .replace(/\bterrorist\b/gi, 'enemy')
        .replace(/\bassassination\b/gi, 'mission objective')
        .replace(/\bcriminal underworld\b/gi, 'crime-fiction setting')
        .replace(/\bgang-themed\b/gi, 'urban-themed')
        .replace(/\bgangs?\b/gi, 'factions')
        .replace(/\bmafia\b/gi, 'crime-fiction')
        .replace(/\bweapons\b/gi, 'loadout options')
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

function getCategoryCounts() {
    const approvalReadyGames = getApprovalReadyGames();
    return {
        fps: approvalReadyGames.filter((game) => game.gameType === 'FPS').length,
        "battle-royale": approvalReadyGames.filter((game) => game.gameType === 'Battle Royale').length,
        sniper: approvalReadyGames.filter((game) => game.gameType === 'Sniper').length,
        multiplayer: approvalReadyGames.filter((game) => game.gameType === 'Multiplayer').length,
        action: approvalReadyGames.filter((game) => game.gameType === 'Action').length,
        all: approvalReadyGames.length
    };
}

function createGameCard(game, options = {}) {
    const card = document.createElement("article");
    card.className = options.className || "game-card";
    card.tabIndex = 0;

    const imageUrl = options.imageUrlTransform ? options.imageUrlTransform(game.imageUrl) : game.imageUrl;
    const description = sanitizeDisplayText(
        game.shortDescription || game.description || "Open this game page for a short overview, tips, and browser-play details."
    );
    const category = game.gameType || "Game";

    card.innerHTML = `
        <div class="game-card-image">
            <img src="${imageUrl}" alt="${game.name}" loading="lazy">
        </div>
        <div class="game-card-info">
            <div class="game-card-category">${category}</div>
            <h3 class="game-card-title">${game.name}</h3>
            <p class="game-card-desc">${description}</p>
        </div>
    `;

    const openGame = () => {
        if (game.link) {
            window.location.href = toCleanPath(options.prefixLink ? options.prefixLink + game.link : game.link);
        }
    };

    card.addEventListener("click", openGame);
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openGame();
        }
    });

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

function initSiteSearch() {
    const searchInputs = document.querySelectorAll("[data-site-search]");
    if (!searchInputs.length) {
        return;
    }

    const allGames = getApprovalReadyGames();
    searchInputs.forEach((input) => {
        input.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") {
                return;
            }

            const query = input.value.trim().toLowerCase();
            if (!query) {
                window.location.href = toCleanPath(`${input.dataset.searchBase || ""}categories.html?category=all`);
                return;
            }

            const match = allGames.find((game) => {
                const haystack = [
                    game.name,
                    game.description,
                    ...(game.tags || [])
                ].join(" ").toLowerCase();
                return haystack.includes(query);
            });

            if (match && match.link) {
                window.location.href = toCleanPath(`${input.dataset.searchBase || ""}${match.link}`);
                return;
            }

            window.location.href = toCleanPath(`${input.dataset.searchBase || ""}categories.html?category=all&search=${encodeURIComponent(query)}`);
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
            veck io may use analytics, ads, cookies, and third-party game embeds to run the site.
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
    const container = document.getElementById("particles");
    if (!container || container.childElementCount > 0) {
        return;
    }

    for (let i = 0; i < 26; i += 1) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 16}s`;
        particle.style.animationDuration = `${14 + Math.random() * 8}s`;
        particle.style.width = `${3 + Math.random() * 4}px`;
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

function initCursorGlow() {
    const glow = document.getElementById("cursorGlow");
    if (!glow) {
        return;
    }

    document.addEventListener("mousemove", (event) => {
        glow.style.left = `${event.clientX}px`;
        glow.style.top = `${event.clientY}px`;
    });

    document.addEventListener("mouseleave", () => {
        glow.style.opacity = "0";
    });

    document.addEventListener("mouseenter", () => {
        glow.style.opacity = "1";
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initParticles();
    initCursorGlow();
    initSiteSearch();
    initCookieNotice();
});
