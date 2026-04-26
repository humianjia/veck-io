const fs = require('fs');
const path = require('path');

function fixLogoStyle(filePath) {
    if (!filePath.endsWith('.html')) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    // 查找并修复logo部分
    const logoPattern = /<div class="logo">[\s\S]*?<a href="\.\.\/index\.html">[\s\S]*?<\/a>[\s\S]*?<\/div>/;
    
    if (logoPattern.test(content)) {
        const newLogo = `<div class="logo">
            <a href="../index.html" style="display: flex; align-items: center; text-decoration: none; color: inherit;">
                <svg class="logo-icon" viewBox="0 0 50 50" width="45" height="45">
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#4ecca3;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#00d4ff;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <circle cx="25" cy="25" r="20" fill="none" stroke="url(#grad1)" stroke-width="3"/>
                    <circle cx="25" cy="25" r="12" fill="none" stroke="url(#grad1)" stroke-width="2"/>
                    <circle cx="25" cy="25" r="4" fill="#4ecca3"/>
                    <line x1="25" y1="0" x2="25" y2="15" stroke="#4ecca3" stroke-width="2"/>
                    <line x1="25" y1="35" x2="25" y2="50" stroke="#4ecca3" stroke-width="2"/>
                    <line x1="0" y1="25" x2="15" y2="25" stroke="#4ecca3" stroke-width="2"/>
                    <line x1="35" y1="25" x2="50" y2="25" stroke="#4ecca3" stroke-width="2"/>
                </svg>
                <span class="logo-text">Veck<span class="logo-io">.io</span></span>
            </a>
        </div>`;
        
        content = content.replace(logoPattern, newLogo);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Fixed:', filePath);
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
        } else if (stat.isFile() && file.endsWith('.html') && file !== 'index.html') {
            fixLogoStyle(fullPath);
        }
    }
}

const rootDir = __dirname;
scanDirectory(rootDir);

console.log('\nLogo style fixed in all secondary pages!');