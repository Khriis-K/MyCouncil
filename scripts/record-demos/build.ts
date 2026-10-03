import fs from 'node:fs';
import path from 'node:path';

// Usage: npm run demos:build
// Embeds out/<clip>.mp4 into template.html and writes site/index.html: one self-contained file
// that serves GitHub Pages and can be attached to applications as-is.
const DIR = import.meta.dirname;
const CLIPS = ['summon', 'debate', 'chat', 'refine', 'mbti'];

let page = fs.readFileSync(path.join(DIR, 'template.html'), 'utf8');
for (const clip of CLIPS) {
  const video = fs.readFileSync(path.join(DIR, 'out', `${clip}.mp4`));
  page = page.replace(`__${clip.toUpperCase()}__`, `data:video/mp4;base64,${video.toString('base64')}`);
}
const leftover = page.match(/__[A-Z]+__/);
if (leftover) throw new Error(`Unfilled placeholder ${leftover[0]} in template.html`);

// The template is an artifact body (no document shell); Pages needs a full document.
const [head, body] = page.split('<div class="wrap">', 2);
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}</head>
<body>
<div class="wrap">${body}
</body>
</html>
`;
const out = path.resolve(DIR, '../../site/index.html');
fs.writeFileSync(out, html);
console.log(`Wrote ${path.relative(process.cwd(), out)} (${(html.length / 1048576).toFixed(1)} MB)`);
