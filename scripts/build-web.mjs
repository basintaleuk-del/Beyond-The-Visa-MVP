import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const require = createRequire(import.meta.url);
const source = join(root, 'web');
const output = join(root, 'www');
const excluded = new Set(['CNAME', '.nojekyll']);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, {
  recursive: true,
  filter(path) {
    const name = path.split(/[\\/]/).at(-1);
    return !excluded.has(name);
  },
});

await build({
  absWorkingDir: root,
  nodePaths: [join(root, 'node_modules')],
  stdin: {
    contents: await readFile(join(root, 'src', 'mobile-native.ts'), 'utf8'),
    resolveDir: root,
    sourcefile: 'src/mobile-native.ts',
    loader: 'ts',
  },
  outfile: join(output, 'mobile-native.js'),
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ['es2022'],
  format: 'esm',
  platform: 'browser',
  plugins: [{
    name: 'workspace-capacitor-resolver',
    setup(buildContext) {
      buildContext.onResolve({ filter: /^@capacitor\// }, (args) => ({ path: require.resolve(args.path) }));
    },
  }],
});
await cp(join(root, 'src', 'mobile-native.css'), join(output, 'mobile-native.css'));

const indexPath = join(output, 'index.html');
let html = await readFile(indexPath, 'utf8');
if (!html.includes('mobile-native.css')) {
  html = html.replace('</head>', '  <link rel="stylesheet" href="mobile-native.css?v=1">\n</head>');
}
if (!html.includes('mobile-native.js')) {
  html = html.replace('</body>', '  <script type="module" src="mobile-native.js?v=1"></script>\n</body>');
}
html = html.replace(
  /<meta name="viewport"[^>]*>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1">',
);
await writeFile(indexPath, html, 'utf8');

console.log(`Mobile web bundle created at ${output}`);
