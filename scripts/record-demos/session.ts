import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';
import { CURSOR_SCRIPT } from './recorder';

const CACHE_FILE = path.join(import.meta.dirname, 'cache.json');
const APP_URL = process.env.APP_URL ?? 'http://localhost:3001/';

export const DILEMMA = "I've been offered a senior role at a startup in Austin. Better pay and more ownership, but I'd leave my partner's family and a stable team I love in Seattle. I'm 29 and worried I'll regret playing it safe.";

type CachedCall = { url: string; method: string; req: string | null; status: number; body: string };

/**
 * Opens the app with /api calls served from cache.json in order per path, so takes are free
 * and identical. A call with no cached entry goes to the live server and is appended.
 * `delays` (ms per path) stands in for real latency on replayed calls.
 */
export async function openApp({ delays = {} as Record<string, number> } = {}): Promise<{ browser: Browser; page: Page }> {
  const cache: CachedCall[] = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : [];
  const used = new Set<number>();
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await context.addInitScript(CURSOR_SCRIPT);
  const page = await context.newPage();

  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const i = cache.findIndex((c, k) => !used.has(k) && new URL(c.url).pathname === pathname);
    if (i >= 0) {
      used.add(i);
      await page.waitForTimeout(delays[pathname] ?? 1500);
      return route.fulfill({ status: cache[i].status, contentType: 'application/json', body: cache[i].body });
    }
    const response = await route.fetch({ timeout: 180_000 });
    const body = await response.text();
    cache.push({ url: route.request().url(), method: route.request().method(), req: route.request().postData(), status: response.status(), body });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
    console.log(`LIVE ${pathname} (now cached)`);
    return route.fulfill({ response, body });
  });

  await page.goto(APP_URL);
  await page.waitForTimeout(800);
  return { browser, page };
}

/** Summons the five-counselor council without recording it, and waits for it to take its seats. */
export async function summonQuietly(page: Page) {
  await page.fill('textarea', DILEMMA);
  await page.getByRole('button', { name: '5 seats' }).click();
  await page.getByRole('button', { name: /Summon the council/i }).click();
  await page.getByRole('button', { name: /^Seat V, / }).waitFor();
}
