import { readFile, writeFile } from 'node:fs/promises';
const file = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(await readFile(file, 'utf8'));
pkg.scripts.test = 'node --test tests/*.test.mjs';
pkg.scripts.qa = 'node scripts/qa-release-audit.mjs && node scripts/validate-contracts.mjs';
pkg.scripts.verify = 'npm run test && npm run qa && npm run build:web && npx tsc --noEmit';
await writeFile(file, JSON.stringify(pkg, null, 2) + '\n');
console.log('Phase 9 QA commands activated.');
