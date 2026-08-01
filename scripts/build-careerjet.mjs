import { transform } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const sourcePath = join(process.cwd(), 'api', '_lib', 'careerjet-core.ts');
const outputPath = join(process.cwd(), 'api', '_lib', 'careerjet-core.cjs');
const source = await readFile(sourcePath, 'utf8');
const result = await transform(source, {
  loader: 'ts',
  format: 'cjs',
  target: 'node22',
  sourcefile: 'api/_lib/careerjet-core.ts',
});

await writeFile(outputPath, result.code, 'utf8');
