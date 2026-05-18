const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const GD_API = 'https://html5-portal-api.gamedistribution.com/graphql';
const GD_REFERRER = 'https://www.onlinegames.io/cat-runner/';
const TARGET_COUNT = 20;
const OUTPUT_FILE = path.join(ROOT, 'js/game_data/gdExpansion.js');
const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

const DATASETS = [
    {
        key: 'action',
        label: 'Action',
        dir: 'Action',
        queries: ['action', 'arcade', 'adventure', 'runner', 'simulation', 'fight', 'parkour', 'obby', 'casual'],
        keywords: ['action', 'arcade', 'adventure', 'runner', 'fight', 'obby', 'parkour', 'platform', 'rush', 'simulation']
    },
    {
        key: 'battle-royale',
        label: 'Battle Royale',
        dir: 'BattleRoyale',
        queries: ['battle royale', 'royale', 'survival', 'last survivor', 'zombie survival', 'arena survival'],
        keywords: ['battle royale', 'royale', 'survival', 'last', 'zombie', 'arena', 'io', 'hunter']
    },
    {
        key: 'fps',
        label: 'FPS',
        dir: 'FPS',
        queries: ['fps', 'first person shooter', 'gun shooter', 'combat shooter', 'swat shooter', 'tactical shooter', 'zombie shooter', 'war shooter', 'military shooter', 'rifle shooter', 'shooting'],
        keywords: ['fps', 'first person', 'shooter', 'gun', 'combat', 'swat', 'assault', 'war', 'rifle', 'zombie']
    },
    {
        key: 'multiplayer',
        label: 'Multiplayer',
        dir: 'Multiplayer',
        queries: ['multiplayer', 'online', '2 player', 'versus', 'party', 'arena multiplayer', 'team battle'],
        keywords: ['multiplayer', 'online', '2 player', 'versus', 'party', 'arena', 'team', 'duel', 'battle']
    },
    {
        key: 'sniper',
        label: 'Sniper',
        dir: 'Sniper',
        queries: ['sniper', 'sniper shooter', 'target shooting', 'marksman', 'scope', 'hunting sniper'],
        keywords: ['sniper', 'scope', 'target', 'marksman', 'hunting', 'assassin', 'bullet', 'precision']
    }
];

function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function slugify(value) {
    return normalize(value)
        .replace(/['’]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');
}

function safeFileName(title, usedLinks, dir) {
    const base = slugify(title);
    let candidate = `${dir}/${base}.html`;
    let index = 2;

    while (usedLinks.has(candidate.toLowerCase())) {
        candidate = `${dir}/${base}_${index}.html`;
        index += 1;
    }

    usedLinks.add(candidate.toLowerCase());
    return candidate;
}

function parseGameData(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/=\s*(\[[\s\S]*\]);?\s*$/);
    return match ? eval(match[1]) : [];
}

function buildExistingGameIndex() {
    const files = [
        'js/game_data/games.js',
        'js/game_data/action.js',
        'js/game_data/battleRoyale.js',
        'js/game_data/fps.js',
        'js/game_data/multiplayer.js',
        'js/game_data/sniper.js',
        'js/game_data/gdExpansion.js'
    ].filter((file) => fs.existsSync(path.join(ROOT, file)));

    const titles = new Set();
    const ids = new Set();

    for (const file of files) {
        for (const game of parseGameData(path.join(ROOT, file))) {
            titles.add(normalize(game.name).toLowerCase());
            const match = String(game.iframeUrl || '').match(/gamedistribution\.com\/([^/?]+)/i);
            if (match) {
                ids.add(match[1].toLowerCase());
            }
        }
    }

    return { titles, ids };
}

async function gdSearch(search, limit = 50) {
    const query = `query results($search: String, $offset: Int, $limit: Int) { results(search: $search, offset: $offset, limit: $limit) { title id displayLink description } }`;
    const res = await fetch(GD_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables: { search, offset: 0, limit } })
    });
    const json = await res.json();
    return json.data?.results || [];
}

