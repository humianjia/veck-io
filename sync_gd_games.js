const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const REFERRER_URL = 'https://www.onlinegames.io/cat-runner/';
const GD_API = 'https://html5-portal-api.gamedistribution.com/graphql';
const GD_IMAGE_BASE = 'https://img.gamedistribution.com';

const DATASETS = [
  {
    key: 'action',
    label: 'Action',
    dir: 'Action',
    file: path.join(ROOT, 'js/game_data/action.js'),
    queries: ['action', 'arcade', 'obby', 'simulation', 'rush', 'fight', 'adventure'],
    keywords: ['action', 'arcade', 'obby', 'simulation', 'rush', 'fight', 'dynamons', 'maze', 'security', 'obstacle', 'runner']
  },
  {
    key: 'battle-royale',
    label: 'Battle Royale',
    dir: 'BattleRoyale',
    file: path.join(ROOT, 'js/game_data/battleRoyale.js'),
    queries: ['battle royale', 'royale', 'survival', 'io', 'war'],
    keywords: ['battle royale', 'royale', 'survival', 'war', 'io', 'last', 'drop', 'battle', 'zombie', 'gun']
  },
  {
    key: 'fps',
    label: 'FPS',
    dir: 'FPS',
    file: path.join(ROOT, 'js/game_data/fps.js'),
    queries: ['fps', 'shooter', 'gun', 'war', 'combat', 'assault', 'swat'],
    keywords: ['fps', 'shooter', 'gun', 'war', 'combat', 'assault', 'swat', 'sniper', 'strike', 'battle']
  },
  {
    key: 'multiplayer',
    label: 'Multiplayer',
    dir: 'Multiplayer',
    file: path.join(ROOT, 'js/game_data/multiplayer.js'),
    queries: ['multiplayer', 'online', 'io', 'merge', 'squad', 'versus', 'battle'],
    keywords: ['multiplayer', 'online', 'io', 'merge', 'squad', 'battle', 'versus', 'team', 'race', 'arena']
  },
  {
    key: 'sniper',
    label: 'Sniper',
    dir: 'Sniper',
    file: path.join(ROOT, 'js/game_data/sniper.js'),
    queries: ['sniper', 'snipers', 'target', 'precision', 'hunter', 'assault'],
    keywords: ['sniper', 'snipers', 'target', 'precision', 'hunter', 'shot', 'scope', 'criminal', 'mission', 'shooter']
  }
];

function normalize(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return normalize(value)
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function safeFileName(title) {
  return `${slugify(title)}.html`;
}

function parseGameData(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/=\s*(\[[\s\S]*\]);?\s*$/);
  if (!match) {
    return [];
  }
  return eval(match[1]);
}

function extractMeta(text, name) {
  const patterns = [
    new RegExp(`<meta\\s+property=${name}\\s+content=([^>]+)>`, 'i'),
    new RegExp(`<meta\\s+name=${name}\\s+content=([^>]+)>`, 'i')
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/^["']|["']$/g, '').trim();
    }
  }

  return '';
}

function extractJsonLd(text) {
  const match = text.match(/<script type=application\/ld\+json>([\s\S]*?)<\/script>/i);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function gdSearch(search, limit = 15) {
  const query = `query results($search: String, $offset: Int, $limit: Int) { results(search: $search, offset: $offset, limit: $limit) { title id displayLink description } }`;
  const res = await fetch(GD_API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { search, offset: 0, limit }
    })
  });

  const json = await res.json();
  return json.data?.results || [];
}

function scoreCandidate(candidate, keywords) {
  const text = `${candidate.title || ''} ${candidate.description || ''}`.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      score += 3;
    }
  }

  if (candidate.title && candidate.title.toLowerCase().includes('battle royale')) score += 4;
  if (candidate.title && candidate.title.toLowerCase().includes('sniper')) score += 4;
  if (candidate.title && candidate.title.toLowerCase().includes('multiplayer')) score += 3;
  if (candidate.title && candidate.title.toLowerCase().includes('fps')) score += 4;
  if (candidate.title && candidate.title.toLowerCase().includes('action')) score += 2;
  if (candidate.description && candidate.description.length > 60) score += 1;

  return score;
}

function extractKeywords(title) {
  return normalize(title)
    .replace(/['’]/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .map((item) => item.toLowerCase())
    .filter((item) => item && !['the', 'and', 'vs', 'io', 'game', 'games', 'online', 'new'].includes(item))
    .slice(0, 5);
}

function hashToRating(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return (4 + ((hash % 8) / 10)).toFixed(1);
}

async function fetchPageDetails(displayLink) {
  const res = await fetch(displayLink);
  const html = await res.text();
  const ogImage = extractMeta(html, 'og:image');
  const description = extractMeta(html, 'description') || extractMeta(html, 'og:description');
  const jsonLd = extractJsonLd(html);

  return {
    ogImage,
    description: normalize(description || jsonLd?.description || ''),
    genre: Array.isArray(jsonLd?.genre) ? jsonLd.genre : []
  };
}

async function downloadImage(url, destination) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image: ${url}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, buffer);
}

