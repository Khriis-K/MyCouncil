import path from 'node:path';
import { DILEMMA, openApp, summonQuietly } from './session';
import { Recorder, glideClick, toGif } from './recorder';

// Usage (app running via `npm start`): npm run demos:record [-- summon debate chat refine mbti readme]
// Writes scripts/record-demos/out/<clip>.mp4, and imgs/demo.gif for the README from the readme clip.
// Needs ffmpeg on PATH (or FFMPEG=<path>) and Google Chrome.

async function openWithCouncil(delays?: Record<string, number>) {
  const session = await openApp({ delays });
  await summonQuietly(session.page);
  await session.page.waitForTimeout(1500); // the last seats finish taking their places
  return session;
}

const seat = (page: Awaited<ReturnType<typeof openApp>>['page'], name: string) =>
  page.getByRole('button', { name: new RegExp(`^Seat [IVX]+, The ${name}$`) }).locator('circle');

const clips: Record<string, () => Promise<void>> = {
  async summon() {
    const { browser, page } = await openApp({ delays: { '/api/summon': 4000 } });
    const rec = new Recorder(page, 'summon');
    await rec.start();
    await page.waitForTimeout(600);
    await glideClick(page, page.locator('textarea'));
    rec.speed(2);
    await page.keyboard.type(DILEMMA, { delay: 22 });
    rec.speed(1);
    await page.waitForTimeout(400);
    await glideClick(page, page.getByRole('button', { name: '5 seats' }));
    await page.waitForTimeout(1200); // "Who will sit" fills in the fifth seat
    await glideClick(page, page.getByRole('button', { name: /Summon the council/i }));
    rec.speed(2);
    await page.waitForTimeout(4000);
    rec.speed(1);
    await page.waitForTimeout(4000);
    await rec.stop({ holdEnd: 2 });
    await browser.close();
  },

  async debate() {
    const { browser, page } = await openWithCouncil({ '/api/debate/inject': 3500 });
    const rec = new Recorder(page, 'debate');
    await rec.start();
    await page.waitForTimeout(800);
    await glideClick(page, page.getByRole('button', { name: 'Show disagreements' }));
    await page.waitForTimeout(2500);
    // The arc's label: the middle of a curve's bounding box can miss the curve itself
    await glideClick(page, page.getByRole('button', { name: /^Explorer and Guardian:/ }).locator('text'));
    await page.waitForTimeout(6500); // the transcript plays in turn by turn
    await glideClick(page, page.getByRole('textbox', { name: 'Interject' }));
    await page.keyboard.type("My partner is actually open to moving. The real fear is that I'd fail publicly at the startup.", { delay: 28 });
    await page.waitForTimeout(400);
    await glideClick(page, page.getByRole('button', { name: 'Send' }));
    rec.speed(1.6);
    await page.waitForTimeout(3600);
    rec.speed(1);
    await page.waitForTimeout(6000);
    await rec.stop({ holdEnd: 2 });
    await browser.close();
  },

  async chat() {
    const { browser, page } = await openWithCouncil({ '/api/chat': 3000 });
    const rec = new Recorder(page, 'chat');
    await rec.start();
    await page.waitForTimeout(700);
    await glideClick(page, seat(page, 'Seeker'));
    await page.waitForTimeout(2600);
    await glideClick(page, page.getByRole('button', { name: 'Read full opinion' }));
    await page.waitForTimeout(3500);
    await glideClick(page, page.getByRole('textbox', { name: /^Write to / }));
    await page.keyboard.type('What would a small first step look like this week?', { delay: 30 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    rec.speed(1.5);
    await page.waitForTimeout(3000);
    rec.speed(1);
    await page.waitForTimeout(5500);
    await rec.stop({ holdEnd: 2 });
    await browser.close();
  },

  async refine() {
    const { browser, page } = await openWithCouncil({ '/api/summon': 4000 });
    const rec = new Recorder(page, 'refine');
    await rec.start();
    await page.waitForTimeout(700);
    await glideClick(page, page.getByRole('textbox', { name: 'Add to the record' }));
    await page.keyboard.type('Update: my partner just got a remote job offer, so moving is easier than I thought.', { delay: 26 });
    await page.waitForTimeout(400);
    await glideClick(page, page.getByRole('button', { name: 'Refine', exact: true }));
    rec.speed(1.8);
    await page.waitForTimeout(4000);
    rec.speed(1);
    await page.waitForTimeout(3000);
    await glideClick(page, page.getByRole('button', { name: 'The record' }));
    await page.waitForTimeout(4000);
    await rec.stop({ holdEnd: 2 });
    await browser.close();
  },

  async mbti() {
    const { browser, page } = await openApp();
    const rec = new Recorder(page, 'mbti');
    await rec.start();
    await page.waitForTimeout(600);
    await glideClick(page, page.getByRole('button', { name: 'Choose your type' }));
    await page.waitForTimeout(2000);
    await glideClick(page, page.getByRole('radio', { name: /INFJ/ }));
    await page.waitForTimeout(3000);
    const statements = await page.locator('[role=radiogroup]:not([aria-label="MBTI type"])').all();
    for (const statement of statements.slice(0, 3)) {
      await glideClick(page, statement.getByRole('radio', { name: 'Strongly agree' }));
      await page.waitForTimeout(900);
    }
    await glideClick(page, page.getByRole('button', { name: 'Confirm INFJ' }));
    await page.waitForTimeout(3000); // back on the matter, the roll now seats INFJ's council
    await rec.stop({ holdEnd: 2 });
    await browser.close();
  },

  // The README GIF: summon, then open a counselor's opinion.
  async readme() {
    const { browser, page } = await openApp({ delays: { '/api/summon': 3000 } });
    const rec = new Recorder(page, 'readme');
    await rec.start();
    await page.waitForTimeout(500);
    await glideClick(page, page.locator('textarea'));
    rec.speed(3);
    await page.keyboard.type(DILEMMA, { delay: 22 });
    rec.speed(1);
    await glideClick(page, page.getByRole('button', { name: '5 seats' }));
    await page.waitForTimeout(600);
    await glideClick(page, page.getByRole('button', { name: /Summon the council/i }));
    rec.speed(2);
    await page.waitForTimeout(3000);
    rec.speed(1);
    await page.waitForTimeout(2500);
    await glideClick(page, seat(page, 'Guardian'));
    await page.waitForTimeout(2200);
    await glideClick(page, page.getByRole('button', { name: 'Read full opinion' }));
    await page.waitForTimeout(3500);
    await rec.stop({ holdEnd: 2 });
    await browser.close();
    toGif('readme', path.resolve(import.meta.dirname, '../../imgs/demo.gif'));
  },
};

const requested = process.argv.slice(2);
const names = requested.length ? requested : Object.keys(clips);
const unknown = names.filter(n => !clips[n]);
if (unknown.length) throw new Error(`Unknown clip(s): ${unknown.join(', ')}. Choose from: ${Object.keys(clips).join(', ')}`);
for (const name of names) await clips[name]();