async function fetchPageDetails(displayLink) {
    const res = await fetch(displayLink);
    const html = await res.text();
    const image = html.match(/property=["']og:image["'] content=["']([^"']+)["']/i)?.[1] || '';
    const description =
        html.match(/name=["']description["'] content=["']([^"']+)["']/i)?.[1] ||
        html.match(/property=["']og:description["'] content=["']([^"']+)["']/i)?.[1] ||
        '';

    return {
        imageUrl: image,
        description: normalize(description)
    };
}

function hashToRating(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return (4 + ((hash % 8) / 10)).toFixed(1);
}

function trimDescription(value, max = 150) {
    const text = normalize(value);
    if (text.length <= max) {
        return text;
    }
    return `${text.slice(0, max).replace(/\s+\S*$/, '').trim()}...`;
}

function buildKeywords(title, categoryLabel) {
    return [
        'veck io',
        title,
        categoryLabel,
        'browser game',
        'online game'
    ].join(', ');
}

function toPosixPath(value) {
    return String(value || '').replace(/\\/g, '/');
}

function findChromeBinary() {
    for (const candidate of CHROME_PATHS) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return '';
}

function getGameImageRelativePath(game) {
    const gameLink = toPosixPath(game.link);
    const categoryDir = path.posix.dirname(gameLink);
    const fileName = path.posix.parse(gameLink).name;

    if (!gameLink || !categoryDir || categoryDir === '.' || !fileName) {
        return DEFAULT_IMAGE;
    }

    return `img/icon/${categoryDir}/${fileName}.jpg`;
}

async function downloadImage(url) {
    const chrome = findChromeBinary();
    if (!chrome) {
        throw new Error('Chrome binary not found.');
    }

    const tmpFile = path.join(ROOT, `._gdshot_${Date.now()}_${Math.random().toString(16).slice(2)}.png`);
    const { spawnSync } = require('child_process');
    const result = spawnSync(chrome, [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--window-size=512,512',
        `--screenshot=${tmpFile}`,
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        `--referer=${GD_REFERRER}`,
        url
    ], { encoding: 'utf8' });

    if (result.status !== 0) {
        throw new Error(`Chrome screenshot failed: ${result.stderr || result.stdout || 'unknown error'}`);
    }

    if (!fs.existsSync(tmpFile)) {
        throw new Error('Screenshot output missing.');
    }

    const buffer = fs.readFileSync(tmpFile);
    fs.unlinkSync(tmpFile);
    return buffer;
}

async function mirrorGameImage(game, sourceUrl) {
    const imageUrl = normalize(sourceUrl);
    if (!imageUrl) {
        throw new Error('No image URL available.');
    }

    const relativeTarget = getGameImageRelativePath(game);

    const absoluteTarget = path.join(ROOT, ...relativeTarget.split('/'));
    fs.mkdirSync(path.dirname(absoluteTarget), { recursive: true });

    if (!fs.existsSync(absoluteTarget) || fs.statSync(absoluteTarget).size === 0) {
        const buffer = await downloadImage(imageUrl);
        fs.writeFileSync(absoluteTarget, buffer);
    }

    return relativeTarget;
}

async function attachLocalImages(games) {
    for (const game of games) {
        const gdMatch = String(game.iframeUrl || '').match(/gamedistribution\.com\/([^/?]+)/i);
        const fallbackImageUrl = gdMatch ? `https://img.gamedistribution.com/${gdMatch[1]}-512x512.jpg` : '';
        const sourceUrl = normalize(game.remoteImageUrl || fallbackImageUrl || game.imageUrl);

        try {
            game.imageUrl = await mirrorGameImage(game, sourceUrl);
        } catch (error) {
            console.warn(`Image mirror failed for ${game.name}: ${error.message}`);
            game.imageUrl = sourceUrl;
        }

        delete game.remoteImageUrl;
    }
}

function writeExpansionData(games) {
    fs.writeFileSync(OUTPUT_FILE, `var gdExpansionGames = ${JSON.stringify(games, null, 4)};\n`, 'utf8');
}

function scoreCandidate(item, category) {
    const text = normalize(`${item.title} ${item.description || ''}`).toLowerCase();
    let score = 0;

    for (const keyword of category.keywords) {
        if (text.includes(keyword)) {
            score += keyword.includes(' ') ? 4 : 2;
        }
    }

    if (category.key === 'battle-royale' && !/(royale|survival|arena|zombie|last)/.test(text)) {
        score -= 4;
    }
    if (category.key === 'fps' && !/(fps|shooter|gun|combat|swat|rifle|assault|war|zombie)/.test(text)) {
        score -= 3;
    }
    if (category.key === 'sniper' && !/(sniper|scope|target|marksman|hunting|assassin|precision)/.test(text)) {
        score -= 6;
    }
    if (category.key === 'multiplayer' && !/(multiplayer|online|versus|2 player|team|party|duel|arena)/.test(text)) {
        score -= 5;
    }

    if (normalize(item.description).length > 80) {
        score += 1;
    }

    return score;
}

async function gatherCategory(category, existing) {
    const seen = new Map();

    for (const query of category.queries) {
        const results = await gdSearch(query, 50);
        for (const item of results) {
            if (!item?.title || !item?.id || !item?.displayLink) {
                continue;
            }

            const titleKey = normalize(item.title).toLowerCase();
            const idKey = normalize(item.id).toLowerCase();
            if (existing.titles.has(titleKey) || existing.ids.has(idKey)) {
                continue;
            }

            if (!seen.has(idKey)) {
                seen.set(idKey, item);
            }
        }
    }

    return [...seen.values()]
        .map((item) => ({ ...item, _score: scoreCandidate(item, category) }))
        .sort((a, b) => b._score - a._score || a.title.localeCompare(b.title))
        .slice(0, TARGET_COUNT);
}

async function buildItems(category, existing) {
    const items = [];
    const results = await gatherCategory(category, existing);

    for (const item of results) {
        const details = await fetchPageDetails(item.displayLink);

        items.push({
            id: `${category.key}-${item.id}`,
            name: item.title,
            imageUrl: '',
            remoteImageUrl: details.imageUrl || `https://img.gamedistribution.com/${item.id}-512x512.jpg`,
            gameType: category.label,
            rating: hashToRating(item.id),
            description: trimDescription(details.description || item.description || `Play ${item.title} instantly in your browser on veck io.`),
            keywords: buildKeywords(item.title, category.label),
            link: '',
            tags: [category.key, 'gd expansion', 'browser game'],
            iframeUrl: `${item.displayLink}?gd_sdk_referrer_url=${GD_REFERRER}`
        });
    }

    return items;
}

async function mirrorExistingDataset() {
    if (!fs.existsSync(OUTPUT_FILE)) {
        throw new Error(`Missing expansion dataset: ${OUTPUT_FILE}`);
    }

    const games = parseGameData(OUTPUT_FILE);
    await attachLocalImages(games);
    writeExpansionData(games);
    console.log(`Mirrored ${games.length} existing expansion images into local assets.`);
}

async function main() {
    if (process.argv.includes('--mirror-existing')) {
        await mirrorExistingDataset();
        return;
    }

    const existing = buildExistingGameIndex();
    const output = [];
    const usedLinks = new Set();

    for (const category of DATASETS) {
        const items = await buildItems(category, existing);

        for (const item of items) {
            existing.titles.add(normalize(item.name).toLowerCase());
            const match = String(item.iframeUrl || '').match(/gamedistribution\.com\/([^/?]+)/i);
            if (match) {
                existing.ids.add(match[1].toLowerCase());
            }
            item.link = safeFileName(item.name, usedLinks, category.dir);
        }

        await attachLocalImages(items);

        output.push(...items);
        console.log(`${category.label}: ${items.length}`);
    }

    writeExpansionData(output);
    console.log(`Wrote ${output.length} expansion games to ${OUTPUT_FILE}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