function buildImagePath(category, title, imageUrl) {
  const ext = imageUrl.match(/\.(jpe?g|png|webp)(?:\?|$)/i)?.[0]?.match(/\.(jpe?g|png|webp)/i)?.[0] || '.jpg';
  return path.posix.join('img/icon', category.dir, `${slugify(title)}${ext}`);
}

function buildKeywords(title, categoryLabel, extraKeywords = []) {
  const pieces = [
    'veck io',
    title,
    categoryLabel,
    'browser game',
    'online game',
    ...extraKeywords
  ];
  return pieces.filter(Boolean).join(', ');
}

async function gatherCandidates(category, existingNames) {
  const byId = new Map();
  for (const query of category.queries) {
    const results = await gdSearch(query, 20);
    for (const item of results) {
      if (!item?.title || !item?.id || !item?.displayLink) {
        continue;
      }
      if (existingNames.has(normalize(item.title).toLowerCase())) {
        continue;
      }
      if (!byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }
  }

  const ranked = [...byId.values()]
    .map((item) => ({
      ...item,
      score: scoreCandidate(item, category.keywords)
    }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const selected = [];
  const usedTitles = new Set(existingNames);

  for (const item of ranked) {
    const titleKey = normalize(item.title).toLowerCase();
    if (usedTitles.has(titleKey)) {
      continue;
    }

    selected.push(item);
    usedTitles.add(titleKey);

    if (selected.length >= 10) {
      break;
    }
  }

  if (selected.length < 10) {
    throw new Error(`Only found ${selected.length} items for ${category.label}`);
  }

  return selected;
}

async function buildCategoryItems(category, existingNames) {
  const selected = await gatherCandidates(category, existingNames);
  const items = [];

  for (const item of selected) {
    const details = await fetchPageDetails(item.displayLink);
    const fileName = safeFileName(item.title);
    const localImagePath = buildImagePath(category, item.title, details.ogImage || '');
    const imageSource = details.ogImage || `${GD_IMAGE_BASE}/${item.id}-512x512.jpg`;
    const imageDestination = path.join(ROOT, localImagePath.replace(/\//g, path.sep));

    try {
      await downloadImage(imageSource, imageDestination);
    } catch {
      // Fallback to the site icon if a thumbnail cannot be fetched.
      fs.copyFileSync(path.join(ROOT, 'img/icon/veckIo.jpg'), imageDestination);
    }

    const titleKeywords = extractKeywords(item.title);
    const genreKeywords = details.genre.map((entry) => String(entry).toLowerCase()).slice(0, 4);

    items.push({
      id: `${category.key}-${item.id}`,
      name: item.title,
      imageUrl: localImagePath,
      gameType: category.label,
      rating: hashToRating(item.id),
      description: details.description || item.description || `Play ${item.title} instantly in your browser on veck io.`,
      keywords: buildKeywords(item.title, category.label, [...titleKeywords, ...genreKeywords]),
      link: `${category.dir}/${fileName}`,
      tags: [
        category.key,
        ...titleKeywords.slice(0, 3),
        'browser game'
      ],
      iframeUrl: `${item.displayLink}?gd_sdk_referrer_url=${REFERRER_URL}`
    });
  }

  return items;
}

function writeDataset(filePath, variableName, currentItems, newItems) {
  const combined = [...newItems, ...currentItems];
  const content = `var ${variableName} = ${JSON.stringify(combined, null, 4)}\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  return combined;
}

async function main() {
  const currentData = {};
  const existingNames = new Set();

  for (const category of DATASETS) {
    const fileKey = path.basename(category.file);
    const currentItems = parseGameData(category.file);
    currentData[fileKey] = currentItems;
    currentItems.forEach((item) => existingNames.add(normalize(item.name).toLowerCase()));
  }

  const updated = [];
  for (const category of DATASETS) {
    const variableName = `${category.key === 'battle-royale' ? 'battleRoyaleData' : category.key + (category.key === 'multiplayer' ? 'Games' : category.key === 'fps' ? 'Data' : category.key === 'action' ? 'Games' : 'Data')}`;
    // The variable names are fixed per file below for readability.
    const currentItems = parseGameData(category.file);
    const newItems = await buildCategoryItems(category, existingNames);
    const finalItems = writeDataset(
      category.file,
      category.key === 'battle-royale'
        ? 'battleRoyaleData'
        : category.key === 'action'
          ? 'actionGames'
          : category.key === 'fps'
            ? 'fpsData'
            : category.key === 'multiplayer'
              ? 'multiplayerGames'
              : 'sniperData',
      currentItems,
      newItems
    );

    finalItems.forEach((item) => existingNames.add(normalize(item.name).toLowerCase()));
    updated.push({ category: category.label, count: finalItems.length });
  }

  console.log(JSON.stringify(updated, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
