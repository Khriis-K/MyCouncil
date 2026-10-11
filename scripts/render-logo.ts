import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

// Usage: npx tsx scripts/render-logo.ts
// Renders the Chamber logo (five seats on a semicircle over a ruled well, beside the wordmark) to transparent PNGs,
// one per theme, for the README. PNG rather than SVG: GitHub won't load the web fonts an SVG names.
// Also writes the favicon, imgs/favi.ico: the seats alone, filled solid on an ink tile so they hold up at 16px.
// Needs Google Chrome and a network connection for Google Fonts.

const THEMES = {
  light: { ink: '#1D2028', rule: '#C6C0B3', seat: '#F1EEE8', groups: ['#5A5D66', '#3E5C8A', '#4A7656', '#8A6B2C', '#8E4656'] },
  dark: { ink: '#EAE5DA', rule: '#363940', seat: '#1C1F25', groups: ['#A29E94', '#93ACD8', '#90BD9B', '#C9A764', '#D79BA9'] },
};

// Seats I to V (the Seeker, then one of each temperament), as on the chamber floor
const SEATS: [number, number][] = [[12.4, 46.5], [30.6, 21.5], [60, 12], [89.4, 21.5], [107.6, 46.5]];

const logo = ({ ink, rule, seat, groups }: (typeof THEMES)['light']) => `<!doctype html>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,500&display=swap">
<style>
  body { margin: 0; background: transparent; }
  #logo { display: inline-flex; align-items: center; gap: 16px; padding: 8px; }
  span { font: 600 50px/1 'Cormorant Garamond', serif; color: ${ink}; }
  em { font-weight: 500; }
</style>
<div id="logo">
  <svg width="120" height="72" viewBox="0 0 120 72">
    <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="${rule}" stroke-width="1.5"/>
    <line x1="34" y1="67" x2="86" y2="67" stroke="${ink}" stroke-width="1.6"/>
    ${SEATS.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="7" fill="${seat}" stroke="${groups[i]}" stroke-width="2.2"/>`).join('')}
  </svg>
  <span>My<em>Council</em></span>
</div>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: 3 });
for (const [name, theme] of Object.entries(THEMES)) {
  await page.setContent(logo(theme), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.resolve(import.meta.dirname, `../imgs/logo-${name}.png`);
  await page.locator('#logo').screenshot({ path: out, omitBackground: true });
  console.log(`Wrote ${path.relative(process.cwd(), out)}`);
}

// The favicon: the seats on an ink tile, in the dark theme's lighter group colours, so it fills the square and reads
// on light and dark browser tabs alike. A tighter arc than the README mark, so the seats stay apart at 16px.
const FAVICON_SIZES = [16, 32, 48];
const FAVICON_SEATS: [number, number][] = [[18.2, 75.4], [34.1, 53.4], [60, 45], [85.9, 53.4], [101.8, 75.4]];
const favicon = (size: number) => `<!doctype html>
<style>body { margin: 0; background: transparent; }</style>
<svg id="mark" width="${size}" height="${size}" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="22" fill="${THEMES.light.ink}"/>
  ${FAVICON_SEATS.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="11.5" fill="${THEMES.dark.groups[i]}"/>`).join('')}
</svg>`;

const icons: Buffer[] = [];
const iconPage = await browser.newPage({ deviceScaleFactor: 1 });
for (const size of FAVICON_SIZES) {
  await iconPage.setContent(favicon(size));
  icons.push(await iconPage.locator('#mark').screenshot({ omitBackground: true }));
}
const ico = path.resolve(import.meta.dirname, '../imgs/favi.ico');
fs.writeFileSync(ico, packIco(FAVICON_SIZES, icons));
console.log(`Wrote ${path.relative(process.cwd(), ico)}`);

await browser.close();

// An .ico holding each size as an embedded PNG: a 6-byte header, a 16-byte entry per image, then the images.
function packIco(sizes: number[], pngs: Buffer[]) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach((png, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(sizes[i] % 256, entry); // width (0 means 256)
    header.writeUInt8(sizes[i] % 256, entry + 1); // height
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...pngs]);
}
