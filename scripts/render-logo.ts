import path from 'node:path';
import { chromium } from 'playwright-core';

// Usage: npx tsx scripts/render-logo.ts
// Renders the Chamber logo (five seats on a semicircle over a ruled well, beside the wordmark) to transparent PNGs,
// one per theme, for the README. PNG rather than SVG: GitHub won't load the web fonts an SVG names.
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
await browser.close();
