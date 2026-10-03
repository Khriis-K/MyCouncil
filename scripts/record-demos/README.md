# Demo recordings

Scripts that record the feature clips on the portfolio page (`site/index.html`, served on GitHub Pages) and rebuild that page.

## Rebuild the page

```bash
npm start                # in another terminal: the app on :3001
npm run demos:record     # all clips, or e.g. npm run demos:record -- debate chat
npm run demos:build      # embeds the clips into site/index.html
```

Needs Google Chrome and ffmpeg on PATH (or `FFMPEG=<path to ffmpeg.exe>`).

## How it works

- `cache.json` holds the real API responses the clips show. Calls are replayed in order per path, so takes are free and identical. A call with no cached entry goes live and gets appended. Delete an entry, or the whole file, to re-record with fresh responses.
- `recorder.ts` captures every repaint with Chrome's screencast and encodes an MP4 with ffmpeg. `rec.speed(n)` fast-forwards loading waits. A fake cursor is injected because headless Chrome draws none.
- `template.html` is the page source. The clips go into its `__CLIP__` placeholders. `frames/` and `out/` are generated and gitignored.
