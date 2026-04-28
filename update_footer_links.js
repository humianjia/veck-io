const fs = require('fs');
const path = require('path');

function updateFooterLinks(filePath) {
    if (!filePath.endsWith('.html')) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    // 更新隐私政策和服务条款链接
    const oldFooter = `<a href="../#">Privacy Policy</a>
            <a href="../#">Terms of Service</a>`;
    const newFooter = `<a href="../privacy.html">Privacy Policy</a>
            <a href="../terms.html">Terms of Service</a>`;

    if (content.includes(oldFooter)) {
        content = content.replace(oldFooter, newFooter);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Updated footer in:', filePath);
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
        } else if (stat.isFile() && file.endsWith('.html') && file !== 'index.html' && file !== 'categories.html' && file !== 'privacy.html' && file !== 'terms.html') {
            updateFooterLinks(fullPath);
        }
    }
}

const rootDir = __dirname;
scanDirectory(rootDir);

console.log('\nFooter links updated in all secondary pages!');