const fs = require('fs');
const path = require('path');

function addBrandingToIframe(filePath) {
    if (!filePath.endsWith('.html')) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    // 查找iframe标签
    const iframePattern = /<iframe[^>]+src="([^"]+)"[^>]*>/;
    const match = content.match(iframePattern);

    if (match) {
        const oldSrc = match[1];
        let newSrc = oldSrc;

        // 检查是否已经包含品牌参数
        if (!oldSrc.includes('branding') && !oldSrc.includes('logo')) {
            // 在URL末尾添加品牌参数
            if (oldSrc.includes('?')) {
                newSrc = oldSrc + '&branding=Veck.io&logo=https://veckio.space/favicon.ico';
            } else {
                newSrc = oldSrc + '?branding=Veck.io&logo=https://veckio.space/favicon.ico';
            }

            content = content.replace(iframePattern, `<iframe id="game-iframe" src="${newSrc}" allowfullscreen></iframe>`);
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log('Updated iframe in:', filePath);
            console.log('Old src:', oldSrc);
            console.log('New src:', newSrc);
            console.log('---');
        }
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
            addBrandingToIframe(fullPath);
        }
    }
}

const rootDir = __dirname;
scanDirectory(rootDir);

console.log('\nBranding added to all game iframes!');