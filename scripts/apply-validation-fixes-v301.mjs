import { readFile, writeFile } from 'node:fs/promises';

const changes = [
  ['../index.html', ', maximum-scale=1', '', 1],
  ['../web/index.html', ', maximum-scale=1', '', 1],
  ['../web/index.html', '<section id="auth" class="auth">', '<section id="auth" class="auth" role="main">', 1],
  ['../web/social-auth-v69.js', ' id="googleAuthV69" aria-label="Continue with Google"', ' id="googleAuthV69"', 1],
  ['../web/social-auth-v69.js', ' id="facebookAuthV274" aria-label="Continue with Facebook"', ' id="facebookAuthV274"', 1],
  ['../web/auth-redesign-v69.css', '.languageSelect select { min-height: 40px;', '.languageSelect select { min-height: 44px;', 1],
  ['../web/auth-redesign-v69.css', '.auth input { padding: 14px;', '.auth input { min-height: 44px; padding: 14px;', 1],
  ['../web/auth-redesign-v69.css', '.authSubmit { padding: 14px;', '.authSubmit { min-height: 44px; padding: 14px;', 1],
  ['../web/auth-redesign-v69.css', 'background: #1877f2; color: #fff; font-weight: 800;', 'background: #1464cc; color: #fff; font-weight: 800;', 1],
  ['../web/auth-redesign-v69.css', '.createPrompt small { color: #707b7c;', '.createPrompt small { color: #667273;', 1],
  ['../web/golden-question.html', '.gqPublicFoot{text-align:center;color:#697775;', '.gqPublicFoot{text-align:center;color:#586664;', 1]
];

for (const [relativePath, before, after, expected] of changes) {
  const url = new URL(relativePath, import.meta.url);
  let content = await readFile(url, 'utf8');
  if (!content.includes(before)) {
    if (after && content.includes(after)) continue;
    if (!after && !content.includes(before)) continue;
    throw new Error(`Expected validation-fix marker was not found in ${relativePath}: ${before}`);
  }
  const count = content.split(before).length - 1;
  if (count !== expected) throw new Error(`Expected ${expected} marker(s) in ${relativePath}, found ${count}.`);
  content = content.replace(before, after);
  await writeFile(url, content, 'utf8');
}

console.log('Applied the guarded v301 accessibility validation fixes.');
