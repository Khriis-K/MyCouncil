import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { CDPSession, Locator, Page } from 'playwright-core';

const DIR = import.meta.dirname;
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

// Headless Chrome draws no cursor, so viewers couldn't see what was clicked.
export const CURSOR_SCRIPT = `
addEventListener('DOMContentLoaded', () => {
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px)';
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l14 11-6.5 1 3.8 7.4-2.6 1.3-3.8-7.5L4 20z" fill="#fff" stroke="#000" stroke-width="1.4"/></svg>';
  document.documentElement.appendChild(c);
  addEventListener('mousemove', e => { c.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)'; }, true);
  addEventListener('mousedown', e => {
    const r = document.createElement('div');
    r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;border:2px solid rgba(255,255,255,.85);width:10px;height:10px;left:' + (e.clientX - 5) + 'px;top:' + (e.clientY - 5) + 'px;transition:transform .45s ease-out,opacity .45s ease-out';
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'scale(4)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 500);
  }, true);
});`;

type Frame = { file: string; t: number };
type SpeedMark = { t: number; speed: number };

/**
 * Captures every repaint via Chrome's screencast, then encodes an MP4 with ffmpeg.
 * Frame durations come from repaint timestamps, so speed() marks can fast-forward waits.
 */
export class Recorder {
  private frames: Frame[] = [];
  private marks: SpeedMark[] = [];
  private cdp?: CDPSession;
  private readonly frameDir: string;

  constructor(private readonly page: Page, private readonly name: string) {
    this.frameDir = path.join(DIR, 'frames', name);
  }

  async start() {
    fs.rmSync(this.frameDir, { recursive: true, force: true });
    fs.mkdirSync(this.frameDir, { recursive: true });
    const cdp = await this.page.context().newCDPSession(this.page);
    cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      const file = path.join(this.frameDir, `f${String(this.frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      this.frames.push({ file, t: metadata.timestamp ?? Date.now() / 1000 });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    this.cdp = cdp;
    this.speed(1);
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
    await this.page.mouse.move(900, 450); // force a repaint so the clip opens on the current frame
  }

  /** Playback speed from now on (2 = twice as fast). */
  speed(speed: number) {
    this.marks.push({ t: Date.now() / 1000, speed });
  }

  async stop({ holdEnd = 1.8 }: { holdEnd?: number } = {}) {
    await this.page.waitForTimeout(300);
    await this.cdp!.send('Page.stopScreencast');
    this.encode(holdEnd);
  }

  private speedAt(t: number) {
    let speed = 1;
    for (const m of this.marks) if (m.t <= t) speed = m.speed;
    return speed;
  }

  private encode(holdEnd: number) {
    const posix = (f: string) => path.resolve(f).split(path.sep).join('/');
    const lines: string[] = [];
    let total = 0;
    this.frames.forEach((frame, i) => {
      const next = this.frames[i + 1];
      // Collapse long static stretches; the screencast only emits frames on repaint.
      const d = next ? Math.max(Math.min((next.t - frame.t) / this.speedAt(frame.t), 1.2), 0.001) : holdEnd;
      total += d;
      lines.push(`file '${posix(frame.file)}'`, `duration ${d.toFixed(4)}`);
    });
    lines.push(`file '${posix(this.frames.at(-1)!.file)}'`);
    const list = path.join(this.frameDir, 'list.txt');
    fs.writeFileSync(list, lines.join('\n'));

    const outDir = path.join(DIR, 'out');
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, `${this.name}.mp4`);
    execFileSync(FFMPEG, [
      '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', 'fps=30,scale=1200:-2:flags=lanczos,format=yuv420p',
      '-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-movflags', '+faststart', '-an', out,
    ]);
    console.log(`${this.name}: ${this.frames.length} frames, ${total.toFixed(1)}s, ${Math.round(fs.statSync(out).size / 1024)} KB`);
  }
}

/** Glide the visible cursor to an element, then click it. Scrolls it into view smoothly first if it's off screen. */
export async function glideClick(page: Page, locator: Locator) {
  const viewport = page.viewportSize()!;
  const before = await locator.boundingBox();
  if (before && (before.y < 0 || before.y + before.height > viewport.height)) {
    await locator.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    await page.waitForTimeout(700);
  }
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Not visible: ${locator}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 28 });
  await page.waitForTimeout(250);
  await page.mouse.click(x, y);
}

/** Converts out/<name>.mp4 to a looping GIF at `out`, with a palette built from the clip so it stays crisp. */
export function toGif(name: string, out: string) {
  const mp4 = path.join(DIR, 'out', `${name}.mp4`);
  execFileSync(FFMPEG, [
    '-y', '-loglevel', 'error', '-i', mp4,
    '-vf', 'fps=12,scale=900:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    '-loop', '0', out,
  ]);
  console.log(`${path.relative(process.cwd(), out)}: ${Math.round(fs.statSync(out).size / 1024)} KB`);
}
