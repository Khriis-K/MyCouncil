import { DILEMMA, openApp, summonQuietly, useOledTheme } from './session';
import { Recorder, glideClick } from './recorder';

// Usage (app running via `npm start`): npm run demos:record [-- summon debate chat refine mbti]
// Writes scripts/record-demos/out/<clip>.mp4. Needs ffmpeg on PATH (or FFMPEG=<path>) and Google Chrome.

async function openWithCouncil(delays?: Record<string, number>) {
  const session = await openApp({ delays });
  await summonQuietly(session.page);
  await session.page.waitForTimeout(9000); // counselors finish flying in
  await session.page.locator('button:has-text("chevron_left")').click(); // collapse sidebar for a wider sphere
  await session.page.waitForTimeout(3000); // let the sphere re-layout before recording
  return session;
}

const clips: Record<string, () => Promise<void>> = {
  async summon() {
    const { browser, page } = await openApp({ delays: { '/api/summon': 4000 } });
    await useOledTheme(page);
    await page.waitForTimeout(800);
    const rec = new Recorder(page, 'summon');
    await rec.start();
    await page.waitForTimeout(600);
    await glideClick(page, page.locator('textarea'));
    await page.keyboard.press('Control+A');
    rec.speed(2);
    await page.keyboard.type(DILEMMA, { delay: 22 });
    rec.speed(1);
    await page.waitForTimeout(400);
    // Before a council exists, the theme buttons overlap the size slider; scroll it clear first.
    const five = page.getByRole('button', { name: '5', exact: true });
    await five.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    await page.waitForTimeout(700);
    await glideClick(page, five);
    await page.waitForTimeout(600);
    await glideClick(page, page.getByRole('button', { name: /Summon the Council/i }));
    rec.speed(2);
    await page.waitForTimeout(4000);
    rec.speed(1);
    await page.waitForTimeout(8000);
    await rec.stop({ holdEnd: 2 });
    await browser.close();
  },

  async debate() {
    const { browser, page } = await openWithCouncil({ '/api/debate/inject': 3500 });
    const rec = new Recorder(page, 'debate');
    await rec.start();
    await page.waitForTimeout(1000);
    await glideClick(page, page.locator('button.relative.inline-flex.h-6').first()); // Debate Mode toggle
    await page.waitForTimeout(3000);
    await glideClick(page, page.locator('li', { hasText: 'Explorer' }).first());
    await page.waitForTimeout(6500);
    await glideClick(page, page.getByPlaceholder(/Inject your comment/));
    await page.keyboard.type("My partner is actually open to moving. The real fear is that I'd fail publicly at the startup.", { delay: 28 });
    await page.waitForTimeout(400);
    await glideClick(page, page.getByRole('button', { name: /Send to Council/ }));
    rec.speed(1.6);
    await page.waitForTimeout(3600);
    rec.speed(1);
    await page.waitForTimeout(6000);
    await glideClick(page, page.getByRole('button', { name: /view matrix/i }));
    await page.waitForTimeout(4000);
    await rec.stop({ holdEnd: 2 });
    await browser.close();
  },

  async chat() {
    const { browser, page } = await openWithCouncil({ '/api/chat': 3000 });
    const rec = new Recorder(page, 'chat');
    await rec.start();
    await page.waitForTimeout(700);
    await glideClick(page, page.getByRole('button', { name: /Seeker/ }));
    await page.waitForTimeout(2200);
    await glideClick(page, page.getByRole('button', { name: /View Full Analysis/ }));
    await page.waitForTimeout(3000);
    await glideClick(page, page.getByRole('button', { name: 'PROTOCOL', exact: true }));
    await page.waitForTimeout(3200);
    await glideClick(page, page.getByRole('button', { name: /INITIATE DIALOGUE/i }));
    await page.waitForTimeout(1200);
    await glideClick(page, page.getByPlaceholder(/^Message /));
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
    await glideClick(page, page.getByPlaceholder('Add more context...'));
    await page.keyboard.type('Update: my partner just got a remote job offer, so moving is easier than I thought.', { delay: 26 });
    await page.waitForTimeout(400);
    await glideClick(page, page.getByRole('button', { name: /Refine Perspective/ }));
    rec.speed(1.8);
    await page.waitForTimeout(4000);
    rec.speed(1);
    await page.waitForTimeout(9000); // counselors fly back out; clicking earlier hits the center bubble
    await glideClick(page, page.getByRole('button', { name: /Guardian/ }));
    await page.waitForTimeout(3500);
    await rec.stop({ holdEnd: 2, maxSeconds: 20 });
    await browser.close();
  },

  async mbti() {
    const { browser, page } = await openApp();
    await useOledTheme(page);
    await page.waitForTimeout(800);
    const rec = new Recorder(page, 'mbti');
    await rec.start();
    await page.waitForTimeout(600);
    const cognitiveStyle = page.locator('select').nth(1);
    await glideClick(page, cognitiveStyle, { pause: 150 });
    await page.keyboard.press('Escape'); // the native dropdown doesn't render in captures; set it directly
    await cognitiveStyle.selectOption({ label: 'Select MBTI Type...' });
    await page.waitForTimeout(2200);
    await glideClick(page, page.getByRole('button', { name: /INFJ/ }));
    await page.waitForTimeout(3500);
    await page.mouse.move(1180, 300, { steps: 30 });
    await page.waitForTimeout(1500);
    for (let i = 0; i < 2; i++) {
      await glideClick(page, page.getByRole('button', { name: 'check', exact: true }).last()); // "strongly agree"
      await page.waitForTimeout(1600);
    }
    await glideClick(page, page.getByRole('button', { name: /CONFIRM & SELECT PROFILE/i }));
    await page.waitForTimeout(2500);
    await rec.stop({ holdEnd: 2 });
    await browser.close();
  },
};

const requested = process.argv.slice(2);
const names = requested.length ? requested : Object.keys(clips);
const unknown = names.filter(n => !clips[n]);
if (unknown.length) throw new Error(`Unknown clip(s): ${unknown.join(', ')}. Choose from: ${Object.keys(clips).join(', ')}`);
for (const name of names) await clips[name]();
