#!/usr/bin/env node
// Generate sitemap.xml after build
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = 'https://arpitgoswami.com';
const PAGES = [
  { url: '', changefreq: 'weekly', priority: 1.0 },
  { url: '#about', changefreq: 'monthly', priority: 0.8 },
  { url: '#projects', changefreq: 'weekly', priority: 0.9 },
  { url: '#contact', changefreq: 'monthly', priority: 0.7 },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${PAGES.map(page => `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\n')}
</urlset>`;

const outputPath = resolve('dist', 'sitemap.xml');
writeFileSync(outputPath, sitemap);
console.log(`✅ Sitemap generated at ${outputPath}`);