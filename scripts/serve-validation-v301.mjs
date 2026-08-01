import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || fileURLToPath(new URL('../www', import.meta.url)));
const port = Number(process.argv[3] || 4176);
const types = { '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.xml': 'application/xml' };

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    let target = normalize(join(root, pathname === '/' ? 'index.html' : pathname));
    if (target !== root && !target.startsWith(root + sep)) throw new Error('Invalid path');
    try {
      if (!(await stat(target)).isFile()) throw new Error('Not a file');
    } catch {
      target = join(root, 'index.html');
    }
    response.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(400).end('Bad request');
  }
}).listen(port, '127.0.0.1', 511, () => console.log(`Validation server listening on http://127.0.0.1:${port}`));
