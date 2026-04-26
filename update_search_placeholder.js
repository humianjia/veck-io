const fs = require('fs');
const path = require('path');

function updateSearchPlaceholder(filePath) {
    if (!filePath.endsWith('.html')) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    if (content.includes('搜索游戏...')) {
        content = content.replace(/搜索游戏\.\.\./g, 'Search games...');
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Updated:', filePath);
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
            updateSearchPlaceholder(fullPath);
        }
    }
}

const rootDir = __dirname;
scanDirectory(rootDir);

console.log('\nSearch placeholder updated in all HTML files!');