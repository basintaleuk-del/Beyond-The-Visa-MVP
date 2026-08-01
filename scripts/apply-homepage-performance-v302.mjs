import { readFile, writeFile } from 'node:fs/promises';

const files = [new URL('../index.html', import.meta.url), new URL('../web/index.html', import.meta.url)];
const earlyMarker = '</small></div></section><div id="appShell"';
const earlyReplacement = '</small></div></section><script src="social-auth-v69.js?v=302"></script><div id="appShell"';

for (const file of files) {
  let html = await readFile(file, 'utf8');
  html = html.replace('#auth:not(.btvAuthReady){visibility:hidden!important}', '#auth:not(.btvAuthReady){display:none!important}');
  html = html.replace(
    /<style id="btvBootVisibility">(?:\.btv-boot body\{display:none!important\})?#auth:not\(\.btvAuthReady\)\{display:none!important\}<\/style>/,
    '<style id="btvBootVisibility">.btv-boot body{display:none!important}#auth:not(.btvAuthReady){display:none!important}</style>',
  );
  html = html.replace(
    "if(document.getElementById('forgotPassword'))return;",
    "if(document.getElementById('forgotPassword')||document.getElementById('forgotPasswordV69'))return;",
  );
  html = html.replace(/<link rel="stylesheet" href="auth-redesign-v69\.css\?v=[^"]+">/g, '');
  html = html.replace(/<script src="social-auth-v69\.js\?v=[^"]+"><\/script>/g, '');
  html = html.replace(/<link rel="stylesheet" href="([^"]+)"(?: media="print" onload="this\.media='all'")?>/g,
    '<link rel="stylesheet" href="$1" media="print" onload="this.media=\'all\'">');
  html = html.replace(
    /<link rel="stylesheet" href="((?:release-v71|v71-feature-merge-v82)\.css\?v=[^"]+)" media="print" onload="this\.media='all'">/g,
    '<link rel="stylesheet" href="$1">',
  );
  html = html.replace(
    /<button id="showSignup"(?: class="active")? type="button">Create account<\/button><button id="showLogin"(?: class="active")? type="button">Sign in<\/button><\/div><form id="signupForm"(?: hidden)?>/,
    '<button id="showSignup" type="button">Create account</button><button id="showLogin" class="active" type="button">Sign in</button></div><form id="signupForm" hidden>',
  );
  html = html.replace(/<form id="loginForm"(?: hidden)?>/, '<form id="loginForm">');

  if (!html.includes(earlyMarker)) throw new Error(`Auth insertion marker missing in ${file.pathname}`);
  html = html.replace('</head>', '<link rel="stylesheet" href="auth-redesign-v69.css?v=302"></head>');
  html = html.replace(earlyMarker, earlyReplacement);

  if ((html.match(/auth-redesign-v69\.css\?v=302/g) || []).length !== 1) {
    throw new Error(`Expected one auth stylesheet in ${file.pathname}`);
  }
  if ((html.match(/social-auth-v69\.js\?v=302/g) || []).length !== 1) {
    throw new Error(`Expected one early auth script in ${file.pathname}`);
  }
  if (/<link rel="stylesheet" href="(?!(?:auth-redesign-v69|release-v71|v71-feature-merge-v82)\.css)[^"]+">/.test(html)) {
    throw new Error(`Unexpected render-blocking feature stylesheet in ${file.pathname}`);
  }
  if (!html.includes('<button id="showLogin" class="active"') || !html.includes('<form id="signupForm" hidden>')) {
    throw new Error(`Expected stable sign-in-first auth markup in ${file.pathname}`);
  }
  html = html.replace(/\r\r\n/g, '\r\n').split('\n').map((line) => {
    const changedLine = line.includes('media="print" onload=')
      || line.includes('auth-redesign-v69.css?v=302')
      || line.includes('forgotPasswordV69');
    return changedLine ? line.replace(/\r$/, '') : line;
  }).join('\n');
  await writeFile(file, html, 'utf8');
}

console.log('Moved the signed-out auth upgrade ahead of authenticated feature assets and stabilised its first paint.');
