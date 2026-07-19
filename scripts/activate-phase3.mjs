import fs from 'node:fs';
const file = new URL('../web/index.html', import.meta.url);
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/<link rel="stylesheet" href="dashboard-reference-v74\.css\?v=74">/g, '');
html = html.replace(/<script src="dashboard-reference-v74\.js\?v=74"><\/script>/g, '');
if (!html.includes('mission-control-v76.css')) html = html.replace('</head>', '<link rel="stylesheet" href="mission-control-v76.css?v=76">\n</head>');
if (!html.includes('mission-control-v76.js')) html = html.replace('</body>', '<script src="mission-control-v76.js?v=76"></script>\n</body>');
fs.writeFileSync(file, html);
console.log('Phase 3 Mission Control activated.');
