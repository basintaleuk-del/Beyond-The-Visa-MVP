import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const siteUrl = 'https://beyondthevisa.org';

const excludedDirs = new Set(['.git', 'node_modules', 'web', 'www', 'figma-redesign-reference', 'android', 'ios', 'supabase', 'docs', 'download']);
const excludedFiles = new Set(['admin.html', 'BEYOND-THE-VISA-CORRECT-WEBSITE.html', 'googleb53f2c7d9dd2d4be.html']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirs.has(entry.name)) {
        files.push(...(await walk(full)));
      }
      continue;
    }
    if (!entry.name.endsWith('.html')) {
      continue;
    }
    if (excludedFiles.has(entry.name)) {
      continue;
    }
    const rel = relative(root, full).replace(/\\/g, '/');
    if (rel.includes('/admin')) {
      continue;
    }
    files.push(rel);
  }
  return files;
}

function urlPath(relPath) {
  if (relPath === 'index.html') {
    return '/';
  }
  if (relPath.endsWith('/index.html')) {
    return `/${relPath.slice(0, -'index.html'.length)}`;
  }
  return `/${relPath}`;
}

function toUrl(pathname) {
  return pathname === '/' ? siteUrl : `${siteUrl}${pathname}`;
}

function toSitemapXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => `  <url><loc>${entry.loc}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`).join('\n')}
</urlset>
`;
}

function toSitemapIndexXml(sitemaps) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((s) => `  <sitemap><loc>${toUrl(`/${s}`)}</loc></sitemap>`).join('\n')}
</sitemapindex>
`;
}

function toImageSitemapXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.map((entry) => `  <url><loc>${entry.loc}</loc>${entry.images.map((image) => `<image:image><image:loc>${image}</image:loc></image:image>`).join('')}</url>`).join('\n')}
</urlset>
`;
}

function toVideoSitemapXml(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${entries.map((entry) => `  <url><loc>${entry.loc}</loc><video:video><video:thumbnail_loc>${entry.thumbnail}</video:thumbnail_loc><video:title>${entry.title}</video:title><video:description>${entry.description}</video:description><video:content_loc>${entry.video}</video:content_loc></video:video></url>`).join('\n')}
</urlset>
`;
}

function toNewsSitemapXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
</urlset>
`;
}

function pickPriority(pathname) {
  if (pathname === '/') return '1.0';
  if (pathname.startsWith('/knowledge/')) return '0.9';
  if (pathname.startsWith('/blog/')) return '0.7';
  if (pathname.includes('privacy') || pathname.includes('terms') || pathname.includes('cookie')) return '0.3';
  return '0.8';
}

function pickChangefreq(pathname) {
  if (pathname === '/') return 'weekly';
  if (pathname.startsWith('/blog/')) return 'weekly';
  if (pathname.startsWith('/knowledge/')) return 'monthly';
  return 'monthly';
}

const htmlFiles = await walk(root);
const pages = [];
for (const relPath of htmlFiles) {
  const fullPath = join(root, relPath);
  const file = await readFile(fullPath, 'utf8');
  if (/noindex/i.test(file)) {
    continue;
  }
  const pathname = urlPath(relPath);
  const info = await stat(fullPath);
  pages.push({
    relPath,
    pathname,
    loc: toUrl(pathname),
    lastmod: info.mtime.toISOString().slice(0, 10),
    priority: pickPriority(pathname),
    changefreq: pickChangefreq(pathname),
  });
}

pages.sort((a, b) => a.pathname.localeCompare(b.pathname));
const blogPages = pages.filter((p) => p.pathname.startsWith('/blog/'));
const sitePages = pages.filter((p) => !p.pathname.startsWith('/blog/'));

await writeFile(join(root, 'sitemap-pages.xml'), toSitemapXml(sitePages), 'utf8');
await writeFile(join(root, 'sitemap-blog.xml'), toSitemapXml(blogPages), 'utf8');
const imageEntries = [];
const videoEntries = [];
for (const page of pages) {
  const html = await readFile(join(root, page.relPath), 'utf8');
  const images = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((src) => !src.startsWith('data:'))
    .filter((src) => !src.includes('${') && !src.includes('`') && !src.includes('<') && !src.includes('>'))
    .map((src) => src.startsWith('http') ? src : toUrl(src.startsWith('/') ? src : `/${src}`));
  const validImages = images.filter((url) => /\.(png|jpg|jpeg|webp|svg|gif|avif)(\?|$)/i.test(url));
  if (validImages.length) {
    imageEntries.push({ loc: page.loc, images: [...new Set(validImages)] });
  }
  const videos = [...html.matchAll(/(?:<video[^>]+src=["']([^"']+)["'])|(?:<source[^>]+src=["']([^"']+\.(?:mp4|webm))["'])/gi)]
    .map((m) => m[1] || m[2])
    .filter(Boolean)
    .map((src) => src.startsWith('http') ? src : toUrl(src.startsWith('/') ? src : `/${src}`));
  for (const video of videos) {
    videoEntries.push({
      loc: page.loc,
      video,
      title: `Beyond The Visa video: ${page.pathname}`,
      description: 'Video resource published by Beyond The Visa.',
      thumbnail: `${siteUrl}/site-logo.png`,
    });
  }
}
await writeFile(join(root, 'sitemap-images.xml'), toImageSitemapXml(imageEntries), 'utf8');
await writeFile(join(root, 'sitemap-videos.xml'), toVideoSitemapXml(videoEntries), 'utf8');
await writeFile(join(root, 'sitemap-news.xml'), toNewsSitemapXml(), 'utf8');

const indexXml = toSitemapIndexXml(['sitemap-pages.xml', 'sitemap-blog.xml', 'sitemap-images.xml', 'sitemap-videos.xml', 'sitemap-news.xml']);
await writeFile(join(root, 'sitemap-index.xml'), indexXml, 'utf8');
await writeFile(join(root, 'sitemap.xml'), indexXml, 'utf8');

const categorySlugs = new Set(['cbt', 'ielts', 'jobs', 'nclex', 'nursing-careers', 'osce', 'study-tips', 'visa']);
const postEntries = [];
for (const page of blogPages) {
  if (!page.pathname.endsWith('.html')) continue;
  const slug = page.pathname.replace('/blog/', '').replace('.html', '');
  if (slug === 'index' || categorySlugs.has(slug)) continue;
  const sourcePath = join(root, page.relPath);
  const html = await readFile(sourcePath, 'utf8');
  const titleMatch = html.match(/<h1>([^<]+)<\/h1>/i);
  if (titleMatch) {
    postEntries.push({
      title: titleMatch[1].replace(/\s+/g, ' ').trim(),
      url: page.loc,
      pubDate: new Date(`${page.lastmod}T00:00:00Z`).toUTCString(),
      description: (html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || '').trim(),
    });
  }
}

const rssItems = postEntries
  .slice(0, 20)
  .map((item) => `<item><title><![CDATA[${item.title}]]></title><link>${item.url}</link><guid>${item.url}</guid><pubDate>${item.pubDate}</pubDate><description><![CDATA[${item.description}]]></description></item>`)
  .join('');
const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Beyond The Visa Blog</title>
  <link>${toUrl('/blog/') }</link>
  <description>Nursing relocation and exam preparation guidance</description>
  ${rssItems}
</channel>
</rss>
`;
await writeFile(join(root, 'rss.xml'), rssXml, 'utf8');

await mkdir(join(root, 'web'), { recursive: true });
await writeFile(join(root, 'web', 'sitemap.xml'), await readFile(join(root, 'sitemap.xml'), 'utf8'), 'utf8');

console.log(`Generated sitemaps with ${pages.length} public pages and ${postEntries.length} RSS items.`);
