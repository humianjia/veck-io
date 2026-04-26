const fs = require('fs');
const path = require('path');

function updateBrandingCase(filePath) {
    if (!filePath.endsWith('.html')) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    // 查找包含branding=veck.io的iframe标签
    const oldPattern = /branding=veck\.io/g;
    if (oldPattern.test(content)) {
        content = content.replace(oldPattern, 'branding=Veck.io');
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Updated branding case in:', filePath);
    }
}

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // 跳过js, css, img等目录
            if (['js', 'css', 'img'].includes(file)) continue;
            scanDirectory(fullPath);
        } else if (stat.isFile() && file.endsWith('.html') && file !== 'index.html' && file !== 'categories.html') {
            updateBrandingCase(fullPath);
        }
    }
}

const rootDir = __dirname;
scanDirectory(rootDir);

console.log('\nBranding case updated in all game iframes!');